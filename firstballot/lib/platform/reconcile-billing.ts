import type Stripe from 'stripe'
import { PlatformError } from './http'
export type BillingStore = {
  findCustomer(
    id: string
  ): Promise<{ account_id: string; stripe_subscription_id: string | null } | null>
  feedback?(values: Record<string, unknown>): Promise<void>
  apply(values: Record<string, unknown>): Promise<void>
}
export async function reconcileBilling(
  event: Stripe.Event,
  stripe: Stripe,
  store: BillingStore,
  allowed: string[]
) {
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
    return
  const object = event.data.object as unknown as {
    id: string
    customer: string | null
    subscription?: string | null
    parent?: { subscription_details?: { subscription?: string } }
  }
  let subscriptionId = event.type.startsWith('customer.subscription.')
    ? object.id
    : (object.subscription ?? object.parent?.subscription_details?.subscription)
  if (!subscriptionId) return
  // Fetch current state rather than applying an old webhook's payload after a newer one.
  const observedAt = new Date().toISOString()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['discounts'],
  })
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const account = await store.findCustomer(customerId)
  if (!account)
    throw new PlatformError(
      503,
      'CUSTOMER_UNMAPPED',
      'Customer mapping not available; retry webhook.'
    )
  if (account.stripe_subscription_id && account.stripe_subscription_id !== subscription.id) {
    const current = await stripe.subscriptions.retrieve(account.stripe_subscription_id)
    if (!['canceled', 'incomplete_expired'].includes(current.status))
      throw new PlatformError(409, 'DUPLICATE_SUBSCRIPTION', 'Account already has a subscription.')
  }
  const items = subscription.items.data.filter((i) => allowed.includes(i.price.id))
  if (items.length !== 1)
    throw new PlatformError(503, 'UNKNOWN_PRODUCT', 'Subscription product is not configured.')
  const item = items[0],
    quantity = item.quantity ?? 0,
    slots = item.price.metadata?.plan === 'unlimited' ? -1 : quantity
  if (quantity < 1 || quantity > 100 || (slots === -1 && quantity !== 1))
    throw new PlatformError(503, 'INVALID_QUANTITY', 'Invalid team-slot quantity.')
  const details = subscription.cancellation_details
  const retained =
    subscription.discounts?.some(
      (d) => typeof d !== 'string' && d.coupon?.id === process.env.STRIPE_RETENTION_COUPON_ID
    ) ?? false
  if (store.feedback && (details?.feedback || details?.comment || details?.reason || retained)) {
    await store.feedback({
      event_id: event.id,
      account_id: account.account_id,
      subscription_id: subscription.id,
      feedback: details?.feedback ?? null,
      comment: details?.comment ?? null,
      reason: details?.reason ?? null,
      retention_redeemed: retained,
    })
  }
  await store.apply({
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
}
