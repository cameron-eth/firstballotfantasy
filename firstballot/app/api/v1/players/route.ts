import { observed } from '@/lib/platform/observe'
import { apiAccount } from '@/lib/platform/auth'
import { playerData } from '@/lib/platform/player-data'
import { failure, json } from '@/lib/platform/http'
export async function GET(request: Request) {
  try {
    const p = await apiAccount(request, 'players:read')
    return json(
      await observed(p, 'player_stats', () =>
        playerData((new URL(request.url).searchParams.get('ids') ?? '').split(',').filter(Boolean))
      )
    )
  } catch (e) {
    return failure(e)
  }
}
