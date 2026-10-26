import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-server'
import { failure, json, PlatformError } from '@/lib/platform/http'
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature'),
    secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return json({ error: 'Webhook verification unavailable' }, 400)
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return json({ error: 'Invalid signature' }, 400)
  }
  try {
    const { data: processed, error: readError } = await supabaseAdmin
      .from('billing_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle()
    if (readError) throw readError
    if (processed) return json({ received: true })
    if (
      ![
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.completed',
        'invoice.paid',
        'invoice.payment_failed',
      ].includes(event.type)
    )
      return json({ received: true })
    const object = event.data.object as unknown as {
      id: string
      customer: string | null
      subscription?: string | null
      parent?: { subscription_details?: { subscription?: string } }
    }
    let subscriptionId = event.type.startsWith('customer.subscription.')
      ? object.id
      : (object.subscription ?? object.parent?.subscription_details?.subscription)
    if (!subscriptionId) return json({ received: true })
    // Fetch current state rather than applying an old webhook's payload after a newer one.
    const observedAt = new Date().toISOString()
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const { data: account, error } = await supabaseAdmin
      .from('account_billing')
      .select('account_id,stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (error) throw error
    if (!account)
      throw new PlatformError(
        503,
        'CUSTOMER_UNMAPPED',
        'Customer mapping not available; retry webhook.'
      )
    if (account.stripe_subscription_id && account.stripe_subscription_id !== subscription.id) {
      const current = await getStripe().subscriptions.retrieve(account.stripe_subscription_id)
      if (!['canceled', 'incomplete_expired'].includes(current.status))
        throw new PlatformError(
          409,
          'DUPLICATE_SUBSCRIPTION',
          'Account already has a subscription.'
        )
    }
    const allowed = [
      process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
      process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    ].filter(Boolean)
    const items = subscription.items.data.filter((i) => allowed.includes(i.price.id))
    if (items.length !== 1)
      throw new PlatformError(503, 'UNKNOWN_PRODUCT', 'Subscription product is not configured.')
    const item = items[0],
      slots = item.quantity ?? 0
    if (slots < 1 || slots > 100)
      throw new PlatformError(503, 'INVALID_QUANTITY', 'Invalid team-slot quantity.')
    const { error: writeError } = await supabaseAdmin.rpc('apply_platform_billing', {
      p_event: event.id,
      p_account: account.account_id,
      p_customer: customerId,
      p_subscription: subscription.id,
      p_status: subscription.status,
      p_slots: slots,
      p_end: new Date(item.current_period_end * 1000).toISOString(),
      p_cancel: subscription.cancel_at_period_end,
      p_observed: observedAt,
    })
    if (writeError) throw writeError
    return json({ received: true })
  } catch (e) {
    return failure(e)
  }
}
