import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { TIER_KEY } from '@/lib/dynasty-tiers'
import { completeKtcDays, latestKtcDay } from '@/lib/platform/ktc-days'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase-server'
import { SLEEPER_CACHE, sleeperClient } from '@/lib/sleeper-sdk/client'
import { getCachedPlayers } from '@/lib/players-cache'
import { snapshot } from '@/lib/platform/snapshots'
import { tradeMarketSeasonKey } from '@/lib/platform/snapshot-keys'
import { trimForTrades } from '@/lib/trade-market/payload'
import { ktcDaysNeeded, tradeDateKtc } from '@/lib/trade-market/trade-date-values'
import { ktcIdsBySleeper } from '@/lib/platform/identity'

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

/** KTC id → KTC SF value, for each requested day. */
async function ktcValuesByDay(days: string[]) {
  const byDay: Record<string, Record<string, number>> = {}
  for (let i = 0; i < days.length; i += 8) {
    await Promise.all(
      days.slice(i, i + 8).map(async (day) => {
        const { data, error } = await supabaseAdmin
          .from('ktc_player_values')
          .select('ktc_player_id,value_sf')
          .eq('scraped_date', day)
          .limit(2000)
        if (error) throw new Error('KTC_HISTORY_UNAVAILABLE')
        byDay[day] = Object.fromEntries(
          (data ?? []).map((r) => [String(r.ktc_player_id), Number(r.value_sf)])
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
  ktcIds: Map<string, number>,
  ktcDays: string[]
) {
  return snapshot<SeasonData>(
    tradeMarketSeasonKey(league.leagueId),
    'Sleeper',
    current ? CURRENT_SEASON_TTL : PAST_SEASON_TTL,
    async () => {
      const [rosters, users] = await Promise.all([
        sleeperClient.getLeagueRosters(league.leagueId, SLEEPER_CACHE.rosters).catch(() => []),
        sleeperClient.getLeagueUsers(league.leagueId, SLEEPER_CACHE.fresh).catch(() => []),
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
            sleeperClient
              .getTransactions(league.leagueId, week, SLEEPER_CACHE.transactions)
              .catch(() => [])
          )
        )
        transactions.push(...(batch.flat() as any[]))
      }
      const picks = (await sleeperClient
        .getLeagueTradedPicks(league.leagueId, SLEEPER_CACHE.tradedPicks)
        .catch(() => [])) as any[]
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
          tradeDateKtc: tradeDateKtc(trades, ktcIds, ktcByDay, ktcDays),
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

type TierPayload = {
  players: { sf: Record<string, { rank: number; number: number; name: string }> }
  identity: Record<
    string,
    { name: string; position: string; team: string; espnId: string; ktcId?: number }
  >
}

/** Today's KTC by KTC id. */
async function latestKtcById() {
  const byId = new Map<number, { value_sf: number; rank_sf: number | null }>()
  // No freshness budget here, as before: Trade Market prices history, and today's value is one input.
  const latest = await latestKtcDay().catch(() => null)
  if (!latest) return byId
  const { data } = await supabaseServer
    .from('ktc_player_values')
    .select('ktc_player_id,value_sf,rank_sf')
    .eq('scraped_date', latest.date)
    .limit(2000)
  for (const row of data ?? [])
    byId.set(Number(row.ktc_player_id), {
      value_sf: Number(row.value_sf) || 0,
      rank_sf: row.rank_sf ? Number(row.rank_sf) : null,
    })
  return byId
}

/** One ranking record per tier-matched Sleeper id, in the shape the page reads. */
function rankingsBySleeper(
  payload: TierPayload,
  ktcToday: Map<number, { value_sf: number; rank_sf: number | null }>
) {
  return Object.fromEntries(
    Object.entries(payload.players.sf).flatMap(([id, tier]) => {
      const person = payload.identity[id]
      if (!person) return []
      const ktc = person.ktcId != null ? ktcToday.get(person.ktcId) : undefined
      return [
        [
          id,
          {
            rank: tier.rank,
            position: person.position,
            team: person.team,
            name: person.name,
            headshot_url: person.espnId
              ? `https://a.espncdn.com/i/headshots/nfl/players/full/${person.espnId}.png`
              : null,
            espn_id: person.espnId || null,
            // Trade valuation uses raw KTC; the old 13k-point model scale is gone.
            total_score: null,
            tier: tier.number,
            tier_name: `${tier.name} (Tier ${tier.number})`,
            ktc_value_sf: ktc?.value_sf ?? null,
            ktc_rank_sf: ktc?.rank_sf ?? null,
          },
        ],
      ]
    })
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')

    if (!leagueId) {
      return fail(400, 'League ID is required')
    }

    // Fetch FRESH NFL state (no cache) to ensure we get the latest week
    const nflState = await sleeperClient.getNflState(SLEEPER_CACHE.fresh)

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
      const leagueInfo = (await sleeperClient
        .getLeague(cursorLeagueId, SLEEPER_CACHE.league)
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

    // Players (6h cache), tiers, today's KTC and the complete KTC days, in parallel.
    const [allPlayers, tierRow, ktcToday, ktcDays, ktcIds] = await Promise.all([
      getCachedPlayers(),
      supabaseAdmin
        .from('data_snapshots')
        .select('payload,expires_at')
        .eq('key', TIER_KEY)
        .maybeSingle(),
      latestKtcById(),
      completeKtcDays(),
      ktcIdsBySleeper(),
    ])

    // Each season comes from its snapshot; only the current one refetches from Sleeper.
    const seasons = await Promise.all(
      leagueHistory.map((league, index) => leagueSeason(league, index === 0, ktcIds, ktcDays))
    )
    const teamsByLeague: Record<string, any[]> = {}
    leagueHistory.forEach((league, index) => {
      teamsByLeague[league.leagueId] = seasons[index].payload.teams
    })
    const teamsData = teamsByLeague[leagueId] || []

    // Rankings keyed by Sleeper id (PR-19): tier and today's KTC come through the tier
    // publish's KTC ↔ Sleeper match, never by display name. A player with no tier match
    // has no entry and is valued by rank, as before for unranked players.
    const tiersFresh =
      !tierRow.error && tierRow.data && Date.parse(tierRow.data.expires_at) > Date.now()
    if (!tiersFresh) console.warn('Rankings unavailable: current tiers expired or missing')
    const rankingsMap = tiersFresh
      ? rankingsBySleeper(tierRow.data!.payload as TierPayload, ktcToday)
      : {}

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
        // Only the players and rankings these trades reference (PR-16), keyed by Sleeper
        // id (PR-19). The old full, name-keyed payload (?v=1) is retired.
        ...trimForTrades(trades, allPlayers, rankingsMap),
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
        dataVersion: '3.0',
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
    return fail(500, 'Failed to fetch trade market data')
  }
}
