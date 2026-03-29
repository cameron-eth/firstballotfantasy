import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sleeperApi } from '@/lib/nextjs-cache'
import { getCachedPlayers } from '@/lib/players-cache'

// Extend timeout for this route (fetching many weeks of transactions)
export const maxDuration = 60 // 60 seconds
export const dynamic = 'force-dynamic'

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

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

    // Build league history chain (current -> previous seasons) so trade tape can span years.
    const leagueHistory: { leagueId: string; season: string }[] = []
    const seenLeagueIds = new Set<string>()
    let cursorLeagueId: string | null = leagueId
    let depth = 0
    while (cursorLeagueId && depth < 8 && !seenLeagueIds.has(cursorLeagueId)) {
      seenLeagueIds.add(cursorLeagueId)
      const leagueInfo = (await sleeperApi
        .getLeagueInfo(cursorLeagueId)
        .catch(() => null)) as Record<string, any> | null
      leagueHistory.push({
        leagueId: cursorLeagueId,
        season: String(leagueInfo?.season || ''),
      })
      cursorLeagueId =
        leagueInfo?.previous_league_id && leagueInfo.previous_league_id !== cursorLeagueId
          ? String(leagueInfo.previous_league_id)
          : null
      depth += 1
    }

    // Fetch critical data in parallel - include all players (6h TTL cache) + rankings once
    const [allPlayers, rankingsResult, ktcResult] = (await Promise.all([
      getCachedPlayers(),
      (async () => {
        try {
          const result = await supabaseServer
            .from('dynasty_player_tiers')
            .select('*')
            .order('total_score', { ascending: false })
          console.log(
            `✅ Fetched ${result.data?.length || 0} players from dynasty_player_tiers table`
          )
          if (result.data && result.data.length > 0) {
            const samplePlayer = result.data[0]
            console.log(
              `   Sample player: ${samplePlayer.player_name} (total_score: ${samplePlayer.total_score}, tier: ${samplePlayer.tier})`
            )
          }
          return result
        } catch (err) {
          console.error('❌ Rankings fetch error:', err)
          return { data: [], error: err }
        }
      })(),
      (async () => {
        try {
          const { data: latestRow, error: latestError } = await supabaseServer
            .from('ktc_player_values')
            .select('scraped_date')
            .order('scraped_date', { ascending: false })
            .limit(1)
            .single()

          if (latestError || !latestRow?.scraped_date) {
            return { data: [], error: latestError || new Error('No KTC snapshot found') }
          }

          const { data, error } = await supabaseServer
            .from('ktc_player_values')
            .select('player_name, value_sf, rank_sf')
            .eq('scraped_date', latestRow.scraped_date)

          return { data: data || [], error }
        } catch (err) {
          console.error('❌ KTC fetch error:', err)
          return { data: [], error: err }
        }
      })(),
    ])) as [Record<string, any>, any, any]

    // Build team metadata for ALL leagues in parallel (was sequential).
    const teamsByLeague: Record<string, any[]> = {}
    const teamMetaResults = await Promise.all(
      leagueHistory.map(async (league) => {
        const [rosters, users] = await Promise.all([
          sleeperApi.getLeagueRosters(league.leagueId).catch(() => []),
          fetch(`https://api.sleeper.app/v1/league/${league.leagueId}/users`, { cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => []),
        ])

        const teams = (rosters as any[]).map((roster: any) => {
          const owner = roster.owner_id ? (users as any[]).find((u: any) => u?.user_id === roster.owner_id) : null
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
            leagueId: league.leagueId,
            season: league.season,
          }
        })
        return { leagueId: league.leagueId, teams }
      })
    )
    for (const result of teamMetaResults) {
      teamsByLeague[result.leagueId] = result.teams
    }
    const teamsData = teamsByLeague[leagueId] || []

    // Process KTC values into a normalized lookup map
    const ktcMap: Record<string, { value_sf: number; rank_sf: number | null }> = {}
    if (Array.isArray(ktcResult?.data) && ktcResult.data.length > 0) {
      for (const row of ktcResult.data) {
        const playerName = row.player_name
        if (!playerName) continue
        const normalized = normalizeName(playerName)
        ktcMap[playerName] = {
          value_sf: Number(row.value_sf) || 0,
          rank_sf: row.rank_sf ? Number(row.rank_sf) : null,
        }
        ktcMap[normalized] = ktcMap[playerName]
      }
    }

    // Process dynasty rankings efficiently (handle errors gracefully), enriched with KTC
    let rankingsMap: Record<string, any> = {}
    if (
      rankingsResult?.data &&
      Array.isArray(rankingsResult.data) &&
      rankingsResult.data.length > 0
    ) {
      rankingsMap = rankingsResult.data.reduce((acc: any, player: any, index: number) => {
        const playerName = player.player_name
        if (playerName) {
          // Calculate rank from position in sorted list
          const rank = index + 1

          // Extract tier number from tier string (e.g., "Elite (Tier 1)" -> 1)
          let tierNum = 5 // Default
          if (player.tier) {
            const tierMatch = player.tier.match(/Tier (\d+)/)
            if (tierMatch) {
              tierNum = parseInt(tierMatch[1])
            } else if (player.tier.includes('Elite')) tierNum = 1
            else if (player.tier.includes('Star')) tierNum = 2
            else if (player.tier.includes('High-End Starter')) tierNum = 3
            else if (player.tier.includes('Solid Starter')) tierNum = 4
          }

          const playerRecord = {
            rank,
            position: player.position,
            team: player.team,
            name: playerName,
            headshot_url: player.headshot_url || null,
            espn_id: player.espn_id || null,
            total_score:
              typeof player.total_score === 'string'
                ? parseFloat(player.total_score)
                : player.total_score,
            tier: tierNum,
            tier_name: player.tier,
            ktc_value_sf:
              ktcMap[playerName]?.value_sf ?? ktcMap[normalizeName(playerName)]?.value_sf ?? null,
            ktc_rank_sf:
              ktcMap[playerName]?.rank_sf ?? ktcMap[normalizeName(playerName)]?.rank_sf ?? null,
          }
          acc[playerName] = playerRecord
          acc[normalizeName(playerName)] = playerRecord
        }
        return acc
      }, {})
    } else if (rankingsResult?.error) {
      console.warn('Rankings unavailable:', rankingsResult.error)
      // Continue without rankings - use default player values
    }

    // Backfill with KTC-only entries for players missing from dynasty rankings
    for (const [playerKey, ktc] of Object.entries(ktcMap)) {
      if (playerKey !== normalizeName(playerKey)) continue // Skip normalized aliases
      if (!rankingsMap[playerKey]) {
        rankingsMap[playerKey] = {
          rank: ktc.rank_sf || 999,
          position: '',
          team: '',
          name: playerKey,
          headshot_url: null,
          espn_id: null,
          total_score: null,
          tier: 5,
          tier_name: 'KTC',
          ktc_value_sf: ktc.value_sf,
          ktc_rank_sf: ktc.rank_sf,
        }
      }
    }

    // Fetch all transactions + traded picks across ALL leagues in parallel (was sequential).
    const currentYear = new Date().getFullYear()
    const weeksToFetch: number[] = []
    const maxWeek = 20
    for (let week = 0; week <= maxWeek; week++) weeksToFetch.push(week)

    console.log(`📊 Fetching multi-year transactions for leagues: ${leagueHistory.map((l) => l.leagueId).join(', ')}`)

    const batchSize = 5

    // Each league fetches its own transactions + picks concurrently
    const perLeagueResults = await Promise.all(
      leagueHistory.map(async (league) => {
        const txns: any[] = []
        for (let i = 0; i < weeksToFetch.length; i += batchSize) {
          const batch = weeksToFetch.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map((week) =>
              sleeperApi.getTransactions(league.leagueId, week).catch(() => [])
            )
          )
          for (const result of batchResults.flat() as any[]) {
            txns.push({
              ...(result as Record<string, any>),
              _leagueId: league.leagueId,
              _leagueSeason: league.season,
            })
          }
        }

        const picks = (await sleeperApi.getTradedPicks(league.leagueId).catch(() => [])) as any[]
        const taggedPicks = picks.map((pick) => ({
          ...pick,
          _leagueId: league.leagueId,
          _leagueSeason: league.season,
        }))

        return { txns, picks: taggedPicks }
      })
    )

    const allTransactions: any[] = []
    const tradedPicks: any[] = []
    for (const result of perLeagueResults) {
      allTransactions.push(...result.txns)
      tradedPicks.push(...result.picks)
    }

    // Filter transactions to only include trades
    const trades = allTransactions.filter((tx: any) => tx.type === 'trade')

    // Log transaction summary with dates
    if (trades.length > 0) {
      const tradeDates = trades
        .map((t: any) => new Date(t.created || t.status_updated))
        .sort((a, b) => b.getTime() - a.getTime())
      const mostRecentTrade = tradeDates[0]
      const oldestTrade = tradeDates[tradeDates.length - 1]
      console.log(
        `✅ Found ${trades.length} trades from ${oldestTrade.toLocaleDateString()} to ${mostRecentTrade.toLocaleDateString()}`
      )
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
        teamsByLeague,
        leagueHistory,
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
        fetchStrategy: 'full season weeks 0-20',
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
