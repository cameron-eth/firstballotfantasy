import type Stripe from 'stripe'
import { teamCapacity } from './policy'
import { PlatformError } from './http'
type Billing = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  paid_slots: number
  period_end: string | null
}
export function checkoutStatus(
  accountId: string,
  session: Pick<
    Stripe.Checkout.Session,
    'customer' | 'client_reference_id' | 'status' | 'subscription' | 'url'
  >,
  billing: Billing
) {
  if (session.customer !== billing.stripe_customer_id || session.client_reference_id !== accountId)
    throw new PlatformError(404, 'NOT_FOUND', 'Checkout not found.')
  const capacity = teamCapacity(billing)
  const matched =
    session.status === 'complete' && session.subscription === billing.stripe_subscription_id
  return {
    state: matched
      ? capacity !== 1
        ? 'active'
        : 'inactive'
      : session.status === 'expired'
        ? 'expired'
        : session.status === 'open'
          ? 'open'
          : 'processing',
    capacity,
    checkoutUrl: session.status === 'open' ? session.url : null,
  }
}
