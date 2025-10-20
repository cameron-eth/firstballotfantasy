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

    // Fetch critical data in parallel - Users data without cache to get fresh team names
    const [rosters, users, allPlayers, rankingsResult] = await Promise.all([
      sleeperApi.getLeagueRosters(leagueId),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then(r => r.json()),
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

    // Fetch transactions strategically - include preseason and recent weeks
    const currentYear = new Date().getFullYear()
    const weeksToFetch = []
    
    // Always include preseason weeks (0-3) for draft pick trades and early season moves
    for (let week = 0; week <= 3; week++) {
      weeksToFetch.push(week)
    }
    
    // Include recent weeks (last 4 weeks) for current activity
    const recentWeeks = Math.max(1, currentWeek - 3)
    for (let week = recentWeeks; week <= currentWeek; week++) {
      if (!weeksToFetch.includes(week)) {
        weeksToFetch.push(week)
      }
    }
    
    // Fetch transactions in smaller batches to avoid API limits
    const batchSize = 3
    const allTransactions = []
    
    for (let i = 0; i < weeksToFetch.length; i += batchSize) {
      const batch = weeksToFetch.slice(i, i + batchSize)
      const batchPromises = batch.map(week => 
        sleeperApi.getTransactions(leagueId, week).catch(() => [])
      )
      
      const batchResults = await Promise.all(batchPromises)
      allTransactions.push(...batchResults.flat())
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < weeksToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Fetch traded picks with Next.js caching
    const tradedPicks = await sleeperApi.getTradedPicks(leagueId).catch(() => [])

    // Filter transactions to only include trades
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
        totalTransactionsAnalyzed: allTransactions.length,
        yearAnalyzed: currentYear,
        includesPreseason: true,
        fetchStrategy: 'preseason + recent weeks',
        batchSize: batchSize
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