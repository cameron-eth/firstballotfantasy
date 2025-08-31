import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sleeperApi } from '@/lib/nextjs-cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's Sleeper username from their profile
    const { data: userProfile } = await supabaseServer
      .from('user_profiles')
      .select('sleeper_username')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.sleeper_username) {
      return NextResponse.json(
        { error: 'User not connected to Sleeper' },
        { status: 400 }
      )
    }

    // Fetch all data in parallel with Next.js caching
    const [leagueData, rostersData, usersData, playersData] = await Promise.all([
      sleeperApi.getLeagueInfo(leagueId),
      sleeperApi.getLeagueRosters(leagueId),
      sleeperApi.getLeagueUsers(leagueId),
      sleeperApi.getAllPlayers()
    ])

    // Find the user's Sleeper user ID
    const sleeperUser = usersData.find((u: any) => 
      u.display_name === userProfile.sleeper_username || 
      u.username === userProfile.sleeper_username
    )

    if (!sleeperUser) {
      return NextResponse.json(
        { error: 'User not found in this league' },
        { status: 404 }
      )
    }

    // Find the user's roster
    const userRoster = rostersData.find((roster: any) => 
      roster.owner_id === sleeperUser.user_id
    )

    if (!userRoster) {
      return NextResponse.json(
        { error: 'User roster not found' },
        { status: 404 }
      )
    }

    // Get player IDs from user's roster only
    const userPlayerIds = userRoster.players || []

    // Filter and format user's roster data efficiently
    const roster = userPlayerIds
      .map((playerId: string) => playersData[playerId])
      .filter((player: any) => player && player.position && ['QB', 'RB', 'WR', 'TE'].includes(player.position))
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
        status: player.status || 'Active'
      }))
      .sort((a: any, b: any) => (a.search_rank || 100) - (b.search_rank || 100))

    return NextResponse.json({
      league: leagueData,
      roster: roster,
      total_players: roster.length,
      user_roster_id: userRoster.roster_id,
      user_sleeper_id: sleeperUser.user_id
    })

  } catch (error) {
    console.error('Error fetching league roster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch league roster' },
      { status: 500 }
    )
  }
} 