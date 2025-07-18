import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')

    console.log('Trade Market API called with:', { leagueId, userId })

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 })
    }

    console.log('Fetching data for league:', leagueId)

    // First get NFL state to determine current week
    const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
    if (!nflStateResponse.ok) {
      throw new Error('Failed to fetch NFL state')
    }
    const nflState = await nflStateResponse.json()
    const currentWeek = nflState.week || 1

    console.log('Current NFL week:', currentWeek)

    // Fetch all necessary data in parallel
    const [rostersResponse, usersResponse, playersResponse, transactionsResponse, tradedPicksResponse, rankingsResponse] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
      fetch('https://api.sleeper.app/v1/players/nfl'),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${currentWeek}`),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`),
      supabaseServer.from('dynasty_sf_top_150').select('*').order('RK', { ascending: true })
    ])

    console.log('Individual API responses:')
    console.log('- Rosters:', rostersResponse.status, rostersResponse.statusText)
    console.log('- Users:', usersResponse.status, usersResponse.statusText)
    console.log('- Players:', playersResponse.status, playersResponse.statusText)
    console.log('- Transactions:', transactionsResponse.status, transactionsResponse.statusText)
    console.log('- Traded Picks:', tradedPicksResponse.status, tradedPicksResponse.statusText)
    console.log('- Rankings:', rankingsResponse.error ? 'Error' : 'Success', rankingsResponse.error || 'No error')

    console.log('API Responses received:', {
      rosters: rostersResponse.status,
      users: usersResponse.status,
      players: playersResponse.status,
      transactions: transactionsResponse.status,
      tradedPicks: tradedPicksResponse.status,
      rankings: rankingsResponse.error ? 'error' : 'success'
    })

    // Validate critical responses
    if (!rostersResponse.ok || !usersResponse.ok || !playersResponse.ok) {
      throw new Error(`Failed to fetch critical league data: rosters=${rostersResponse.status}, users=${usersResponse.status}, players=${playersResponse.status}`)
    }

    // Parse all responses
    const [rosters, users, allPlayers, transactions, tradedPicks, rankingsResult] = await Promise.all([
      rostersResponse.json(),
      usersResponse.json(),
      playersResponse.json(),
      transactionsResponse.ok ? transactionsResponse.json() : [],
      tradedPicksResponse.ok ? tradedPicksResponse.json() : [],
      rankingsResponse
    ])

    console.log('Data parsed:', {
      rostersCount: rosters?.length || 0,
      usersCount: users?.length || 0,
      playersCount: Object.keys(allPlayers || {}).length,
      transactionsCount: transactions?.length || 0,
      tradedPicksCount: tradedPicks?.length || 0,
      rankingsCount: rankingsResult.data?.length || 0
    })

    if (rankingsResult.error) {
      console.error('Supabase rankings error:', rankingsResult.error)
      console.warn('Continuing without dynasty rankings data')
    }

    // Process teams data with proper user mapping
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

    console.log('Teams processed:', teamsData.length)

    // Process dynasty rankings
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
    } else {
      console.warn('No dynasty rankings data available, using empty rankings map')
    }

    console.log('Rankings processed:', Object.keys(rankingsMap).length)

    // Fetch transactions from multiple weeks to get more trade data
    const weeksToFetch = [currentWeek, currentWeek - 1, currentWeek - 2, currentWeek - 3, currentWeek - 4]
    const validWeeks = weeksToFetch.filter(week => week > 0)
    
    console.log('Fetching transactions from weeks:', validWeeks)
    
    const additionalTransactionsResponses = await Promise.all(
      validWeeks.slice(1).map(week => 
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`).catch(() => null)
      )
    )
    
    const additionalTransactions = await Promise.all(
      additionalTransactionsResponses.map(response => 
        response && response.ok ? response.json() : Promise.resolve([])
      )
    )
    
    // Combine all transactions
    const allTransactions = [transactions, ...additionalTransactions].flat()
    console.log('Total transactions from all weeks:', allTransactions.length)
    
    // Filter transactions to only include trades
    const trades = allTransactions.filter((tx: any) => tx.type === 'trade')

    console.log('Trades filtered:', trades.length, 'out of', allTransactions.length, 'total transactions')
    
    // Also include traded picks as a form of trade
    console.log('Traded picks found:', tradedPicks.length)

    const responseData = {
      success: true,
      data: {
        leagueId,
        teams: teamsData,
        allPlayers,
        transactions: trades,
        tradedPicks,
        dynastyRankings: rankingsMap,
        totalTrades: trades.length,
        totalTradedPicks: tradedPicks.length,
        totalTeams: teamsData.length,
        currentWeek
      }
    }

    console.log('Trade Market API response prepared:', {
      success: responseData.success,
      totalTrades: responseData.data.totalTrades,
      totalTradedPicks: responseData.data.totalTradedPicks,
      totalTeams: responseData.data.totalTeams,
      currentWeek: responseData.data.currentWeek,
      hasRankings: Object.keys(responseData.data.dynastyRankings).length > 0
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Trade Market API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trade market data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 