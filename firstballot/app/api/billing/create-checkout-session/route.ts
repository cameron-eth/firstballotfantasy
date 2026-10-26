import { SubscriptionService } from '@/lib/subscription-service'
import { webAccount } from '@/lib/platform/auth'
import { body, failure, json, PlatformError } from '@/lib/platform/http'
export async function POST(request: Request) {
  try {
    const p = await webAccount(request),
      input = await body(request)
    if (
      !['month', 'year'].includes(input.interval) ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > 100
    )
      throw new PlatformError(
        400,
        'INVALID_PLAN',
        'Choose a billing interval and 1–100 additional team slots.'
      )
    const session = await SubscriptionService.createCheckoutSession(
      p,
      input.interval,
      input.quantity
    )
    return json({ url: session.url })
  } catch (e) {
    return failure(e)
  }
}
