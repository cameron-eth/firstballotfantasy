import { NextRequest, NextResponse } from 'next/server'
import { KTC_DAY_MARKER_PREFIX, TIER_KEY } from '@/lib/dynasty-tiers'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase-server'
import { sleeperApi } from '@/lib/nextjs-cache'
import { getCachedPlayers } from '@/lib/players-cache'
import { snapshot } from '@/lib/platform/snapshots'
import { tradeMarketSeasonKey } from '@/lib/platform/snapshot-keys'
import { trimForTrades } from '@/lib/trade-market/payload'
import { ktcDaysNeeded, normalizeKtcName, tradeDateKtc } from '@/lib/trade-market/trade-date-values'

// Extend timeout for this route (fetching many weeks of transactions)
export const maxDuration = 60 // 60 seconds
export const dynamic = 'force-dynamic'

/** A finished season's trades never change; the current one refreshes with the dashboard. */
const CURRENT_SEASON_TTL = 15 * 60
const PAST_SEASON_TTL = 30 * 24 * 3600
const WEEKS = Array.from({ length: 21 }, (_, week) => week) // preseason (0) through week 20
const BATCH_SIZE = 5

type SeasonData = {
  teams: any[]
  trades: any[]
  picks: any[]
  transactionsAnalyzed: number
  /** transaction_id → player id → KTC SF value on the trade date (D4); absent before history. */
  tradeDateKtc: Record<string, Record<string, number>>
}

/** Complete KTC days, oldest first (marked by scripts/sync-ktc-values.mjs, PR-11). */
async function completeKtcDays(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('ingestion_runs')
    .select('dataset')
    .eq('status', 'success')
    .like('dataset', `${KTC_DAY_MARKER_PREFIX}%`)
    .limit(5000)
  if (error) throw new Error('KTC_DAYS_UNAVAILABLE')
  return [...new Set((data ?? []).map((r) => r.dataset.slice(KTC_DAY_MARKER_PREFIX.length)))].sort()
}

/** Normalized player name → KTC SF value, for each requested day. */
async function ktcValuesByDay(days: string[]) {
  const byDay: Record<string, Record<string, number>> = {}
  for (let i = 0; i < days.length; i += 8) {
    await Promise.all(
      days.slice(i, i + 8).map(async (day) => {
        const { data, error } = await supabaseAdmin
          .from('ktc_player_values')
          .select('player_name,value_sf')
          .eq('scraped_date', day)
          .limit(2000)
        if (error) throw new Error('KTC_HISTORY_UNAVAILABLE')
        byDay[day] = Object.fromEntries(
          (data ?? []).map((r) => [normalizeKtcName(r.player_name), Number(r.value_sf)])
        )
      })
    )
  }
  return byDay
}

/**
 * One league season's teams, trades and traded picks, snapshotted (PR-16): about 25
 * Sleeper calls per season ran on every page load before.
 */
