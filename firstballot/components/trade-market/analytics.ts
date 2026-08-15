// Trade analytics: turns raw league transactions into the per-roster KPIs, league
// velocity, counterparty pairs and P&L series the market views render. Pure — the
// container memoizes one call and threads the result down.
import { getDraftPickValue, getGradeFromValue, type PlayerValue } from '@/lib/trade-utils'
import {
  PNL_COLORS,
  type CounterpartyPair,
  type LeagueVelocity,
  type MostTradedPlayer,
  type PnlPoint,
  type PnlSeries,
  type RosterKPI,
} from './types'
import { tradeTempo } from './utils'

export function computeTradeAnalytics(
  trades: any[],
  allPlayers: Record<string, any>,
  dynastyRankings: Record<string, any>,
  getTeamMeta: (leagueId: string | undefined, rosterId: number) => any,
  valuationCache: Map<string, PlayerValue>
) {
  const rosterMap: Record<
    number,
    {
      ownerName: string
      ownerAvatar?: string
      teamName: string
      totalTrades: number
      ktcGained: number
      ktcLost: number
      wins: number
      buyLows: { name: string; playerId?: string; delta: number }[]
      sellHighs: { name: string; playerId?: string; delta: number }[]
      events: { ts: number; net: number }[]
    }
  > = {}
  const counterpartyCount: Record<string, { pair: [string, string]; count: number; rosterIds: [number, number] }> = {}

  const allBuyLows: { name: string; playerId?: string; delta: number; ownerName: string }[] = []
  const allSellHighs: { name: string; playerId?: string; delta: number; ownerName: string }[] = []

  // Velocity + most-traded accumulators
  const allTimestamps: number[] = []
  const playerTradeCount: Record<string, MostTradedPlayer> = {}

  // Helper: get or compute valuation from cache
  const getValuation = (pid: string): PlayerValue | null => {
    if (valuationCache.has(pid)) return valuationCache.get(pid)!
    return null
  }

  // Helper: resolve a display name for a player id (valuation → Sleeper → id)
  const resolveName = (pid: string): string => {
    const pv = getValuation(pid)
    if (pv?.playerName) return pv.playerName
    const p = allPlayers?.[pid]
    if (p) {
      return p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || pid
    }
    return pid
  }

  for (const trade of trades) {
    const tradeLeagueId = trade._leagueId as string | undefined
    const rosterIds: number[] = Array.isArray(trade.roster_ids)
      ? trade.roster_ids
      : []
    const adds = trade.adds || {}
    const drops = trade.drops || {}
    const draftPicks: any[] = Array.isArray(trade.draft_picks)
      ? trade.draft_picks
      : []

    // Trade timestamp (Sleeper stores unix ms) for velocity
    const ts = Number(trade.created || trade.status_updated || 0)
    if (ts > 0) allTimestamps.push(ts)

    // Most-traded players: each entry in `adds` is a player changing hands once
    for (const pid of Object.keys(adds)) {
      if (!playerTradeCount[pid]) {
        playerTradeCount[pid] = { playerId: pid, name: resolveName(pid), count: 0 }
      }
      playerTradeCount[pid].count++
    }

    // Count counterparty pairs
    if (rosterIds.length === 2) {
      const [a, b] = rosterIds.sort((x, y) => x - y)
      const key = `${a}-${b}`
      if (!counterpartyCount[key]) {
        const nameA =
          getTeamMeta(tradeLeagueId, a)?.ownerName || `Roster ${a}`
        const nameB =
          getTeamMeta(tradeLeagueId, b)?.ownerName || `Roster ${b}`
        counterpartyCount[key] = {
          pair: [nameA, nameB],
          count: 0,
          rosterIds: [a, b],
        }
      }
      counterpartyCount[key].count++
    }

    for (const rosterId of rosterIds) {
      const meta = getTeamMeta(tradeLeagueId, rosterId)
      if (!rosterMap[rosterId]) {
        rosterMap[rosterId] = {
          ownerName: meta?.ownerName || `Roster ${rosterId}`,
          ownerAvatar: meta?.ownerAvatar,
          teamName: meta?.teamName || `Team ${rosterId}`,
          totalTrades: 0,
          ktcGained: 0,
          ktcLost: 0,
          wins: 0,
          buyLows: [],
          sellHighs: [],
          events: [],
        }
      }
      const rm = rosterMap[rosterId]
      rm.totalTrades++

      // Value received (adds)
      let valueIn = 0
      const receivedPlayers: PlayerValue[] = []
      for (const pid of Object.keys(adds)) {
        if (adds[pid] !== rosterId) continue
        const pv = getValuation(pid)
        if (pv) {
          valueIn += pv.value
          receivedPlayers.push(pv)
        }
      }
      // Picks received
      for (const pick of draftPicks) {
        if (pick.owner_id === rosterId && pick.previous_owner_id !== rosterId) {
          const pv = getDraftPickValue(pick.round, String(pick.season))
          valueIn += pv.finalValue
        }
      }

      // Value sent (drops)
      let valueOut = 0
      const sentPlayers: PlayerValue[] = []
      for (const pid of Object.keys(drops)) {
        if (drops[pid] !== rosterId) continue
        const pv = getValuation(pid)
        if (pv) {
          valueOut += pv.value
          sentPlayers.push(pv)
        }
      }
      // Picks sent
      for (const pick of draftPicks) {
        if (pick.previous_owner_id === rosterId && pick.owner_id !== rosterId) {
          const pv = getDraftPickValue(pick.round, String(pick.season))
          valueOut += pv.finalValue
        }
      }

      rm.ktcGained += valueIn
      rm.ktcLost += valueOut
      if (valueIn > valueOut) rm.wins++
      if (ts > 0) rm.events.push({ ts, net: valueIn - valueOut })

      // Per-player buy-low / sell-high
      for (const rp of receivedPlayers) {
        const delta = rp.value - valueOut / Math.max(receivedPlayers.length, 1)
        if (delta > 0) {
          rm.buyLows.push({ name: rp.playerName, playerId: rp.playerId, delta })
          allBuyLows.push({
            name: rp.playerName,
            playerId: rp.playerId,
            delta,
            ownerName: rm.ownerName,
          })
        }
      }
      for (const sp of sentPlayers) {
        const delta = valueIn / Math.max(sentPlayers.length, 1) - sp.value
        if (delta > 0) {
          rm.sellHighs.push({ name: sp.playerName, playerId: sp.playerId, delta })
          allSellHighs.push({
            name: sp.playerName,
            playerId: sp.playerId,
            delta,
            ownerName: rm.ownerName,
          })
        }
      }
    }
  }

  /* ── League trade velocity ──────────────────────────────────────── */
  const sortedTs = [...allTimestamps].sort((a, b) => a - b)
  const firstTs = sortedTs[0] ?? 0
  const lastTs = sortedTs[sortedTs.length - 1] ?? 0
  const spanDays = Math.max((lastTs - firstTs) / 86_400_000, 1)
  const totalTradeEvents = trades.length
  const perDay = totalTradeEvents / spanDays
  const avgGapDays = totalTradeEvents > 1 ? spanDays / (totalTradeEvents - 1) : 0

  // Busiest single calendar day (most trades in one UTC day)
  const dayBuckets: Record<string, number> = {}
  for (const ts of sortedTs) {
    const key = new Date(ts).toISOString().slice(0, 10)
    dayBuckets[key] = (dayBuckets[key] || 0) + 1
  }
  let busiestCount = 0
  let busiestLabel = '—'
  for (const [day, count] of Object.entries(dayBuckets)) {
    if (count > busiestCount) {
      busiestCount = count
      busiestLabel = new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const velocity: LeagueVelocity = {
    totalTrades: totalTradeEvents,
    spanDays,
    perDay,
    perWeek: perDay * 7,
    perMonth: perDay * 30,
    avgGapDays,
    busiestCount,
    busiestLabel,
  }

  // Per-owner trades/week, normalized into a 0–100 velocity score
  const spanWeeks = Math.max(spanDays / 7, 1 / 7)
  const rosterPerWeek: Record<number, number> = {}
  for (const [id, rm] of Object.entries(rosterMap)) {
    rosterPerWeek[Number(id)] = rm.totalTrades / spanWeeks
  }
  const maxPerWeek = Math.max(...Object.values(rosterPerWeek), 0.0001)

  const rosterKPIs: RosterKPI[] = Object.entries(rosterMap)
    .map(([id, rm]) => {
      const netKtc = rm.ktcGained - rm.ktcLost
      const bestBuyLow = rm.buyLows.sort((a, b) => b.delta - a.delta)[0] ?? null
      const bestSellHigh =
        rm.sellHighs.sort((a, b) => b.delta - a.delta)[0] ?? null
      const perWeek = rosterPerWeek[Number(id)] ?? 0
      const velocityScore = Math.round(Math.min(100, (perWeek / maxPerWeek) * 100))
      return {
        rosterId: Number(id),
        ownerName: rm.ownerName,
        teamName: rm.teamName,
        totalTrades: rm.totalTrades,
        ktcGained: Math.round(rm.ktcGained * 10) / 10,
        ktcLost: Math.round(rm.ktcLost * 10) / 10,
        netKtc: Math.round(netKtc * 10) / 10,
        winRate:
          rm.totalTrades > 0
            ? Math.round((rm.wins / rm.totalTrades) * 100)
            : 0,
        grade: getGradeFromValue(netKtc),
        velocityScore,
        tradesPerWeek: Math.round(perWeek * 10) / 10,
        tempo: tradeTempo(velocityScore).label,
        bestBuyLow,
        bestSellHigh,
      }
    })
    .sort((a, b) => b.netKtc - a.netKtc)

  const mostTradedPlayers: MostTradedPlayer[] = Object.values(playerTradeCount)
    .filter((p) => p.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  // Per-owner cumulative trade P&L over time (the "stock" lines)
  const pnlSeries: PnlSeries[] = Object.entries(rosterMap)
    .map(([id, rm], idx) => {
      const sorted = [...rm.events].sort((a, b) => a.ts - b.ts)
      const points: PnlPoint[] = []
      if (firstTs > 0) points.push({ ts: firstTs, value: 0 })
      let cum = 0
      for (const e of sorted) {
        cum += e.net
        points.push({ ts: e.ts, value: cum })
      }
      return {
        rosterId: Number(id),
        ownerName: rm.ownerName,
        ownerAvatar: rm.ownerAvatar,
        color: PNL_COLORS[idx % PNL_COLORS.length],
        final: Math.round(cum * 10) / 10,
        points,
      }
    })
    .sort((a, b) => b.final - a.final)

  const counterpartyPairs: CounterpartyPair[] = Object.values(counterpartyCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topBuyLows = allBuyLows.sort((a, b) => b.delta - a.delta).slice(0, 8)
  const topSellHighs = allSellHighs
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8)

  return { rosterKPIs, counterpartyPairs, topBuyLows, topSellHighs, velocity, mostTradedPlayers, pnlSeries }
}
