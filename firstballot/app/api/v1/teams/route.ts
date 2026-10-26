import { observed } from '@/lib/platform/observe'
import { apiAccount } from '@/lib/platform/auth'
import { listTeams, teamRoster } from '@/lib/platform/api-service'
import { failure, json } from '@/lib/platform/http'
export async function GET(request: Request) {
  try {
    const p = await apiAccount(request, 'teams:read')
    const id = new URL(request.url).searchParams.get('team')
    return json(
      await observed<unknown>(p, id ? 'team_roster' : 'list_teams', () =>
        id ? teamRoster(p, id) : listTeams(p)
      )
    )
  } catch (e) {
    return failure(e)
  }
}
