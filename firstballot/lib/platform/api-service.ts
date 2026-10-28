import 'server-only'
import type { Principal } from './auth'
import { requireTeam, sleeperRead, teamsFor } from './teams'
import { snapshot, snapshotMetadata } from './snapshots'
import { sleeperRostersKey } from './snapshot-keys'
import { PlatformError } from './http'
function requireRead(p: Principal) {
  if (!p.scopes.includes('teams:read'))
    throw new PlatformError(403, 'SCOPE_REQUIRED', 'Team read access is required.')
}
export async function listTeams(p: Principal) {
  requireRead(p)
  return { teams: await teamsFor(p) }
}
export async function teamRoster(p: Principal, id: string) {
  requireRead(p)
  const team = await requireTeam(p, id)
  const data = await snapshot(
    sleeperRostersKey(team.league_id),
    'Sleeper',
    120,
    async () => ({
      payload: await sleeperRead(`league/${team.league_id}/rosters`),
      observedAt: new Date().toISOString(),
      season: team.season,
    }),
    Array.isArray
  )
  return {
    team,
    roster: data.payload.find((r: { roster_id: number }) => r.roster_id === team.roster_id) ?? null,
    freshness: snapshotMetadata(data),
  }
}
