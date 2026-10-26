import { timingSafeEqual } from 'node:crypto'
import { playerData } from '@/lib/platform/player-data'
import { json, failure, PlatformError } from '@/lib/platform/http'
export async function POST(request: Request) {
  try {
    const expected = process.env.DATA_REFRESH_SECRET,
      provided = request.headers.get('authorization')?.replace(/^Bearer /, '')
    if (
      !expected ||
      !provided ||
      Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
    )
      throw new PlatformError(401, 'UNAUTHORIZED', 'Unauthorized.')
    const stats = await playerData(['8144'])
    return json({ refreshed: 'espn:ppr', season: stats.season, freshness: stats.freshness })
  } catch (e) {
    return failure(e)
  }
}
