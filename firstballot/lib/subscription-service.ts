import 'server-only'
import { retentionEligible } from './platform/retention'
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
    if (quantity !== 1)
      throw new PlatformError(
        400,
        'INVALID_PLAN',
        'Unlimited membership has one subscription per account.'
      )
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
        'Manage your existing subscription to manage your membership.'
      )
    const price = await stripe.prices.retrieve(priceId)
    if (
      !price.active ||
      price.type !== 'recurring' ||
      price.recurring?.interval !== interval ||
      price.recurring?.usage_type !== 'licensed' ||
      price.currency !== 'usd' ||
      price.unit_amount !== (interval === 'month' ? 1200 : 7000) ||
      price.metadata.plan !== 'unlimited'
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
      if (existing.status === 'open') {
        if (attempt.price_id === priceId && attempt.quantity === 1) return existing
        await stripe.checkout.sessions.expire(existing.id)
      }
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
        'The previous checkout expired. Please retry with your chosen membership.'
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
        success_url: `${siteUrl()}/billing?session_id={CHECKOUT_SESSION_ID}`,
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
  static async createPortalSession(accountId: string, cancel = false) {
    const account = await billingFor(accountId)
    if (!account?.stripe_customer_id)
      throw new PlatformError(409, 'NO_CUSTOMER', 'No billing account yet.')
    const stripe = getStripe()
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID
    if (!configuration)
      throw new PlatformError(
        503,
        'PORTAL_NOT_CONFIGURED',
        'Billing management is being prepared. Please retry shortly.'
      )
    let flow_data: import('stripe').default.BillingPortal.SessionCreateParams.FlowData | undefined
    if (cancel) {
      if (!account.stripe_subscription_id)
        throw new PlatformError(409, 'NO_SUBSCRIPTION', 'No subscription to cancel.')
      const sub = await stripe.subscriptions.retrieve(account.stripe_subscription_id)
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      if (customer !== account.stripe_customer_id)
        throw new PlatformError(
          403,
          'CUSTOMER_MISMATCH',
          'Subscription does not belong to this account.'
        )
      const { data: used, error } = await supabaseAdmin
        .from('billing_feedback')
        .select('event_id')
        .eq('account_id', accountId)
        .eq('retention_redeemed', true)
        .limit(1)
      if (error) throw error
      const couponId = process.env.STRIPE_RETENTION_COUPON_ID
      const eligible =
        couponId && retentionEligible(sub, process.env.STRIPE_TEAM_MONTHLY_PRICE_ID, !!used?.length)
      let retention:
        | import('stripe').default.BillingPortal.SessionCreateParams.FlowData.SubscriptionCancel.Retention
        | undefined
      if (eligible) {
        const coupon = await stripe.coupons.retrieve(couponId)
        if (
          coupon.valid &&
          coupon.amount_off === 601 &&
          coupon.currency === 'usd' &&
          coupon.duration === 'repeating' &&
          coupon.duration_in_months === 3
        ) {
          retention = { type: 'coupon_offer', coupon_offer: { coupon: coupon.id } }
        }
      }
      flow_data = {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: sub.id, ...(retention ? { retention } : {}) },
        after_completion: { type: 'redirect', redirect: { return_url: `${siteUrl()}/billing` } },
      }
    }
    return stripe.billingPortal.sessions.create({
      configuration,
      customer: account.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
      ...(flow_data ? { flow_data } : {}),
    })
  }
}
