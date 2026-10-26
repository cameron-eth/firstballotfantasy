import { webAccount } from '@/lib/platform/auth'
import { body, failure, json, PlatformError } from '@/lib/platform/http'
import { billingFor, connectTeam, teamsFor } from '@/lib/platform/teams'
import { teamCapacity } from '@/lib/platform/policy'
import { supabaseAdmin } from '@/lib/supabase-server'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request)
    const [teams, billing] = await Promise.all([teamsFor(p), billingFor(p.accountId)])
    return json({ teams, capacity: teamCapacity(billing) })
  } catch (e) {
    return failure(e)
  }
}
export async function POST(request: Request) {
  try {
    const p = await webAccount(request),
      input = await body(request)
    if (input.action === 'connect') {
      const team = await connectTeam(p, String(input.leagueId ?? ''))
      const { error } = await supabaseAdmin.rpc('activate_connected_team', {
        p_account: p.accountId,
        p_team: team.id,
        p_active: true,
      })
      if (error && !error.message.includes('TEAM_LIMIT'))
        throw new PlatformError(503, 'ACTIVATION_FAILED', 'Could not activate team.')
      return json({ team, needsUpgrade: !!error })
    }
    if (
      !['activate', 'archive'].includes(input.action) ||
      !/^[0-9a-f-]{36}$/.test(input.teamId ?? '')
    )
      throw new PlatformError(400, 'INVALID_TEAM', 'Choose a team and action.')
    const { error } = await supabaseAdmin.rpc('activate_connected_team', {
      p_account: p.accountId,
      p_team: input.teamId,
      p_active: input.action === 'activate',
    })
    if (error)
      throw new PlatformError(
        error.message.includes('TEAM_LIMIT') ? 409 : 400,
        'TEAM_LIMIT',
        error.message.includes('TEAM_LIMIT')
          ? 'Your active team slots are full. Archive a team or add a slot.'
          : 'Could not update this team.'
      )
    return json({ saved: true })
  } catch (e) {
    return failure(e)
  }
}
