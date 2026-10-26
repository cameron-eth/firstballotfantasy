import 'server-only'
import { getStripe, billingPrice, siteUrl } from './stripe'
import { supabaseAdmin } from './supabase-server'
import { billingFor } from './platform/teams'
import { PlatformError } from './platform/http'
import type { Principal } from './platform/auth'
export class SubscriptionService {
  static getSubscription(accountId: string) {
    return billingFor(accountId)
  }
  static async createCheckoutSession(p: Principal, interval: 'month' | 'year', quantity: number) {
    const stripe = getStripe(),
      priceId = billingPrice(interval)
    const account = await billingFor(p.accountId)
    if (
      account?.stripe_subscription_id &&
      !['canceled', 'incomplete_expired', 'free'].includes(account.status)
    )
      throw new PlatformError(
        409,
        'EXISTING_SUBSCRIPTION',
        'Manage your existing subscription to change team slots.'
      )
    const price = await stripe.prices.retrieve(priceId)
    if (
      !price.active ||
      price.type !== 'recurring' ||
      price.recurring?.interval !== interval ||
      price.recurring?.usage_type !== 'licensed'
    )
      throw new PlatformError(503, 'INVALID_PRICE', 'Billing price configuration needs attention.')
    let customerId = account?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: p.email, metadata: { account_id: p.accountId } },
        { idempotencyKey: `account:${p.accountId}` }
      )
      customerId = customer.id
      const { error } = await supabaseAdmin
        .from('account_billing')
        .upsert({ account_id: p.accountId, stripe_customer_id: customerId })
      if (error) throw error
    }
    const { error: attemptError } = await supabaseAdmin
      .from('billing_checkout_attempts')
      .upsert(
        { account_id: p.accountId, price_id: priceId, quantity },
        { onConflict: 'account_id', ignoreDuplicates: true }
      )
    if (attemptError) throw attemptError
    const { data: attempt, error: readError } = await supabaseAdmin
      .from('billing_checkout_attempts')
      .select('*')
      .eq('account_id', p.accountId)
      .single()
    if (readError) throw readError
    if (attempt.session_id) {
      const existing = await stripe.checkout.sessions.retrieve(attempt.session_id)
      if (existing.status === 'open') return existing
      if (
        existing.status === 'complete' &&
        !(
          account?.stripe_subscription_id === existing.subscription &&
          ['canceled', 'incomplete_expired'].includes(account.status)
        )
      )
        throw new PlatformError(
          409,
          'PAYMENT_PROCESSING',
          'Payment received. Your subscription is being activated.'
        )
      await supabaseAdmin
        .from('billing_checkout_attempts')
        .delete()
        .eq('account_id', p.accountId)
        .eq('id', attempt.id)
      throw new PlatformError(
        409,
        'CHECKOUT_EXPIRED',
        'The previous checkout expired. Please retry with your chosen slots.'
      )
    }
    // Stripe keeps idempotency results for at least 24h. Never replay an unresolved
    // older attempt after that window: it requires reconciliation, not another charge.
    if (Date.now() - Date.parse(attempt.created_at) > 23 * 3600_000)
      throw new PlatformError(
        503,
        'CHECKOUT_RECONCILIATION',
        'Your previous checkout needs review. Contact support before retrying.'
      )
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: attempt.price_id, quantity: attempt.quantity }],
        client_reference_id: p.accountId,
        metadata: { account_id: p.accountId },
        subscription_data: { metadata: { account_id: p.accountId } },
        success_url: `${siteUrl()}/billing?success=true`,
        cancel_url: `${siteUrl()}/billing`,
        allow_promotion_codes: true,
      },
      {
        idempotencyKey: `checkout:${attempt.id}`,
      }
    )
    const { error: saveError } = await supabaseAdmin
      .from('billing_checkout_attempts')
      .update({ session_id: session.id })
      .eq('account_id', p.accountId)
      .eq('id', attempt.id)
    if (saveError) throw saveError
    return session
  }
  static async createPortalSession(accountId: string) {
    const account = await billingFor(accountId)
    if (!account?.stripe_customer_id)
      throw new PlatformError(409, 'NO_CUSTOMER', 'No billing account yet.')
    return getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
    })
  }
}
