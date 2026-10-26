import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Principal } from './auth'
import { PlatformError } from './http'
import { teamCapacity } from './policy'
export async function billingFor(accountId: string) {
  const { data, error } = await supabaseAdmin
    .from('account_billing')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()
  if (error)
    throw new PlatformError(
      503,
      'PLATFORM_NOT_READY',
      'Account services are being prepared. Please retry shortly.'
    )
  return data
}
export async function teamsFor(principal: Principal) {
  const { data, error } = await supabaseAdmin
    .from('connected_teams')
    .select('id,league_id,lineage_id,roster_id,name,season,active,activated_at')
    .eq('account_id', principal.accountId)
    .order('activated_at', { nullsFirst: false })
    .order('id')
  if (error) throw new PlatformError(503, 'TEAMS_UNAVAILABLE', 'Could not load connected teams.')
  const capacity = teamCapacity(await billingFor(principal.accountId))
  let count = 0
  return (data ?? [])
    .map((t) => ({ ...t, active: t.active && (capacity === null || ++count <= capacity) }))
    .filter((t) => principal.teamIds === null || principal.teamIds.includes(t.id))
}
export async function requireTeam(principal: Principal, id: string) {
  const team = (await teamsFor(principal)).find((t) => t.id === id)
  if (!team)
    throw new PlatformError(404, 'TEAM_NOT_FOUND', 'Team not found in your permitted teams.')
  if (!team.active)
    throw new PlatformError(403, 'TEAM_INACTIVE', 'Activate this team in Billing to use it.')
  return team
}
export async function sleeperRead(path: string) {
  const r = await fetch(`https://api.sleeper.app/v1/${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok)
    throw new PlatformError(502, 'SLEEPER_UNAVAILABLE', 'Current Sleeper data is unavailable.')
  return r.json()
}
export async function connectTeam(principal: Principal, leagueId: string) {
  if (!/^\d{10,25}$/.test(leagueId))
    throw new PlatformError(400, 'INVALID_LEAGUE', 'Choose a valid league.')
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('sleeper_username')
    .eq('auth_id', principal.accountId)
    .maybeSingle()
  if (error || !profile?.sleeper_username)
    throw new PlatformError(400, 'SLEEPER_REQUIRED', 'Save your Sleeper username first.')
  const user = await sleeperRead(`user/${encodeURIComponent(profile.sleeper_username)}`)
  if (!user?.user_id)
    throw new PlatformError(400, 'SLEEPER_REQUIRED', 'Sleeper username was not found.')
  const [league, rosters] = await Promise.all([
    sleeperRead(`league/${leagueId}`),
    sleeperRead(`league/${leagueId}/rosters`),
  ])
  const mine = Array.isArray(rosters)
    ? rosters.find((r) => r.owner_id === user.user_id || r.co_owners?.includes(user.user_id))
    : null
  if (!mine)
    throw new PlatformError(
      403,
      'ROSTER_REQUIRED',
      'This Sleeper username does not manage a roster in that league.'
    )
  let cursor = league,
    depth = 0
  const visited = new Set<string>([leagueId])
  while (cursor.previous_league_id && cursor.previous_league_id !== '0') {
    if (
      ++depth > 30 ||
      visited.has(cursor.previous_league_id) ||
      !/^\d{10,25}$/.test(cursor.previous_league_id)
    )
      throw new PlatformError(502, 'LINEAGE_INVALID', 'Could not establish league history.')
    visited.add(cursor.previous_league_id)
    cursor = await sleeperRead(`league/${cursor.previous_league_id}`)
    if (!cursor?.league_id)
      throw new PlatformError(502, 'LINEAGE_INVALID', 'League history is incomplete.')
  }
  // Public username connections permit planning; real actions still require Sleeper token verification.
  const { data: existing, error: readError } = await supabaseAdmin
    .from('connected_teams')
    .select('*')
    .eq('account_id', principal.accountId)
    .eq('lineage_id', cursor.league_id)
    .eq('roster_id', mine.roster_id)
    .maybeSingle()
  if (readError) throw new PlatformError(503, 'TEAMS_UNAVAILABLE', 'Team storage unavailable.')
  if (existing && existing.season > Number(league.season)) return existing
  const record = {
    account_id: principal.accountId,
    lineage_id: cursor.league_id,
    league_id: leagueId,
    roster_id: mine.roster_id,
    sleeper_user_id: user.user_id,
    name: league.name,
    season: Number(league.season),
  }
  const { data, error: saveError } = await supabaseAdmin
    .from('connected_teams')
    .upsert(record, { onConflict: 'account_id,lineage_id,roster_id' })
    .select()
    .single()
  if (saveError) throw new PlatformError(503, 'TEAMS_UNAVAILABLE', 'Could not connect this team.')
  return data
}
export async function requireActiveLeague(principal: Principal, leagueId: string) {
  const teams = await teamsFor(principal)
  const team = teams.find((t) => t.league_id === leagueId && t.active)
  if (!team)
    throw new PlatformError(403, 'TEAM_INACTIVE', 'Activate this team in Billing to continue.')
  return team
}
