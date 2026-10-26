import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import type { SleeperLeagueResponse, UserLeague } from '@/types/league'

export const dynamic = 'force-dynamic'
const SLEEPER = 'https://api.sleeper.app/v1'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const jwt = request.headers.get('x-user-jwt')
  if (!userId || !jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await createAuthenticatedSupabaseClient(jwt)
    .from('user_profiles')
    .select('sleeper_username')
    .eq('auth_id', userId)
    .maybeSingle()
  if (error)
    return NextResponse.json({ error: 'Could not load Sleeper connection' }, { status: 500 })
  if (!profile?.sleeper_username)
    return NextResponse.json({ leagues: [], fetched_at: new Date().toISOString() })

  try {
    const sleeperUserResponse = await fetch(
      `${SLEEPER}/user/${encodeURIComponent(profile.sleeper_username)}`,
      { next: { revalidate: 300 } }
    )
    if (!sleeperUserResponse.ok) throw new Error('Sleeper user unavailable')
    const sleeperUser = await sleeperUserResponse.json()
    const season = new Date().getFullYear()
    const leaguesResponse = await fetch(
      `${SLEEPER}/user/${encodeURIComponent(sleeperUser.user_id)}/leagues/nfl/${season}`,
      { next: { revalidate: 300 } }
    )
    if (!leaguesResponse.ok) throw new Error('Sleeper leagues unavailable')
    const leagues: UserLeague[] = ((await leaguesResponse.json()) as SleeperLeagueResponse[]).map(
      (league) => ({
        league_id: league.league_id,
        name: league.name,
        settings: { type: league.settings?.type },
        season: league.season,
        total_rosters: league.total_rosters,
        roster_positions: league.roster_positions,
        scoring_settings: league.scoring_settings,
        status: league.status as UserLeague['status'],
      })
    )
    return NextResponse.json(
      { leagues, fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'Sleeper leagues are temporarily unavailable' },
      { status: 502 }
    )
  }
}
