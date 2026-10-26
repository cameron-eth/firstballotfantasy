import type Stripe from 'stripe'
/** Monthly-only, one offer per account, and never stack an existing discount. */
export function retentionEligible(
  sub: Stripe.Subscription,
  monthlyPriceId: string | undefined,
  previouslyRedeemed: boolean
) {
  const item = sub.items.data[0]
  return (
    !previouslyRedeemed &&
    !sub.discounts.length &&
    !sub.cancel_at_period_end &&
    sub.status === 'active' &&
    sub.items.data.length === 1 &&
    item.quantity === 1 &&
    item.price.id === monthlyPriceId &&
    item.price.unit_amount === 1200 &&
    item.price.currency === 'usd' &&
    item.price.recurring?.interval === 'month'
  )
}
