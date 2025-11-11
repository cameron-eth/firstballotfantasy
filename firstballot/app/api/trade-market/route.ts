import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sleeperApi } from '@/lib/nextjs-cache'

// Extend timeout for this route (fetching many weeks of transactions)
export const maxDuration = 60 // 60 seconds
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 })
    }

    // Fetch FRESH NFL state (no cache) to ensure we get the latest week
    const nflState = await fetch('https://api.sleeper.app/v1/state/nfl', {
      cache: 'no-store',
    }).then((r) => r.json())

    const currentWeek = nflState.week || nflState.display_week || 1
    console.log('🏈 Trade Market - NFL State:', {
      week: nflState.week,
      display_week: nflState.display_week,
      season: nflState.season,
      season_type: nflState.season_type,
      currentWeek,
    })

    // Fetch critical data in parallel - Users data without cache to get fresh team names
    const [rosters, users, allPlayers, rankingsResult] = await Promise.all([
      sleeperApi.getLeagueRosters(leagueId),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then(
        (r) => r.json()
      ),
      sleeperApi.getAllPlayers(),
      (async () => {
        try {
          return await supabaseAdmin
            .from('dynasty_sf_top_150')
            .select('*')
            .order('RK', { ascending: true })
        } catch (err) {
          console.error('Rankings fetch error:', err)
          return { data: [], error: err }
        }
      })(),
    ])

    // Process teams data efficiently
    const teamsData = rosters.map((roster: any) => {
      const owner = roster.owner_id ? users.find((u: any) => u?.user_id === roster.owner_id) : null
      const teamName =
        owner?.metadata?.team_name ||
        owner?.display_name ||
        owner?.first_name ||
        `Team ${roster.roster_id}`

      return {
        rosterId: roster.roster_id,
        teamName,
        ownerName: owner?.display_name || 'Unknown',
        ownerAvatar: owner?.avatar || undefined,
        ownerUsername: owner?.display_name || 'Unknown',
        ownerId: roster.owner_id,
      }
    })

    // Process dynasty rankings efficiently (handle errors gracefully)
    let rankingsMap = {}
    if (
      rankingsResult?.data &&
      Array.isArray(rankingsResult.data) &&
      rankingsResult.data.length > 0
    ) {
      rankingsMap = rankingsResult.data.reduce((acc: any, player: any) => {
        const playerName = player['PLAYER NAME']
        if (playerName) {
          acc[playerName] = {
            rank: player.RK,
            position: player.POS,
            team: player.TEAM,
            name: playerName,
            tier:
              player.RK <= 12
                ? 1
                : player.RK <= 36
                  ? 2
                  : player.RK <= 72
                    ? 3
                    : player.RK <= 120
                      ? 4
                      : 5,
          }
        }
        return acc
      }, {})
    } else if (rankingsResult?.error) {
      console.warn('Rankings unavailable:', rankingsResult.error)
      // Continue without rankings - use default player values
    }

    // Fetch ALL transactions from offseason (week 0) through current week + buffer
    const currentYear = new Date().getFullYear()
    const weeksToFetch = []

    // Add a 2-week buffer to ensure we catch all trades even if NFL state is slightly behind
    // NFL regular season is 18 weeks, so we cap at 20 to be safe
    const maxWeek = Math.min(currentWeek + 2, 20)
    
    // Include ALL weeks from 0 (offseason) to current week + buffer to track full trade history
    for (let week = 0; week <= maxWeek; week++) {
      weeksToFetch.push(week)
    }
    
    console.log(`📊 Fetching transactions for weeks 0-${maxWeek} (current week: ${currentWeek})`)

    // Fetch transactions in larger parallel batches for speed (no delay needed)
    const batchSize = 5
    const allTransactions = []

    for (let i = 0; i < weeksToFetch.length; i += batchSize) {
      const batch = weeksToFetch.slice(i, i + batchSize)
      const batchPromises = batch.map((week) =>
        sleeperApi.getTransactions(leagueId, week).catch(() => [])
      )

      const batchResults = await Promise.all(batchPromises)
      allTransactions.push(...batchResults.flat())
    }

    // Fetch traded picks with Next.js caching
    const tradedPicks = await sleeperApi.getTradedPicks(leagueId).catch(() => [])

    // Filter transactions to only include trades
    const trades = allTransactions.filter((tx: any) => tx.type === 'trade')
    
    // Log transaction summary with dates
    if (trades.length > 0) {
      const tradeDates = trades.map((t: any) => new Date(t.created || t.status_updated)).sort((a, b) => b.getTime() - a.getTime())
      const mostRecentTrade = tradeDates[0]
      const oldestTrade = tradeDates[tradeDates.length - 1]
      console.log(`✅ Found ${trades.length} trades from ${oldestTrade.toLocaleDateString()} to ${mostRecentTrade.toLocaleDateString()}`)
      console.log(`📅 Most recent trade: ${mostRecentTrade.toLocaleString()}`)
    } else {
      console.log('⚠️ No trades found in fetched transactions')
    }

    const responseData = {
      success: true,
      data: {
        leagueId,
        userId,
        teams: teamsData,
        allPlayers,
        transactions: trades,
        tradedPicks,
        dynastyRankings: rankingsMap,
        totalTrades: trades.length,
        totalTradedPicks: tradedPicks.length,
        totalTeams: teamsData.length,
        currentWeek,
        lastUpdated: new Date().toISOString(),
        dataVersion: '1.2',
        weeksAnalyzed: weeksToFetch,
        totalTransactionsAnalyzed: allTransactions.length,
        yearAnalyzed: currentYear,
        includesPreseason: true,
        fetchStrategy: 'preseason + recent weeks',
        batchSize: batchSize,
      },
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Trade Market API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch trade market data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestParams: {
          leagueId: new URL(request.url).searchParams.get('leagueId'),
          userId: new URL(request.url).searchParams.get('userId'),
        },
      },
      { status: 500 }
    )
  }
}
