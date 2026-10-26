import { playerData } from '@/lib/platform/player-data'
import { failure, json } from '@/lib/platform/http'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const ids = [
      ...new Set(
        (new URL(request.url).searchParams.get('player_ids') ?? '').split(',').filter(Boolean)
      ),
    ]
    const result = await playerData(ids,1000)
    return json({
      ...result,
      count: result.data.length,
      source: 'ESPN',
      updatedAt: result.freshness.fetchedAt,
    })
  } catch (e) {
    return failure(e)
  }
}
