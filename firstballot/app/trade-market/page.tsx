'use client'

import { useEffect, useMemo, useState, Suspense, useCallback } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Activity, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { leagueCache } from '@/lib/league-cache'
import { useLeagueContext } from '@/lib/league-context'
import {
  processPlayerForTrade,
  getDraftPickValue,
  getGradeFromValue,
  formatValue,
  GRADE_COLORS,
} from '@/lib/trade-utils'
import type { PlayerValue } from '@/lib/trade-utils'

/* ─── helpers ──────────────────────────────────────────────────────────── */

function inWeekRange(week: number, weekRange: string): boolean {
  if (weekRange === 'all') return true
  const [start, end] = weekRange.split('-').map((x) => Number(x))
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true
  return week >= start && week <= end
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveHeadshot(
  playerName: string,
  playerId: string | null | undefined,
  allPlayers: Record<string, any>,
  dynastyRankings: Record<string, any>
): string | null {
  const ranking =
    dynastyRankings[playerName] || dynastyRankings[normalizeName(playerName)]
  if (ranking?.headshot_url) return ranking.headshot_url
  if (ranking?.espn_id)
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${ranking.espn_id}.png`
  const raw = playerId ? allPlayers[playerId] : null
  if (raw?.espn_id)
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${raw.espn_id}.png`
  return null
}

function gradeColor(grade: string) {
  return GRADE_COLORS[grade as keyof typeof GRADE_COLORS] ?? 'bg-secondary text-muted-foreground border-border'
}

/** Map a 0–100 velocity score to a tempo label + color. */
function tradeTempo(score: number): { label: string; color: string; bar: string } {
  if (score >= 80) return { label: 'Wheeler-Dealer', color: 'text-fuchsia-400', bar: 'bg-fuchsia-400' }
  if (score >= 55) return { label: 'Active', color: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 30) return { label: 'Steady', color: 'text-blue-400', bar: 'bg-blue-400' }
  if (score >= 12) return { label: 'Occasional', color: 'text-yellow-400', bar: 'bg-yellow-400' }
  return { label: 'Dormant', color: 'text-muted-foreground', bar: 'bg-muted-foreground/50' }
}

function formatGap(days: number): string {
  if (!days || !isFinite(days)) return '—'
  if (days < 1) return `${Math.round(days * 24)}h`
  if (days < 14) return `${days.toFixed(1)}d`
  if (days < 60) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}

/* ─── TransitivePlayerCard ─────────────────────────────────────────────── */

function TransitivePlayerCard({
  playerId,
  playerName,
  allPlayers,
  dynastyRankings,
  cachedValuation,
}: {
  playerId?: string | null
  playerName: string
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  cachedValuation?: PlayerValue | null
}) {
  const [imageError, setImageError] = useState(false)
  const rawPlayer = playerId ? allPlayers[playerId] : null
  const rankingEntry =
    dynastyRankings[playerName] || dynastyRankings[normalizeName(playerName)]
  const valuation = cachedValuation ?? null
  const headshot = resolveHeadshot(playerName, playerId, allPlayers, dynastyRankings)
  const initials = playerName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="rounded-lg border border-border bg-card/90 overflow-hidden">
      <div className="relative h-28 bg-secondary/20">
        {!imageError && headshot ? (
          <Image
            src={headshot}
            alt={playerName}
            fill
            className="object-contain object-bottom"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground/30">
            {initials}
          </div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <div className="text-sm font-semibold leading-tight truncate">
          {playerName}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {(rawPlayer?.position ||
            rankingEntry?.position ||
            valuation?.position ||
            'FLEX') +
            ' · ' +
            (rawPlayer?.team || rankingEntry?.team || 'NFL')}
      </div>
        <div className="text-[11px] font-mono text-blue-400">
          Value{' '}
          {valuation?.value != null ? valuation.value.toFixed(1) : '--'}
        </div>
      </div>
    </div>
  )
}

/* ─── Prospect-style card for buy-low / sell-high ────────────────────── */

function TradePlayerCard({
  name,
  playerId,
  delta,
  ownerName,
  type,
  allPlayers,
  dynastyRankings,
  cachedValuation,
}: {
  name: string
  playerId?: string | null
  delta: number
  ownerName: string
  type: 'buy-low' | 'sell-high'
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  cachedValuation?: PlayerValue | null
}) {
  const [imageError, setImageError] = useState(false)
  const headshot = resolveHeadshot(name, playerId, allPlayers, dynastyRankings)
  const rawPlayer = playerId ? allPlayers[playerId] : null
  const rankingEntry =
    dynastyRankings[name] || dynastyRankings[normalizeName(name)]
  const position = rawPlayer?.position || rankingEntry?.position || cachedValuation?.position || 'FLEX'
  const team = rawPlayer?.team || rankingEntry?.team || cachedValuation?.team || 'NFL'
  const value = cachedValuation?.value ?? 0
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isBuyLow = type === 'buy-low'
  const deltaColor = isBuyLow ? 'text-emerald-400' : 'text-blue-400'
  const deltaBg = isBuyLow
    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'

  return (
    <div className="group relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300">
      {/* Position badge — top-left */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-lg font-mono font-bold text-primary drop-shadow-lg">
          {position}
        </span>
      </div>

      {/* Delta badge — top-right */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${deltaBg}`}
        >
          +{delta.toFixed(1)}
        </span>
      </div>

      {/* Image area */}
      <div className="relative h-32 bg-secondary/30 flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-[1]" />
        {!imageError && headshot ? (
          <Image
            src={headshot}
            alt={name}
            width={120}
            height={120}
            className="object-contain object-bottom scale-110 group-hover:scale-115 transition-transform duration-500 relative z-0"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground/20">
              {initials}
            </span>
        </div>
        )}
        {/* Owner badge — bottom of image */}
        <div className="absolute bottom-1.5 left-2 z-10">
          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-secondary/80 text-muted-foreground border border-border/50 backdrop-blur-sm">
            {ownerName}
          </span>
        </div>
      </div>

      {/* Info area */}
      <div className="p-3">
        <h3 className="font-mono text-sm font-bold text-foreground tracking-tight truncate mb-0.5">
          {name}
        </h3>
        <p className="text-[10px] text-muted-foreground mb-2">{team}</p>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-primary">
              {value.toFixed(1)}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">
              Val
            </span>
        </div>
          <div className={`text-xs font-mono font-bold ${deltaColor}`}>
            +{delta.toFixed(1)}
            <span className="text-[9px] ml-0.5 opacity-70">
              {isBuyLow ? 'surplus' : 'profit'}
            </span>
      </div>
        </div>
      </div>
    </div>
  )
}

/* ─── TradeMarketClock ─────────────────────────────────────────────────── */

function TradeMarketClock() {
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="font-mono text-sm text-muted-foreground">
      {time ? time.toLocaleTimeString() : '\u00A0'} EST
    </div>
  )
}

/* ─── types for analytics ──────────────────────────────────────────────── */

interface RosterKPI {
  rosterId: number
  ownerName: string
  teamName: string
  totalTrades: number
  ktcGained: number
  ktcLost: number
  netKtc: number
  winRate: number
  grade: string
  velocityScore: number
  tradesPerWeek: number
  tempo: string
  bestBuyLow: { name: string; playerId?: string; delta: number } | null
  bestSellHigh: { name: string; playerId?: string; delta: number } | null
}

interface MostTradedPlayer {
  playerId?: string
  name: string
  count: number
}

interface LeagueVelocity {
  totalTrades: number
  spanDays: number
  perDay: number
  perWeek: number
  perMonth: number
  avgGapDays: number
  busiestCount: number
  busiestLabel: string
}

interface CounterpartyPair {
  pair: [string, string]
  count: number
  rosterIds: [number, number]
}

interface PnlPoint {
  ts: number
  value: number
}

interface PnlSeries {
  rosterId: number
  ownerName: string
  ownerAvatar?: string
  color: string
  final: number
  points: PnlPoint[]
}

// Distinct line colors for the trade P&L "stock" chart
const PNL_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#22d3ee',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#facc15', '#4ade80',
]

/* ─── computeTradeAnalytics (pure function) ─────────────────────────── */

function computeTradeAnalytics(
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

/* ─── MostTradedCard ─────────────────────────────────────────────────── */

function MostTradedCard({
  player,
  rank,
  allPlayers,
  dynastyRankings,
}: {
  player: MostTradedPlayer
  rank: number
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}) {
  const [imageError, setImageError] = useState(false)
  const headshot = resolveHeadshot(player.name, player.playerId, allPlayers, dynastyRankings)
  const ranking =
    dynastyRankings[player.name] || dynastyRankings[normalizeName(player.name)]
  const raw = player.playerId ? allPlayers[player.playerId] : null
  const position = ranking?.position || raw?.position || ''
  const team = ranking?.team || raw?.team || ''
  const initials = player.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/40 via-card to-card transition-colors hover:border-blue-500/40">
      <span className="absolute top-2 right-2.5 z-10 text-[10px] font-mono text-muted-foreground">
        #{rank}
      </span>
      <div className="flex items-stretch gap-3 h-24">
        {/* Headshot */}
        <div className="relative w-24 flex-shrink-0 bg-gradient-to-b from-secondary/30 to-transparent">
          {!imageError && headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headshot}
              alt={player.name}
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-base font-mono text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex min-w-0 flex-col justify-center py-2 pr-3">
          <div className="truncate text-sm font-bold leading-tight text-foreground">
            {player.name}
          </div>
          {(position || team) && (
            <div className="mb-1.5 truncate text-[10px] font-mono uppercase text-muted-foreground">
              {position}
              {position && team ? ' · ' : ''}
              {team}
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black leading-none text-blue-400">
              {player.count}×
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">traded</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── TradePnLChart (stock-market view) ──────────────────────────────── */

function TradePnLChart({ series }: { series: PnlSeries[] }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [hover, setHover] = useState<number | null>(null)

  const W = 760
  const H = 340
  const padL = 62
  const padR = 18
  const padT = 16
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const visible = series.filter((s) => !hidden.has(s.rosterId))

  const { minTs, maxTs, minVal, maxVal } = useMemo(() => {
    let minTs = Infinity
    let maxTs = -Infinity
    let minVal = 0
    let maxVal = 0
    const src = visible.length ? visible : series
    for (const s of src) {
      for (const p of s.points) {
        if (p.ts < minTs) minTs = p.ts
        if (p.ts > maxTs) maxTs = p.ts
        if (p.value < minVal) minVal = p.value
        if (p.value > maxVal) maxVal = p.value
      }
    }
    if (!isFinite(minTs)) {
      minTs = 0
      maxTs = 1
    }
    if (maxVal === minVal) maxVal = minVal + 1
    return { minTs, maxTs, minVal, maxVal }
  }, [visible, series])

  const fx = (ts: number) => padL + ((ts - minTs) / Math.max(maxTs - minTs, 1)) * plotW
  const fy = (v: number) => padT + (1 - (v - minVal) / Math.max(maxVal - minVal, 1)) * plotH

  const yTicks = useMemo(() => {
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => minVal + ((maxVal - minVal) * i) / steps)
  }, [minVal, maxVal])

  const xTicks = useMemo(() => {
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => minTs + ((maxTs - minTs) * i) / steps)
  }, [minTs, maxTs])

  const toggle = (id: number) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (series.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
        No trade activity to chart in this window
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trade P&L over time">
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => {
          const isZero = Math.abs(t) < 1e-6
          return (
            <g key={`y-${i}`}>
              <line
                x1={padL}
                y1={fy(t)}
                x2={W - padR}
                y2={fy(t)}
                stroke={isZero ? '#475569' : '#1e293b'}
                strokeWidth={1}
                strokeDasharray={isZero ? '' : '2 3'}
              />
              <text x={padL - 8} y={fy(t) + 3} textAnchor="end" fontSize={9} className="font-mono" fill="#64748b">
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          )
        })}
        {/* x labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x-${i}`}
            x={fx(t)}
            y={H - padB + 16}
            textAnchor="middle"
            fontSize={9}
            className="font-mono"
            fill="#64748b"
          >
            {new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </text>
        ))}
        {/* P&L lines */}
        {visible.map((s) => {
          const dim = hover !== null && hover !== s.rosterId
          const pts = s.points.map((p) => `${fx(p.ts)},${fy(p.value)}`).join(' ')
          return (
            <polyline
              key={s.rosterId}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.rosterId ? 2.5 : 1.5}
              opacity={dim ? 0.18 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          )
        })}
        {/* Transparent hit areas — let the user hover the line itself */}
        {visible.map((s) => {
          const pts = s.points.map((p) => `${fx(p.ts)},${fy(p.value)}`).join(' ')
          return (
            <polyline
              key={`hit-${s.rosterId}`}
              points={pts}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHover(s.rosterId)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        {/* endpoints — avatar bubble on hover, dot otherwise */}
        {visible.map((s) => {
          const last = s.points[s.points.length - 1]
          if (!last) return null
          const isHover = hover === s.rosterId
          const dim = hover !== null && !isHover
          const cx = fx(last.ts)
          const cy = fy(last.value)

          if (isHover && s.ownerAvatar) {
            const R = 15
            const clipId = `pnl-clip-${s.rosterId}`
            return (
              <g key={`end-${s.rosterId}`} style={{ pointerEvents: 'none' }}>
                <clipPath id={clipId}>
                  <circle cx={cx} cy={cy} r={R} />
                </clipPath>
                <circle cx={cx} cy={cy} r={R + 2} fill="#0f172a" stroke={s.color} strokeWidth={2} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <image
                  href={`https://sleepercdn.com/avatars/${s.ownerAvatar}`}
                  x={cx - R}
                  y={cy - R}
                  width={R * 2}
                  height={R * 2}
                  clipPath={`url(#${clipId})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <text
                  x={cx - R - 6}
                  y={cy + 3}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={700}
                  className="font-mono"
                  fill={s.color}
                >
                  {s.ownerName}
                </text>
              </g>
            )
          }

          return (
            <circle
              key={`end-${s.rosterId}`}
              cx={cx}
              cy={cy}
              r={isHover ? 4 : 2.5}
              fill={s.color}
              opacity={dim ? 0.18 : 1}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}
      </svg>

      {/* Legend — click to toggle, hover to highlight */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {series.map((s) => {
          const off = hidden.has(s.rosterId)
          return (
            <button
              key={s.rosterId}
              type="button"
              onClick={() => toggle(s.rosterId)}
              onMouseEnter={() => setHover(s.rosterId)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors hover:border-foreground/40 ${
                off ? 'border-border/40 opacity-40' : 'border-border'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-foreground">{s.ownerName}</span>
              <span className={s.final >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatValue(s.final)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── MarketOverviewTab ──────────────────────────────────────────────── */

function MarketOverviewTab({
  rosterKPIs,
  topBuyLows,
  topSellHighs,
  allPlayers,
  dynastyRankings,
  valuationCache,
  velocity,
}: {
  rosterKPIs: RosterKPI[]
  topBuyLows: { name: string; playerId?: string; delta: number; ownerName: string }[]
  topSellHighs: { name: string; playerId?: string; delta: number; ownerName: string }[]
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  valuationCache: Map<string, PlayerValue>
  velocity: LeagueVelocity
}) {
  const velocityCards: { label: string; value: string; sub: string; accent: string }[] = [
    {
      label: 'Trades / Week',
      value: velocity.perWeek >= 10 ? velocity.perWeek.toFixed(0) : velocity.perWeek.toFixed(1),
      sub: 'league pace',
      accent: 'text-blue-400',
    },
    {
      label: 'Trades / Month',
      value: velocity.perMonth >= 10 ? velocity.perMonth.toFixed(0) : velocity.perMonth.toFixed(1),
      sub: `${velocity.perDay.toFixed(2)}/day`,
      accent: 'text-foreground',
    },
    {
      label: 'Avg Gap',
      value: formatGap(velocity.avgGapDays),
      sub: 'between trades',
      accent: 'text-foreground',
    },
    {
      label: 'Busiest Day',
      value: velocity.busiestCount > 0 ? `${velocity.busiestCount}` : '—',
      sub: velocity.busiestLabel,
      accent: 'text-fuchsia-400',
    },
    {
      label: 'Active Span',
      value: velocity.spanDays >= 365 ? `${(velocity.spanDays / 365).toFixed(1)}y` : `${Math.round(velocity.spanDays)}d`,
      sub: `${velocity.totalTrades} trades`,
      accent: 'text-foreground',
    },
  ]

  return (
    <div className="space-y-6">
      {/* League Trade Velocity */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          League Trade Velocity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {velocityCards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-border bg-card/60 px-3 py-2.5"
            >
              <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
                {c.label}
              </div>
              <div className={`text-2xl font-black font-mono leading-none ${c.accent}`}>
                {c.value}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Roster KPI Table */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Roster Trade Performance
        </h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3">Manager</th>
                <th className="text-right px-4 py-3">Trades</th>
                <th className="text-right px-4 py-3">KTC Gained</th>
                <th className="text-right px-4 py-3">KTC Lost</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-right px-4 py-3">Win %</th>
                <th className="text-center px-4 py-3">Grade</th>
                <th className="text-left px-4 py-3">Best Buy Low</th>
                <th className="text-left px-4 py-3">Best Sell High</th>
              </tr>
            </thead>
            <tbody>
              {rosterKPIs.map((r) => (
                <tr
                  key={r.rosterId}
                  className="border-b border-border/50 hover:bg-secondary/10"
                >
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {r.ownerName}
                  </td>
                  <td className="text-right px-4 py-3">{r.totalTrades}</td>
                  <td className="text-right px-4 py-3 text-emerald-400">
                    +{r.ktcGained}
                  </td>
                  <td className="text-right px-4 py-3 text-red-400">
                    -{r.ktcLost}
                  </td>
                  <td
                    className={`text-right px-4 py-3 font-bold ${r.netKtc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {formatValue(r.netKtc)}
                  </td>
                  <td className="text-right px-4 py-3">{r.winRate}%</td>
                  <td className="text-center px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold border ${gradeColor(r.grade)}`}
                    >
                      {r.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.bestBuyLow ? (
                      <span>
                        {r.bestBuyLow.name}{' '}
                        <span className="text-emerald-400">
                          +{r.bestBuyLow.delta.toFixed(1)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.bestSellHigh ? (
                      <span>
                        {r.bestSellHigh.name}{' '}
                        <span className="text-blue-400">
                          +{r.bestSellHigh.delta.toFixed(1)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {rosterKPIs.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No trade data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
              </div>
      </section>

      {/* Buy Lows */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          All-Time Best Buy Lows
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topBuyLows.map((bl, idx) => (
            <TradePlayerCard
              key={`${bl.playerId || bl.name}-${bl.ownerName}-${idx}`}
              name={bl.name}
              playerId={bl.playerId}
              delta={bl.delta}
              ownerName={bl.ownerName}
              type="buy-low"
              allPlayers={allPlayers}
              dynastyRankings={dynastyRankings}
              cachedValuation={bl.playerId ? valuationCache.get(bl.playerId) ?? null : null}
            />
              ))}
            </div>
        {topBuyLows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No buy-low data
          </div>
        )}
      </section>

      {/* Sell Highs */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          All-Time Best Sell Highs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topSellHighs.map((sh, idx) => (
            <TradePlayerCard
              key={`${sh.playerId || sh.name}-${sh.ownerName}-${idx}`}
              name={sh.name}
              playerId={sh.playerId}
              delta={sh.delta}
              ownerName={sh.ownerName}
              type="sell-high"
              allPlayers={allPlayers}
              dynastyRankings={dynastyRankings}
              cachedValuation={sh.playerId ? valuationCache.get(sh.playerId) ?? null : null}
            />
          ))}
    </div>
        {topSellHighs.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No sell-high data
          </div>
        )}
      </section>
    </div>
  )
}

/* ─── MarketTrendsTab (stock-market view + toggle) ───────────────────── */

function MarketTrendsTab({
  mostTradedPlayers,
  pnlSeries,
  counterpartyPairs,
  rosterKPIs,
  totalTrades,
  allPlayers,
  dynastyRankings,
}: {
  mostTradedPlayers: MostTradedPlayer[]
  pnlSeries: PnlSeries[]
  counterpartyPairs: CounterpartyPair[]
  rosterKPIs: RosterKPI[]
  totalTrades: number
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}) {
  const [view, setView] = useState<'value' | 'activity'>('value')

  const velocityLeaders = useMemo(
    () =>
      [...rosterKPIs]
        .filter((r) => r.totalTrades > 0)
        .sort((a, b) => b.velocityScore - a.velocityScore)
        .slice(0, 8),
    [rosterKPIs]
  )

  return (
    <div className="space-y-6">
      {/* Most Traded Players — pinned at top */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Most Traded Players
        </h2>
        {mostTradedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mostTradedPlayers.map((p, idx) => (
              <MostTradedCard
                key={`${p.playerId || p.name}-${idx}`}
                player={p}
                rank={idx + 1}
                allPlayers={allPlayers}
                dynastyRankings={dynastyRankings}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No repeat-traded players in this window
          </div>
        )}
      </section>

      {/* Segmented toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {view === 'value' ? 'Trade Value Trends' : 'League Activity'}
        </h2>
        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          {(
            [
              { key: 'value' as const, label: 'Value Trends' },
              { key: 'activity' as const, label: 'Activity' },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setView(opt.key)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md transition-colors ${
                view === opt.key
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'value' ? (
        <section>
          <p className="text-[11px] text-muted-foreground font-mono mb-3">
            Cumulative net KTC gained or lost through trades — each owner is a &ldquo;stock&rdquo;. Click a name to toggle, hover to highlight.
          </p>
          <TradePnLChart series={pnlSeries} />
        </section>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <section>
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Trading Partners (Most Frequent)
            </h3>
            <div className="rounded-lg border border-border bg-card/60 divide-y divide-border">
              {counterpartyPairs.map((cp) => (
                <div
                  key={`${cp.rosterIds[0]}-${cp.rosterIds[1]}`}
                  className="p-3 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{cp.pair[0]}</span>
                    <span className="text-muted-foreground mx-1.5">⇄</span>
                    <span className="font-semibold text-foreground">{cp.pair[1]}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {cp.count} trade{cp.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {counterpartyPairs.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No counterparty data
                </div>
              )}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Trade Velocity Leaderboard
            </h3>
            <div className="rounded-lg border border-border bg-card/60 divide-y divide-border">
              {velocityLeaders.map((r) => {
                const tempo = tradeTempo(r.velocityScore)
                const pct =
                  totalTrades > 0 ? Math.round((r.totalTrades / totalTrades) * 100) : 0
                return (
                  <div key={r.rosterId} className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {r.ownerName}
                        </div>
                        <div className={`text-[11px] font-mono ${tempo.color}`}>{tempo.label}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-base font-mono font-black text-foreground">
                          {r.velocityScore}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {r.tradesPerWeek}/wk · {pct}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tempo.bar}`}
                        style={{ width: `${Math.max(r.velocityScore, 3)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {velocityLeaders.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No trade activity
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/* ─── TransitivePathsTab ────────────────────────────────────────────── */

const CHAINS_PER_PAGE = 20

function TransitivePathsTab({
  transitiveChains,
  transitiveSeed,
  setTransitiveSeed,
  transitiveSeedOptions,
  allPlayers,
  dynastyRankings,
  valuationCache,
}: {
  transitiveChains: any[]
  transitiveSeed: string
  setTransitiveSeed: (v: string) => void
  transitiveSeedOptions: string[]
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  valuationCache: Map<string, PlayerValue>
}) {
  const [page, setPage] = useState(0)

  // Reset page when seed changes
  const handleSeedChange = useCallback(
    (v: string) => {
      setTransitiveSeed(v)
      setPage(0)
    },
    [setTransitiveSeed]
  )

  const totalPages = Math.max(1, Math.ceil(transitiveChains.length / CHAINS_PER_PAGE))
  const pageChains = useMemo(
    () =>
      transitiveChains.slice(
        page * CHAINS_PER_PAGE,
        (page + 1) * CHAINS_PER_PAGE
      ),
    [transitiveChains, page]
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground font-mono">
            Trace how assets moved and transformed over time across linked
            leagues.
        </div>
          <select
            value={transitiveSeed}
            onChange={(e) => handleSeedChange(e.target.value)}
            className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono min-w-[240px]"
          >
            <option value="all">All recent paths</option>
            {transitiveSeedOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {pageChains.map((chain) => (
          <div
            key={chain.id}
            className="rounded-lg border border-border bg-card p-3 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-secondary/50 border border-border">
                  Root: {chain.root}
                </span>
                <span className="text-muted-foreground/90">
                  {chain.lastDateLabel}
                </span>
        </div>
              <span className="text-blue-400">{chain.hops.length} hop(s)</span>
      </div>

            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {chain.nodes.map((nodeName: string, idx: number) => (
                  <div key={`${chain.id}-${nodeName}-${idx}`} className="contents">
                    <div className="w-44">
                      <TransitivePlayerCard
                        playerId={chain.nodeIds[idx]}
                        playerName={nodeName}
                        allPlayers={allPlayers}
                        dynastyRankings={dynastyRankings}
                        cachedValuation={chain.nodeIds[idx] ? valuationCache.get(chain.nodeIds[idx]) ?? null : null}
                      />
        </div>
                    {idx < chain.nodes.length - 1 && (
                      <div className="px-1 flex flex-col items-center justify-center">
                        <span className="text-blue-400 font-mono text-[10px]">
                          →
                        </span>
                      </div>
                    )}
                  </div>
                ))}
        </div>
      </div>

            <div className="text-[11px] text-muted-foreground">
              Owners: {chain.owners.join(', ')} | Counterparties:{' '}
              {chain.counterparties.join(' • ')}
        </div>
        </div>
        ))}
        {pageChains.length === 0 && (
          <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground md:col-span-2">
            No transitive links found for this seed under current filters.
      </div>
        )}
    </div>

      {/* Pagination */}
      {transitiveChains.length > CHAINS_PER_PAGE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            Page {page + 1} of {totalPages} ({transitiveChains.length} paths)
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── useTransitiveChains hook ──────────────────────────────────────── */

interface TransitiveEdge {
  id: string
  transactionId: string
  season: string
  leagueId?: string
  from: string
  fromId?: string
  to: string
  toId?: string
  timestamp: number
  week: number
  dateLabel: string
  rosterId: number
  ownerName: string
  counterparty: string
}

interface TransitiveChain {
  id: string
  root: string
  nodes: string[]
  nodeIds: (string | undefined)[]
  hops: TransitiveEdge[]
  lastTimestamp: number
  lastDateLabel: string
  owners: string[]
  counterparties: string[]
}

function useTransitiveChains(
  filteredTransactions: any[],
  allPlayers: Record<string, any>,
  getTeamMeta: (leagueId: string | undefined, rosterId: number) => any,
  transitiveSeed: string
) {
  const edges = useMemo(() => {
    const result: TransitiveEdge[] = []
    const sortedTrades = [...filteredTransactions].sort(
      (a, b) =>
        Number(a.created || a.status_updated || 0) -
        Number(b.created || b.status_updated || 0)
    )

    for (const trade of sortedTrades) {
      const tradeLeagueId = trade._leagueId as string | undefined
      const ts = Number(trade.created || trade.status_updated || Date.now())
      const dateLabel = new Date(ts).toLocaleString()
      const season = new Date(ts).getFullYear().toString()
      const rosterIds: number[] = Array.isArray(trade.roster_ids)
        ? trade.roster_ids
        : []
      const adds = trade.adds || {}
      const drops = trade.drops || {}

      for (const rosterId of rosterIds) {
        const ownerName =
          getTeamMeta(tradeLeagueId, rosterId)?.ownerName ||
          `Roster ${rosterId}`
        const counterparty =
          rosterIds
            .filter((id) => id !== rosterId)
            .map(
              (id) =>
                getTeamMeta(tradeLeagueId, id)?.ownerName || `Roster ${id}`
            )
            .join(', ') || '—'

        const sentPlayers: { id: string; name: string }[] = []
        const receivedPlayers: { id: string; name: string }[] = []
        for (const playerId of Object.keys(drops)) {
          if (drops[playerId] === rosterId) {
            const p = allPlayers[playerId]
            sentPlayers.push({
              id: playerId,
              name: (
                p ? `${p.first_name} ${p.last_name}` : `Player ${playerId}`
              ).trim(),
            })
          }
        }
        for (const playerId of Object.keys(adds)) {
          if (adds[playerId] === rosterId) {
            const p = allPlayers[playerId]
            receivedPlayers.push({
              id: playerId,
              name: (
                p ? `${p.first_name} ${p.last_name}` : `Player ${playerId}`
              ).trim(),
            })
          }
        }

        for (const from of sentPlayers) {
          for (const to of receivedPlayers) {
            result.push({
              id: `${trade.transaction_id}-${rosterId}-${from.id}-${to.id}`,
              transactionId: String(trade.transaction_id || ''),
              season,
              leagueId: tradeLeagueId,
              from: from.name,
              fromId: from.id,
              to: to.name,
              toId: to.id,
              timestamp: ts,
              week: Number(trade.leg || 0),
              dateLabel,
              rosterId,
              ownerName,
              counterparty,
            })
          }
        }
      }
    }
    return result
  }, [filteredTransactions, allPlayers, getTeamMeta])

  const seedOptions = useMemo(() => {
    const set = new Set<string>()
    edges.forEach((edge) => {
      set.add(edge.from)
      set.add(edge.to)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [edges])

  const chains = useMemo(() => {
    const ordered = [...edges].sort((a, b) => a.timestamp - b.timestamp)
    const adjacency = new Map<string, TransitiveEdge[]>()
    const incoming = new Set<string>()

    for (const edge of ordered) {
      incoming.add(edge.to)
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
      adjacency.get(edge.from)!.push(edge)
    }

    const discovered: TransitiveChain[] = []
    const roots =
      transitiveSeed === 'all'
        ? Array.from(new Set(ordered.map((e) => e.from))).filter(
            (name) => !incoming.has(name)
          )
        : [transitiveSeed]
    const rootSet = roots.length
      ? roots
      : Array.from(new Set(ordered.map((e) => e.from)))
    const maxDepth = 5

    const dfs = (
      currentName: string,
      _currentId: string | undefined,
      nodes: string[],
      nodeIds: (string | undefined)[],
      hops: TransitiveEdge[],
      visitedEdgeIds: Set<string>,
      depth: number
    ) => {
      const nextEdges = (adjacency.get(currentName) || []).filter(
        (edge) => !visitedEdgeIds.has(edge.id)
      )
      if (!nextEdges.length || depth >= maxDepth) {
        if (nodes.length > 1 && hops.length > 0) {
          const lastHop = hops[hops.length - 1]
          discovered.push({
            id: `${nodes.join('>')}__${hops.map((h) => h.id).join('|')}`,
            root: nodes[0],
            nodes,
            nodeIds,
            hops,
            lastTimestamp: lastHop.timestamp,
            lastDateLabel: lastHop.dateLabel,
            owners: Array.from(new Set(hops.map((h) => h.ownerName))),
            counterparties: Array.from(
              new Set(hops.map((h) => h.counterparty))
            ),
          })
        }
        return
      }

      for (const edge of nextEdges) {
        const nextVisited = new Set(visitedEdgeIds)
        nextVisited.add(edge.id)
        dfs(
          edge.to,
          edge.toId,
          [...nodes, edge.to],
          [...nodeIds, edge.toId],
          [...hops, edge],
          nextVisited,
          depth + 1
        )
      }
    }

    for (const root of rootSet) {
      const firstEdges = adjacency.get(root) || []
      if (!firstEdges.length) continue
      for (const edge of firstEdges) {
        dfs(
          edge.to,
          edge.toId,
          [root, edge.to],
          [edge.fromId, edge.toId],
          [edge],
          new Set([edge.id]),
          1
        )
      }
    }

    if (transitiveSeed === 'all') {
      const byRoot = new Map<string, TransitiveChain>()
      const ranked = [...discovered].sort((a, b) => {
        if (b.nodes.length !== a.nodes.length)
          return b.nodes.length - a.nodes.length
        return b.lastTimestamp - a.lastTimestamp
      })
      for (const chain of ranked) {
        if (!byRoot.has(chain.root)) byRoot.set(chain.root, chain)
      }
      return Array.from(byRoot.values()).sort(
        (a, b) => b.lastTimestamp - a.lastTimestamp
      )
    }
    return discovered.sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  }, [edges, transitiveSeed])

  return { chains, seedOptions }
}

/* ─── TradeMarketContent (main) ──────────────────────────────────────── */

type Tab = 'overview' | 'trends' | 'transitive'

function TradeMarketContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedLeagueId, isLoading: contextLoading } = useLeagueContext()
  const [leagueId, setLeagueId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const {
    data: tradeData,
    isLoading: loading,
    error: fetchError,
  } = useSWR(
    leagueId ? `/api/trade-market?leagueId=${leagueId}` : null,
    (url) =>
      fetch(url, { cache: 'no-store' }).then(async (r) => {
        if (!r.ok) {
          const text = await r.text()
          throw new Error(
            `Failed to fetch trade market data: ${r.status} ${text}`
          )
        }
        const result = await r.json()
        if (!result.success)
          throw new Error(result.error || 'Failed to fetch trade market data')
        return result.data
      })
  )
  const error: string | null = fetchError?.message ?? null
  const teams: any[] = tradeData?.teams || []
  const teamsByLeague: Record<string, any[]> = tradeData?.teamsByLeague || {}
  const leagueHistory: { leagueId: string; season: string }[] =
    tradeData?.leagueHistory || []
  const allPlayers: Record<string, any> = tradeData?.allPlayers || {}
  const transactions: any[] = tradeData?.transactions || []
  const dynastyRankings: Record<string, any> =
    tradeData?.dynastyRankings || {}
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [weekRangeFilter, setWeekRangeFilter] = useState('all')
  const [rosterFilter, setRosterFilter] = useState('all')
  const [assetFilter, setAssetFilter] = useState<
    'all' | 'players' | 'picks' | 'faab'
  >('all')
  const [transitiveSeed, setTransitiveSeed] = useState<string>('all')

  const getTeamMeta = useCallback(
    (leagueIdFromTrade: string | undefined, rosterId: number) => {
      const scoped = leagueIdFromTrade
        ? teamsByLeague[leagueIdFromTrade] || []
        : teams
      return (
        scoped.find((t: any) => t.rosterId === rosterId) ||
        teams.find((t: any) => t.rosterId === rosterId)
      )
    },
    [teamsByLeague, teams]
  )

  // Resolve leagueId from context, URL, or cache
  useEffect(() => {
    if (selectedLeagueId) {
      setLeagueId(selectedLeagueId)
      return
    }
    if (contextLoading) return
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
      setLeagueId(urlLeagueId)
      return
    }
    const cachedLeagueId = leagueCache.getLeagueId()
    if (cachedLeagueId) {
      setLeagueId(cachedLeagueId)
    }
  }, [selectedLeagueId, contextLoading, searchParams])

  const noLeagueId = !leagueId && !contextLoading

  /* ── filtered transactions ─────────────────────────────────────── */

  const filteredTransactions = useMemo(() => {
    const tradesOnly = transactions.filter((tx) => tx?.type === 'trade')
    return tradesOnly.filter((tx) => {
      const season = new Date(
        tx.created || tx.status_updated || Date.now()
      )
        .getFullYear()
        .toString()
      const week = Number(tx.leg || 0)
      const rosterIds: number[] = Array.isArray(tx.roster_ids)
        ? tx.roster_ids
        : []
      const hasPlayers =
        (!!tx.adds && Object.keys(tx.adds).length > 0) ||
        (!!tx.drops && Object.keys(tx.drops).length > 0)
      const hasPicks =
        Array.isArray(tx.draft_picks) && tx.draft_picks.length > 0
      const hasFaab =
        Array.isArray(tx.waiver_budget) && tx.waiver_budget.length > 0

      const seasonOk = seasonFilter === 'all' || season === seasonFilter
      const weekOk = inWeekRange(week, weekRangeFilter)
      const rosterOk =
        rosterFilter === 'all' ||
        rosterIds.includes(Number(rosterFilter))
      const assetOk =
        assetFilter === 'all' ||
        (assetFilter === 'players' && hasPlayers) ||
        (assetFilter === 'picks' && hasPicks) ||
        (assetFilter === 'faab' && hasFaab)

      return seasonOk && weekOk && rosterOk && assetOk
    })
  }, [transactions, seasonFilter, weekRangeFilter, rosterFilter, assetFilter])

  const seasonOptions = useMemo(() => {
    const seasons = Array.from(
      new Set([
        ...transactions.map((tx) =>
          new Date(tx.created || tx.status_updated || Date.now())
            .getFullYear()
            .toString()
        ),
        ...leagueHistory.map((l) => l.season).filter(Boolean),
      ])
    ).sort((a, b) => Number(b) - Number(a))
    return seasons
  }, [transactions, leagueHistory])

  /* ── player valuation cache (compute once, share everywhere) ────── */

  const playerValuationCache = useMemo(() => {
    const cache = new Map<string, PlayerValue>()
    const playerIds = new Set<string>()
    for (const tx of filteredTransactions) {
      for (const pid of Object.keys(tx.adds || {})) playerIds.add(pid)
      for (const pid of Object.keys(tx.drops || {})) playerIds.add(pid)
    }
    for (const pid of playerIds) {
      const pv = processPlayerForTrade(pid, allPlayers, dynastyRankings)
      if (pv) cache.set(pid, pv)
    }
    return cache
  }, [filteredTransactions, allPlayers, dynastyRankings])

  /* ── market analytics (overview tab) ────────────────────────────── */

  const { rosterKPIs, counterpartyPairs, topBuyLows, topSellHighs, velocity, mostTradedPlayers, pnlSeries } =
    useMemo(
      () =>
        computeTradeAnalytics(
          filteredTransactions,
          allPlayers,
          dynastyRankings,
          getTeamMeta,
          playerValuationCache
        ),
      [filteredTransactions, allPlayers, dynastyRankings, getTeamMeta, playerValuationCache]
    )

  /* ── transitive chains (extracted hook) ─────────────────────────── */

  const { chains: transitiveChains, seedOptions: transitiveSeedOptions } =
    useTransitiveChains(filteredTransactions, allPlayers, getTeamMeta, transitiveSeed)

  /* ── early returns (loading, no league, error) ──────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-blue-400 animate-pulse mx-auto mb-4" />
          <div className="font-mono text-sm text-muted-foreground">
            Loading market data...
          </div>
        </div>
      </div>
    )
  }

  if (noLeagueId) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <Header />
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-6">
            No league ID found. Enter your Sleeper league ID.
            </p>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <input
                type="text"
                placeholder="Enter league ID"
              className="px-3 py-2 bg-card border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60"
              onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    if (input.value.trim()) {
                    const next = input.value.trim()
                    setLeagueId(next)
                    leagueCache.setLeagueId(next)
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector(
                    'input[placeholder="Enter league ID"]'
                ) as HTMLInputElement | null
                  if (input?.value.trim()) {
                  const next = input.value.trim()
                  setLeagueId(next)
                  leagueCache.setLeagueId(next)
                  }
                }}
              >
                Load League
              </Button>
            </div>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <Header />
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-400 mb-6">{error}</p>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
        </div>
      </div>
    )
  }

  /* ── main render ──────────────────────────────────────────────────── */

  return (
    <main className="min-h-screen fb-app-surface">
      <Header />

      {/* Title bar + filters */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-mono text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                TRADE MARKET
              </h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                League trade performance and value capture tracker
              </p>
              </div>
            <div className="flex items-center gap-4">
              <TradeMarketClock />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(`/league-buddy?leagueId=${leagueId}`)
                }
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
                </div>

          {/* Filter chips */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
            >
              <option value="all">All Seasons</option>
              {seasonOptions.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
            <select
              value={weekRangeFilter}
              onChange={(e) => setWeekRangeFilter(e.target.value)}
              className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
            >
              <option value="all">All Weeks</option>
              <option value="0-4">Weeks 0-4</option>
              <option value="5-9">Weeks 5-9</option>
              <option value="10-14">Weeks 10-14</option>
              <option value="15-20">Weeks 15-20</option>
            </select>
            <select
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value)}
              className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
            >
              <option value="all">All Rosters</option>
              {teams.map((team) => (
                <option key={team.rosterId} value={String(team.rosterId)}>
                  {team.ownerName}
                </option>
              ))}
            </select>
            <select
              value={assetFilter}
              onChange={(e) =>
                setAssetFilter(
                  e.target.value as 'all' | 'players' | 'picks' | 'faab'
                )
              }
              className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
            >
              <option value="all">All Asset Types</option>
              <option value="players">Players</option>
              <option value="picks">Picks</option>
              <option value="faab">FAAB</option>
            </select>
            <div className="h-9 px-2 flex items-center text-[11px] text-muted-foreground font-mono border border-border rounded bg-secondary/20">
              {filteredTransactions.length} trades after filters
                </div>
              </div>
                                </div>
                          </div>

      {/* Tabs */}
      <div className="bg-card/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0">
            {([
              { key: 'overview' as Tab, label: 'Market Overview' },
              { key: 'trends' as Tab, label: 'Market Trends' },
              { key: 'transitive' as Tab, label: 'Transitive Paths' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
                              </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <MarketOverviewTab
            rosterKPIs={rosterKPIs}
            topBuyLows={topBuyLows}
            topSellHighs={topSellHighs}
            allPlayers={allPlayers}
            dynastyRankings={dynastyRankings}
            valuationCache={playerValuationCache}
            velocity={velocity}
          />
        )}
        {activeTab === 'trends' && (
          <MarketTrendsTab
            mostTradedPlayers={mostTradedPlayers}
            pnlSeries={pnlSeries}
            counterpartyPairs={counterpartyPairs}
            rosterKPIs={rosterKPIs}
            totalTrades={filteredTransactions.length}
            allPlayers={allPlayers}
            dynastyRankings={dynastyRankings}
          />
        )}
        {activeTab === 'transitive' && (
          <TransitivePathsTab
            transitiveChains={transitiveChains}
            transitiveSeed={transitiveSeed}
            setTransitiveSeed={setTransitiveSeed}
            transitiveSeedOptions={transitiveSeedOptions}
            allPlayers={allPlayers}
            dynastyRankings={dynastyRankings}
            valuationCache={playerValuationCache}
          />
        )}

        {/* Footer stats */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-4">
              <span>{filteredTransactions.length} trades analyzed</span>
              <span>|</span>
              <span>{rosterKPIs.length} active traders</span>
              <span>|</span>
              <span>{transitiveSeedOptions.length} tracked assets</span>
                              </div>
            <div className="text-blue-400">
              {leagueHistory.length} linked league seasons
                        </div>
                      </div>
                    </div>
                        </div>
    </main>
  )
}

/* ─── page wrapper ─────────────────────────────────────────────────── */

export default function TradeMarketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground font-mono">
            Loading trade market...
          </div>
        </div>
      }
    >
      <TradeMarketContent />
    </Suspense>
  )
}
