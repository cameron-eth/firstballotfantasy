import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sleeperApi } from '@/lib/nextjs-cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 })
    }

    // Use Next.js cached NFL state
    const nflState = await sleeperApi.getNflState()

    const currentWeek = nflState.week || 1

    // Fetch critical data in parallel with Next.js caching
    const [rosters, users, allPlayers, rankingsResult] = await Promise.all([
      sleeperApi.getLeagueRosters(leagueId),
      sleeperApi.getLeagueUsers(leagueId),
      sleeperApi.getAllPlayers(),
      supabaseServer.from('dynasty_sf_top_150').select('*').order('RK', { ascending: true })
    ])

    // Process teams data efficiently
    const teamsData = rosters.map((roster: any) => {
      const owner = roster.owner_id ? users.find((u: any) => u?.user_id === roster.owner_id) : null
      const teamName = owner?.metadata?.team_name || owner?.display_name || owner?.first_name || `Team ${roster.roster_id}`
      
      return {
        rosterId: roster.roster_id,
        teamName,
        ownerName: owner?.display_name || 'Unknown',
        ownerAvatar: owner?.avatar || undefined,
        ownerUsername: owner?.display_name || 'Unknown',
        ownerId: roster.owner_id
      }
    })

    // Process dynasty rankings efficiently
    let rankingsMap = {}
    if (rankingsResult.data && rankingsResult.data.length > 0) {
      rankingsMap = rankingsResult.data.reduce((acc: any, player: any) => {
        const playerName = player['PLAYER NAME']
        if (playerName) {
          acc[playerName] = {
            rank: player.RK,
            position: player.POS,
            team: player.TEAM,
            name: playerName,
            tier: player.RK <= 12 ? 1 : player.RK <= 36 ? 2 : player.RK <= 72 ? 3 : player.RK <= 120 ? 4 : 5
          }
        }
        return acc
      }, {})
    }

    // Fetch transactions more efficiently - only fetch current week and previous week
    const weeksToFetch = [currentWeek, currentWeek - 1].filter(week => week > 0)
    
    const [currentTransactions, previousTransactions] = await Promise.all([
      sleeperApi.getTransactions(leagueId, currentWeek).catch(() => []),
      currentWeek > 1 ? sleeperApi.getTransactions(leagueId, currentWeek - 1).catch(() => []) : Promise.resolve([])
    ])

    // Fetch traded picks with Next.js caching
    const tradedPicks = await sleeperApi.getTradedPicks(leagueId).catch(() => [])

    // Combine and filter transactions
    const allTransactions = [currentTransactions, previousTransactions].flat()
    const trades = allTransactions.filter((tx: any) => tx.type === 'trade')

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
        totalTransactionsAnalyzed: allTransactions.length
      }
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
          userId: new URL(request.url).searchParams.get('userId')
        }
      },
      { status: 500 }
    )
  }
} 