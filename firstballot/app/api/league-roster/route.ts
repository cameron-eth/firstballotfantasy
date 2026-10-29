import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { SLEEPER_CACHE, sleeperClient } from '@/lib/sleeper-sdk/client'

// Force dynamic to always get fresh data
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')

    if (!leagueId) {
      return fail(400, 'League ID is required')
    }

    // Get the userId and JWT token from headers (set by middleware after auth verification)
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    console.log('[league-roster] Auth headers:', { userId: !!userId, userJwt: !!userJwt })

    if (!userId || !userJwt) {
      console.log('[league-roster] Missing auth headers')
      return fail(401, 'User not authenticated')
    }

    // Create an authenticated Supabase client with the user's JWT token
    const userSupabase = createAuthenticatedSupabaseClient(userJwt)

    // Get user's Sleeper username from their profile (this query is now cached by Next.js)
    const { data: userProfile, error: profileError } = await userSupabase
      .from('user_profiles')
      .select('sleeper_username')
      .eq('auth_id', userId)
      .single()

    console.log('[league-roster] Profile fetch:', {
      hasProfile: !!userProfile,
      hasSleeperUsername: !!userProfile?.sleeper_username,
      sleeperUsername: userProfile?.sleeper_username,
      profileError: profileError?.message,
    })

    if (profileError || !userProfile?.sleeper_username) {
      return fail(400, 'Please connect your Sleeper account first', {
        message: 'Go to League Buddy and connect your Sleeper username',
      })
    }

    // Fetch all data in parallel - Users without cache to get fresh team names
    const [leagueData, rostersData, usersData, playersData] = await Promise.all([
      sleeperClient.getLeague(leagueId, SLEEPER_CACHE.league),
      sleeperClient.getLeagueRosters(leagueId, SLEEPER_CACHE.rosters),
      sleeperClient.getLeagueUsers(leagueId, SLEEPER_CACHE.fresh),
      sleeperClient.getAllPlayers(SLEEPER_CACHE.players),
    ])

    // Find the user's Sleeper user ID
    const sleeperUser = usersData.find(
      (u: any) =>
        u.display_name === userProfile.sleeper_username ||
        u.username === userProfile.sleeper_username
    )

    if (!sleeperUser) {
      return fail(404, 'User not found in this league')
    }

    // Find the user's roster
    const rostersDataTyped = rostersData as any[]
    const playersDataTyped = playersData as Record<string, any>

    const userRoster = rostersDataTyped.find(
      (roster: any) => roster.owner_id === sleeperUser.user_id
    )

    if (!userRoster) {
      return fail(404, 'User roster not found')
    }

    // Get player IDs from user's roster only
    const userPlayerIds = userRoster.players || []

    // Filter and format user's roster data efficiently
    const roster = userPlayerIds
      .map((playerId: string) => playersDataTyped[playerId])
      .filter(
        (player: any) =>
          player && player.position && ['QB', 'RB', 'WR', 'TE'].includes(player.position)
      )
      .map((player: any) => ({
        player_id: player.player_id,
        first_name: player.first_name || '',
        last_name: player.last_name || '',
        name: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
        position: player.position,
        team: player.team || 'FA',
        age: player.age || 25,
        years_exp: player.years_exp || 0,
        search_rank: player.search_rank || 100,
        fantasy_pos_rank: player.fantasy_pos_rank || null,
        injury_status: player.injury_status || null,
        status: player.status || 'Active',
      }))
      .sort((a: any, b: any) => (a.search_rank || 100) - (b.search_rank || 100))

    return NextResponse.json({
      league: leagueData,
      roster: roster,
      total_players: roster.length,
      user_roster_id: userRoster.roster_id,
      user_sleeper_id: sleeperUser.user_id,
    })
  } catch (error) {
    console.error('Error fetching league roster:', error)
    return fail(500, 'Failed to fetch league roster')
  }
}
