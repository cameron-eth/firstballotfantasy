import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { SLEEPER_CACHE, sleeperClient } from '@/lib/sleeper-sdk/client'
import type { SleeperLeagueResponse, UserLeague } from '@/types/league'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const jwt = request.headers.get('x-user-jwt')
  if (!userId || !jwt) return fail(401, 'Unauthorized')

  const { data: profile, error } = await createAuthenticatedSupabaseClient(jwt)
    .from('user_profiles')
    .select('sleeper_username')
    .eq('auth_id', userId)
    .maybeSingle()
  if (error) return fail(500, 'Could not load Sleeper connection')
  if (!profile?.sleeper_username)
    return NextResponse.json({ leagues: [], fetched_at: new Date().toISOString() })

  try {
    const sleeperUser = await sleeperClient.getUser(
      profile.sleeper_username,
      SLEEPER_CACHE.userLeagues
    )
    if (!sleeperUser) throw new Error('Sleeper user unavailable')
    const season = new Date().getFullYear()
    const sleeperLeagues = await sleeperClient.read<SleeperLeagueResponse[]>(
      `/user/${encodeURIComponent(sleeperUser.user_id)}/leagues/nfl/${season}`,
      SLEEPER_CACHE.userLeagues
    )
    const leagues: UserLeague[] = sleeperLeagues.map((league) => ({
      league_id: league.league_id,
      name: league.name,
      settings: { type: league.settings?.type },
      season: league.season,
      total_rosters: league.total_rosters,
      roster_positions: league.roster_positions,
      scoring_settings: league.scoring_settings,
      status: league.status as UserLeague['status'],
    }))
    return NextResponse.json(
      { leagues, fetched_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return fail(502, 'Sleeper leagues are temporarily unavailable')
  }
}
