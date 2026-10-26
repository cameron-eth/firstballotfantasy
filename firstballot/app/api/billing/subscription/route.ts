import { webAccount } from '@/lib/platform/auth'
import { billingFor } from '@/lib/platform/teams'
import { teamCapacity } from '@/lib/platform/policy'
import { failure, json } from '@/lib/platform/http'
import { getStripe } from '@/lib/stripe'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request),
      billing = await billingFor(p.accountId)
    const prices = await Promise.all(
      (['month', 'year'] as const).map(async (interval) => {
        const id =
          interval === 'month'
            ? process.env.STRIPE_TEAM_MONTHLY_PRICE_ID
            : process.env.STRIPE_TEAM_YEARLY_PRICE_ID
        if (!id) return null
        const price = await getStripe().prices.retrieve(id)
        if (!price.active || price.recurring?.interval !== interval || price.unit_amount === null)
          return null
        return { interval, currency: price.currency, unitAmount: price.unit_amount }
      })
    )
    return json({
      subscription: billing,
      capacity: teamCapacity(billing),
      prices: prices.filter(Boolean),
      dailyApiLimit: teamCapacity(billing) > 1 ? 1000 : 100,
    })
  } catch (e) {
    return failure(e)
  }
}
