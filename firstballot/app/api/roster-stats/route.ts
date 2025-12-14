import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Simple endpoint: Give me Sleeper player IDs, I give you their stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sleeperPlayerIds =
      searchParams
        .get('player_ids')
        ?.split(',')
        .map((id) => id.trim()) || []

    if (sleeperPlayerIds.length === 0) {
      return NextResponse.json({ error: 'No player_ids provided' }, { status: 400 })
    }

    // 1. Get all Sleeper players to map Sleeper ID -> GSIS ID
    const sleeperPlayersResponse = await fetch('https://api.sleeper.app/v1/players/nfl')
    const allSleeperPlayers = await sleeperPlayersResponse.json()

    // 2. Build map of Sleeper ID -> GSIS ID
    const sleeperToGsis: Record<string, string> = {}
    sleeperPlayerIds.forEach((sleeperId) => {
      const player = allSleeperPlayers[sleeperId]
      if (player?.gsis_id) {
        sleeperToGsis[sleeperId] = player.gsis_id
      }
    })

    const gsisIds = Object.values(sleeperToGsis)

    if (gsisIds.length === 0) {
      return NextResponse.json({
        data: sleeperPlayerIds.map((id) => ({
          sleeper_player_id: id,
          fantasy_ppg: 0,
          total_fantasy_points: 0,
          games_played: 0,
        })),
      })
    }

    // 3. Get stats from master_player_stats by GSIS ID
    const { data: stats, error } = await supabaseServer
      .from('master_player_stats')
      .select(
        'player_gsis_id, player_display_name, fantasy_ppg, total_fantasy_points, games_played, headshot_url'
      )
      .in('player_gsis_id', gsisIds)

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 4. For players without GSIS ID, try name matching
    const playersWithoutGsis = sleeperPlayerIds.filter((id) => !sleeperToGsis[id])
    let nameMatchedStats: any[] = []

    if (playersWithoutGsis.length > 0) {
      const playerNames = playersWithoutGsis
        .map((id) => allSleeperPlayers[id]?.full_name)
        .filter(Boolean)

      const { data: nameStats } = await supabaseServer
        .from('master_player_stats')
        .select(
          'player_gsis_id, player_display_name, fantasy_ppg, total_fantasy_points, games_played, headshot_url'
        )
        .in('player_display_name', playerNames)

      nameMatchedStats = nameStats || []
    }

    // 5. Map back to Sleeper IDs
    const result = sleeperPlayerIds.map((sleeperId) => {
      const gsisId = sleeperToGsis[sleeperId]
      const playerName = allSleeperPlayers[sleeperId]?.full_name

      // Try GSIS match first, then name match
      let playerStats = stats?.find((s) => s.player_gsis_id === gsisId)
      if (!playerStats && playerName) {
        playerStats = nameMatchedStats.find((s) => s.player_display_name === playerName)
      }

      return {
        sleeper_player_id: sleeperId,
        player_name: playerStats?.player_display_name || playerName || 'Unknown',
        fantasy_ppg: playerStats?.fantasy_ppg || 0,
        total_fantasy_points: playerStats?.total_fantasy_points || 0,
        games_played: playerStats?.games_played || 0,
        headshot_url: playerStats?.headshot_url || null,
      }
    })

    return NextResponse.json({ data: result, count: result.length })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
