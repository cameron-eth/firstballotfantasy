import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic to always get fresh data
export const dynamic = 'force-dynamic'

/**
 * Calculate where a given score would rank in the overall rankings
 */
function calculateRankForScore(score: number, sortedRankings: any[]): number {
  // Find the first player with a score less than or equal to the given score
  for (let i = 0; i < sortedRankings.length; i++) {
    if (sortedRankings[i].total_score <= score) {
      return i + 1
    }
  }
  // If score is higher than all players, it's rank 1
  return 1
}

/**
 * Get rank for a specific player by name
 */
function getPlayerRank(playerName: string, rankings: any[]): number | null {
  const player = rankings.find((p) => p.player_name === playerName)
  return player ? player.rank : null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const playerName = searchParams.get('player')
    const score = searchParams.get('score')
    const search = searchParams.get('search') // For autocomplete

    // Get rankings data (headshot_url and espn_id should now be in the table)
    const { data, error } = await supabaseServer
      .from('dynasty_player_tiers')
      .select('*')
      .order('total_score', { ascending: false })

    if (error) {
      throw error
    }

    // Handle search/autocomplete query
    if (search) {
      const searchLower = search.toLowerCase()
      const matches = (data || [])
        .map((player: any, index: number) => {
          const name = player.player_name?.toLowerCase() || ''
          if (name.includes(searchLower)) {
            return {
              player_name: player.player_name,
              position: player.position,
              team: player.team,
              rank: index + 1, // Actual rank in overall rankings
            }
          }
          return null
        })
        .filter((player): player is NonNullable<typeof player> => player !== null)
        .slice(0, 20) // Limit to 20 results

      return NextResponse.json(
        { players: matches },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      )
    }

    // Transform data to create a player lookup map with backward compatibility
    const playerRankings = (data || []).map((player: any, index: number) => {
      // Convert total_score from string to number if needed
      const totalScore =
        typeof player.total_score === 'string' ? parseFloat(player.total_score) : player.total_score

      return {
        player_id: player.player_id,
        player_name: player.player_name,
        position: player.position,
        team: player.team,
        age: player.age,
        total_score: totalScore,
        tier: player.tier,
        headshot_url: player.headshot_url || null,
        espn_id: player.espn_id || null,
        // Backward compatibility fields
        rank: index + 1,
        RK: index + 1,
        'PLAYER NAME': player.player_name,
        POS: player.position,
        TEAM: player.team,
        // Score components
        age_score: player.age_score,
        draft_capital_score: player.draft_capital_score,
        recent_form_score: player.recent_form_score,
        volume_score: player.volume_score,
        td_efficiency_score: player.td_efficiency_score,
        versatility_score: player.versatility_score,
        epa_efficiency_score: player.epa_efficiency_score,
      }
    })

    // Handle specific queries
    if (playerName) {
      const rank = getPlayerRank(playerName, playerRankings)
      if (rank === null) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }
      const player = playerRankings[rank - 1]
      const { player_name, rank: playerRank, ...rest } = player
      return NextResponse.json(
        {
          player_name: playerName,
          rank,
          ...rest,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      )
    }

    if (score) {
      const scoreNum = parseFloat(score)
      if (isNaN(scoreNum)) {
        return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
      }
      const rank = calculateRankForScore(scoreNum, playerRankings)
      return NextResponse.json(
        {
          score: scoreNum,
          rank,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      )
    }

    // Also create lookup map for easy access
    const rankingsMap = playerRankings.reduce((acc: any, player: any) => {
      const playerName = player.player_name
      if (playerName) {
        acc[playerName] = {
          rank: player.rank,
          position: player.position,
          team: player.team,
          name: playerName,
          total_score: player.total_score,
          tier: player.tier,
        }
      }
      return acc
    }, {})

    // Return with no-cache headers to ensure fresh data
    return NextResponse.json(
      {
        data: playerRankings,
        rankingsMap,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}
