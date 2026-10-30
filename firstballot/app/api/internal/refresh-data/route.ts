import { playerData } from '@/lib/platform/player-data'
import { json, failure, PlatformError } from '@/lib/platform/http'
import { refreshAuthorized } from '@/lib/platform/auth'
export async function POST(request: Request) {
  try {
    if (!refreshAuthorized(request)) throw new PlatformError(401, 'UNAUTHORIZED', 'Unauthorized.')
    // Also warms every past season behind career FPPG (cached 30 days, refetched on expiry).
    const stats = await playerData(['8144'])
    return json({
      refreshed: 'espn:ppr',
      season: stats.season,
      freshness: stats.freshness,
      careerSeasons: stats.careerSeasons,
    })
  } catch (e) {
    return failure(e)
  }
}
