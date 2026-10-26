import { SubscriptionService } from '@/lib/subscription-service'
import { webAccount } from '@/lib/platform/auth'
import { body, failure, json, PlatformError } from '@/lib/platform/http'
export async function POST(request: Request) {
  try {
    const p = await webAccount(request),
      input = await body(request)
    if (
      !['month', 'year'].includes(input.interval) ||
      (input.quantity !== undefined && input.quantity !== 1)
    )
      throw new PlatformError(400, 'INVALID_PLAN', 'Choose monthly or annual Unlimited membership.')
    const session = await SubscriptionService.createCheckoutSession(p, input.interval, 1)
    return json({ url: session.url })
  } catch (e) {
    return failure(e)
  }
}
