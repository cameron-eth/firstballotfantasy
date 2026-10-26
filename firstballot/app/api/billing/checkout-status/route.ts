import { webAccount } from '@/lib/platform/auth'
import { billingFor } from '@/lib/platform/teams'
import { checkoutStatus } from '@/lib/platform/checkout-status'
import { failure, json, PlatformError } from '@/lib/platform/http'
import { getStripe } from '@/lib/stripe'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request)
    const id = new URL(request.url).searchParams.get('session_id') ?? ''
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id))
      throw new PlatformError(400, 'INVALID_SESSION', 'Invalid checkout reference.')
    const billing = await billingFor(p.accountId)
    if (!billing?.stripe_customer_id)
      throw new PlatformError(404, 'NOT_FOUND', 'Checkout not found.')
    const session = await getStripe().checkout.sessions.retrieve(id)
    return json(checkoutStatus(p.accountId, session, billing))
  } catch (e) {
    return failure(e)
  }
}