function leagueSeason(
  league: { leagueId: string; season: string },
  current: boolean,
  players: Record<string, any>,
  ktcDays: string[]
) {
  return snapshot<SeasonData>(
    tradeMarketSeasonKey(league.leagueId),
    'Sleeper',
    current ? CURRENT_SEASON_TTL : PAST_SEASON_TTL,
    async () => {
      const [rosters, users] = await Promise.all([
        sleeperApi.getLeagueRosters(league.leagueId).catch(() => []),
        fetch(`https://api.sleeper.app/v1/league/${league.leagueId}/users`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => []),
      ])
      const teams = (rosters as any[]).map((roster: any) => {
        const owner = roster.owner_id
          ? (users as any[]).find((u: any) => u?.user_id === roster.owner_id)
          : null
        return {
          rosterId: roster.roster_id,
          teamName:
            owner?.metadata?.team_name ||
            owner?.display_name ||
            owner?.first_name ||
            `Team ${roster.roster_id}`,
          ownerName: owner?.display_name || 'Unknown',
          ownerAvatar: owner?.avatar || undefined,
          ownerUsername: owner?.display_name || 'Unknown',
          ownerId: roster.owner_id,
          leagueId: league.leagueId,
          season: league.season,
        }
      })
      const transactions: any[] = []
      for (let i = 0; i < WEEKS.length; i += BATCH_SIZE) {
        const batch = await Promise.all(
          WEEKS.slice(i, i + BATCH_SIZE).map((week) =>
            sleeperApi.getTransactions(league.leagueId, week).catch(() => [])
          )
        )
        transactions.push(...(batch.flat() as any[]))
      }
      const picks = (await sleeperApi.getTradedPicks(league.leagueId).catch(() => [])) as any[]
      const tag = (row: Record<string, any>) => ({
        ...row,
        _leagueId: league.leagueId,
        _leagueSeason: league.season,
      })
      const trades: any[] = transactions.filter((tx) => tx.type === 'trade').map(tag)
      const ktcByDay = await ktcValuesByDay(ktcDaysNeeded(trades, ktcDays))
      return {
        payload: {
          teams,
          trades,
          picks: picks.map(tag),
          transactionsAnalyzed: transactions.length,
          tradeDateKtc: tradeDateKtc(trades, players, ktcByDay, ktcDays),
        },
        season: Number(league.season) || undefined,
      }
    },
    (p) =>
      Array.isArray(p?.teams) &&
      Array.isArray(p.trades) &&
      Array.isArray(p.picks) &&
      typeof p.tradeDateKtc === 'object'
  )
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')
    const fullPayload = searchParams.get('v') === '1'

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
    const [allPlayers, rankingsResult, ktcResult, ktcDays] = (await Promise.all([
      getCachedPlayers(),
      (async () => {
        try {
          const result = await supabaseAdmin.from('data_snapshots')
            .select('payload,expires_at').eq('key', TIER_KEY).maybeSingle()
          if (result.error || !result.data || Date.parse(result.data.expires_at) <= Date.now())
            return { data: [], error: new Error('Current tiers unavailable') }
          const payload = result.data.payload as {
            players: { sf: Record<string, { rank: number; number: number; name: string }> }
            identity: Record<string, { name: string; position: string; team: string; espnId: string }>
          }
          const data = Object.entries(payload.players.sf).flatMap(([id, tier]) => {
            const person = payload.identity[id]
            return person ? [{ player_name: person.name, position: person.position,
              // Trade valuation uses raw KTC; its older 13k-point model scale is incompatible
              // with the new 0–100 tier score.
              team: person.team, espn_id: person.espnId, total_score: null,
              tier: `${tier.name} (Tier ${tier.number})`, rank: tier.rank,
              headshot_url: person.espnId ? `https://a.espncdn.com/i/headshots/nfl/players/full/${person.espnId}.png` : null,
            }] : []
          }).sort((a, b) => a.rank - b.rank)
          return { data, error: null }
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
      completeKtcDays(),
    ])) as [Record<string, any>, any, any, string[]]

    // Each season comes from its snapshot; only the current one refetches from Sleeper.
    const seasons = await Promise.all(
      leagueHistory.map((league, index) => leagueSeason(league, index === 0, allPlayers, ktcDays))
    )
    const teamsByLeague: Record<string, any[]> = {}
    leagueHistory.forEach((league, index) => {
      teamsByLeague[league.leagueId] = seasons[index].payload.teams
    })
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
          const rank = player.rank ?? index + 1

          // Extract tier number from tier string (e.g., "Elite (Tier 1)" -> 1)
          let tierNum: number | null = null
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
          tier: null,
          tier_name: 'Unranked',
          ktc_value_sf: ktc.value_sf,
          ktc_rank_sf: ktc.rank_sf,
        }
      }
    }

    const currentYear = new Date().getFullYear()
    const trades = seasons.flatMap((season) => season.payload.trades)
    const tradedPicks = seasons.flatMap((season) => season.payload.picks)
    const totalTransactionsAnalyzed = seasons.reduce(
      (sum, season) => sum + season.payload.transactionsAnalyzed,
      0
    )

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
        // Only the players and rankings these trades reference (PR-16); ?v=1 keeps the
        // old full payload for one release.
        ...(fullPayload
          ? { allPlayers, dynastyRankings: rankingsMap }
          : trimForTrades(trades, allPlayers, rankingsMap)),
        transactions: trades,
        tradedPicks,
        // D4: trade-date KTC per trade and player, and the first day prices exist.
        tradeDateKtc: Object.assign({}, ...seasons.map((season) => season.payload.tradeDateKtc)),
        priceHistoryFrom: ktcDays[0] ?? null,
        totalTrades: trades.length,
        totalTradedPicks: tradedPicks.length,
        totalTeams: teamsData.length,
        currentWeek,
        lastUpdated: new Date().toISOString(),
        dataVersion: fullPayload ? '1.2' : '2.0',
        weeksAnalyzed: WEEKS,
        totalTransactionsAnalyzed,
        yearAnalyzed: currentYear,
        includesPreseason: true,
        fetchStrategy: 'full season weeks 0-20',
        batchSize: BATCH_SIZE,
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
