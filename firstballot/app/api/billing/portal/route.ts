import { SubscriptionService } from '@/lib/subscription-service'
import { webAccount } from '@/lib/platform/auth'
import { failure, json } from '@/lib/platform/http'
export async function POST(request: Request) {
  try {
    const p = await webAccount(request)
    const session = await SubscriptionService.createPortalSession(p.accountId)
    return json({ url: session.url })
  } catch (e) {
    return failure(e)
  }
}
