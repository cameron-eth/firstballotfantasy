'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { leagueCache } from '@/lib/league-cache'
import { useLeagueContext } from '@/lib/league-context'
import {
  getDraftPickValue,
  processPlayerForTrade,
  calculateTraderStats,
  formatValue,
  type TradeAnalysis,
  type TraderStats,
} from '@/lib/trade-utils'

interface MarketRow {
  rosterId: number
  name: string
  avatarId?: string
  school: string
  year: number
  grade: number
  tier: string
  position: string
  isCollege: boolean
  tierResult: string | null
  overUnderPct: number | null
  projectedPPG: number | null
  actualPPG: number | null
  gamesPlayed: number | null
}

function getAvatarUrl(avatarId?: string): string {
  if (!avatarId) return ''
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`
}

function getTierColor(tier: string): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'Elite':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
    case 'Blue Chip':
      return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' }
    case 'Starter':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case 'Rotational':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }
    case 'Depth':
      return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' }
    default:
      return { bg: 'bg-secondary', text: 'text-foreground', border: 'border-border' }
  }
}

function toTier(avgValuePerTrade: number): string {
  if (avgValuePerTrade >= 20) return 'Elite'
  if (avgValuePerTrade >= 8) return 'Blue Chip'
  if (avgValuePerTrade >= 0) return 'Starter'
  if (avgValuePerTrade >= -10) return 'Rotational'
  return 'Depth'
}

function toGrade(avgValuePerTrade: number): number {
  return Math.max(0, Math.min(99.9, 50 + avgValuePerTrade * 2))
}

function TickerRow({ player, index }: { player: MarketRow; index: number }) {
  const [imageError, setImageError] = useState(false)
  const pctChange = player.overUnderPct || 0
  const isPositive = pctChange >= 0
  const tierColor = getTierColor(player.tier)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 border-b border-border/50 hover:bg-secondary/30 transition-colors font-mono text-sm',
        isPositive ? 'hover:bg-emerald-500/5' : 'hover:bg-red-500/5'
      )}
    >
      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
        {!imageError && player.avatarId ? (
          <Image
            src={getAvatarUrl(player.avatarId)}
            alt={player.name}
            width={32}
            height={32}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-xs text-muted-foreground font-bold">
            {player.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
        )}
      </div>

      <div className="w-20 flex-shrink-0">
        <div className="text-xs font-bold text-foreground truncate">
          {player.name.split(' ').pop()?.toUpperCase().slice(0, 8)}
        </div>
        <div className="text-[10px] text-muted-foreground">{player.position}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground truncate">{player.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{player.school}</div>
      </div>

      <div className="w-14 text-right flex-shrink-0">
        <div className="text-xs text-blue-400 font-bold">{player.grade.toFixed(1)}</div>
        <div className={cn('text-[10px] uppercase', tierColor.text)}>{player.tier.slice(0, 4)}</div>
      </div>

      <div className="w-14 text-right flex-shrink-0 hidden sm:block">
        <div className="text-xs text-muted-foreground">
          {player.projectedPPG !== null ? player.projectedPPG.toFixed(1) : '-'}
        </div>
        <div className="text-[10px] text-muted-foreground/60">SENT</div>
      </div>

      <div className="w-14 text-right flex-shrink-0 hidden sm:block">
        <div
          className={cn('text-xs font-semibold', isPositive ? 'text-emerald-400' : 'text-red-400')}
        >
          {player.actualPPG !== null ? player.actualPPG.toFixed(1) : '-'}
        </div>
        <div className="text-[10px] text-muted-foreground/60">REC</div>
      </div>

      <div
        className={cn(
          'w-20 text-right flex items-center justify-end gap-1 flex-shrink-0',
          isPositive ? 'text-emerald-400' : 'text-red-400'
        )}
      >
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className="text-sm font-bold">
          {isPositive ? '+' : ''}
          {pctChange.toFixed(0)}%
        </span>
      </div>
    </motion.div>
  )
}

function MarketPanel({
  title,
  icon: Icon,
  players,
  color,
  defaultExpanded = false,
}: {
  title: string
  icon: React.ElementType
  players: MarketRow[]
  color: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const colorClasses =
    {
      red: 'border-red-500/50 bg-red-500/5',
      amber: 'border-blue-500/50 bg-blue-500/5',
      emerald: 'border-emerald-500/50 bg-emerald-500/5',
      cyan: 'border-cyan-500/50 bg-cyan-500/5',
    }[color] || 'border-border bg-card'

  const iconColor =
    {
      red: 'text-red-400',
      amber: 'text-blue-400',
      emerald: 'text-emerald-400',
      cyan: 'text-cyan-400',
    }[color] || 'text-foreground'

  return (
    <div className={cn('rounded-lg border overflow-hidden', colorClasses)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', iconColor)} />
          <span className="font-mono text-sm font-bold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">({players.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider bg-secondary/30 sticky top-0 font-mono">
                <div className="w-8 flex-shrink-0"></div>
                <div className="w-20 flex-shrink-0">SYM</div>
                <div className="flex-1">TEAM</div>
                <div className="w-14 text-right flex-shrink-0">GRADE</div>
                <div className="w-14 text-right flex-shrink-0 hidden sm:block">SENT</div>
                <div className="w-14 text-right flex-shrink-0 hidden sm:block">REC</div>
                <div className="w-20 text-right flex-shrink-0">CHG%</div>
              </div>
              {players.map((player, idx) => (
                <TickerRow key={`${player.rosterId}-${player.name}`} player={player} index={idx} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TickerStrip({ players }: { players: MarketRow[] }) {
  const sortedPlayers = [...players]
    .filter((p) => p.overUnderPct !== null)
    .sort((a, b) => Math.abs(b.overUnderPct || 0) - Math.abs(a.overUnderPct || 0))
    .slice(0, 20)

  return (
    <div className="overflow-hidden border-y border-border bg-secondary/30">
      <motion.div
        animate={{ x: [0, -1920] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap py-2"
      >
        {[...sortedPlayers, ...sortedPlayers].map((player, idx) => {
          const pct = player.overUnderPct || 0
          const isPositive = pct >= 0
          return (
            <div
              key={`${player.rosterId}-${idx}`}
              className="flex items-center gap-2 px-4 font-mono text-xs"
            >
              <span className="text-muted-foreground">{player.position}</span>
              <span className="font-bold text-foreground">
                {player.name.split(' ').pop()?.toUpperCase()}
              </span>
              <span className={cn('font-bold', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                {isPositive ? '+' : ''}
                {pct.toFixed(0)}%
              </span>
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

function MarketSummary({
  highQualityTeams,
  lowQualityTeams,
  overperformingPlayers,
  underperformingPlayers,
}: {
  highQualityTeams: MarketRow[]
  lowQualityTeams: MarketRow[]
  overperformingPlayers: MarketRow[]
  underperformingPlayers: MarketRow[]
}) {
  const totalTeams = highQualityTeams.length + lowQualityTeams.length
  const totalPlayers = overperformingPlayers.length + underperformingPlayers.length
  const teamQualityRate =
    totalTeams > 0 ? ((highQualityTeams.length / totalTeams) * 100).toFixed(1) : '0'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-muted-foreground font-mono">TRACKED</span>
        </div>
        <div className="text-2xl font-mono font-bold text-foreground">
          {totalTeams + totalPlayers}
        </div>
      </div>

      <div className="bg-card border border-emerald-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-muted-foreground font-mono">TEAM QUALITY</span>
        </div>
        <div className="text-2xl font-mono font-bold text-emerald-400">{teamQualityRate}%</div>
      </div>

      <div className="bg-card border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-muted-foreground font-mono">OVERPERFORMERS</span>
        </div>
        <div className="text-2xl font-mono font-bold text-cyan-400">
          {overperformingPlayers.length}
        </div>
      </div>

      <div className="bg-card border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-muted-foreground font-mono">UNDERPERFORMERS</span>
        </div>
        <div className="text-2xl font-mono font-bold text-red-400">
          {underperformingPlayers.length}
        </div>
      </div>
    </div>
  )
}

function GradeFilter({
  selected,
  onChange,
}: {
  selected: string
  onChange: (key: string) => void
}) {
  const grades = ['ALL', 'A', 'B', 'C', 'D/F']
  return (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
      {grades.map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={cn(
            'px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors',
            selected === g
              ? 'bg-blue-500 text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {g}
        </button>
      ))}
    </div>
  )
}

function TradeMarketContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedLeagueId } = useLeagueContext()
  const [leagueId, setLeagueId] = useState<string>('')

  const [teams, setTeams] = useState<any[]>([])
  const [allPlayers, setAllPlayers] = useState<Record<string, any>>({})
  const [transactions, setTransactions] = useState<any[]>([])
  const [tradedPicks, setTradedPicks] = useState<any[]>([])
  const [dynastyRankings, setDynastyRankings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noLeagueId, setNoLeagueId] = useState(false)
  const [gradeFilter, setGradeFilter] = useState('ALL')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    if (selectedLeagueId) setLeagueId(selectedLeagueId)
  }, [selectedLeagueId])

  useEffect(() => {
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
      setLeagueId(urlLeagueId)
      return
    }
    const cachedLeagueId = leagueCache.getLeagueId()
    if (cachedLeagueId) {
      setLeagueId(cachedLeagueId)
      return
    }
    setNoLeagueId(true)
    setLoading(false)
  }, [searchParams])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!leagueId) return
      setNoLeagueId(false)
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/trade-market?leagueId=${leagueId}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch trade market data: ${response.status} ${errorText}`)
        }
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to fetch trade market data')
        const { data } = result
        setTeams(data.teams || [])
        setAllPlayers(data.allPlayers || {})
        setTransactions(data.transactions || [])
        setTradedPicks(data.tradedPicks || [])
        setDynastyRankings(data.dynastyRankings || {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trade market data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [leagueId])

  const tradeAnalysis = useMemo<TradeAnalysis[]>(() => {
    if (loading || !dynastyRankings || Object.keys(dynastyRankings).length === 0) return []

    const analyzedTrades: TradeAnalysis[] = []
    transactions.forEach((trade) => {
      const tradeTeams = trade.roster_ids.map((rosterId: number) => {
        const team = teams.find((t) => t.rosterId === rosterId)
        const teamName = team?.teamName || `Team ${rosterId}`
        const ownerName = team?.ownerName || 'Unknown'

        const playersReceived: any[] = []
        if (trade.adds) {
          Object.keys(trade.adds).forEach((playerId) => {
            if (trade.adds[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) playersReceived.push(playerValue)
            }
          })
        }

        const playersSent: any[] = []
        if (trade.drops) {
          Object.keys(trade.drops).forEach((playerId) => {
            if (trade.drops[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) playersSent.push(playerValue)
            }
          })
        }

        const picksReceived: any[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.owner_id === rosterId) {
              picksReceived.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }

        const picksSent: any[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.previous_owner_id === rosterId && pick.owner_id !== rosterId) {
              picksSent.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }

        const totalValueReceived =
          playersReceived.reduce((sum, p) => sum + p.value, 0) +
          picksReceived.reduce((sum, p) => sum + p.finalValue, 0)
        const totalValueSent =
          playersSent.reduce((sum, p) => sum + p.value, 0) +
          picksSent.reduce((sum, p) => sum + p.finalValue, 0)
        const netValueGain = totalValueReceived - totalValueSent

        return {
          rosterId,
          teamName,
          ownerName,
          playersReceived,
          picksReceived,
          totalValueReceived,
          playersSent,
          picksSent,
          totalValueSent,
          netValueGain,
        }
      })

      const totalTradeValue = tradeTeams.reduce(
        (sum: number, team: any) => sum + team.totalValueReceived,
        0
      )
      const winner = tradeTeams.reduce((max: any, team: any) =>
        team.netValueGain > max.netValueGain ? team : max
      ).rosterId

      analyzedTrades.push({
        transactionId: trade.transaction_id,
        week: trade.leg,
        season: new Date(trade.created).getFullYear().toString(),
        date: new Date(trade.created).toLocaleDateString(),
        timestamp: trade.created,
        teams: tradeTeams,
        totalTradeValue,
        winner,
      })
    })

    return analyzedTrades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }, [transactions, teams, allPlayers, dynastyRankings, loading])

  const traderStats = useMemo<TraderStats[]>(
    () => calculateTraderStats(tradeAnalysis),
    [tradeAnalysis]
  )

  const marketRows = useMemo<MarketRow[]>(() => {
    return traderStats
      .map((trader) => {
        const team = teams.find((t) => t.rosterId === trader.rosterId)
        const totalReceived = (trader.totalValueMoved + trader.totalValueGained) / 2
        const totalSent = (trader.totalValueMoved - trader.totalValueGained) / 2
        const avgReceived = trader.totalTrades > 0 ? totalReceived / trader.totalTrades : 0
        const avgSent = trader.totalTrades > 0 ? totalSent / trader.totalTrades : 0
        const overUnderPct = totalSent > 0 ? (trader.totalValueGained / totalSent) * 100 : 0

        return {
          rosterId: trader.rosterId,
          name: trader.ownerName,
          avatarId: team?.ownerAvatar,
          school: trader.teamName,
          year: new Date().getFullYear(),
          grade: toGrade(trader.avgValuePerTrade),
          tier: toTier(trader.avgValuePerTrade),
          position: 'TRADER',
          isCollege: false,
          tierResult: trader.grade,
          overUnderPct,
          projectedPPG: avgSent,
          actualPPG: avgReceived,
          gamesPlayed: trader.totalTrades,
        }
      })
      .sort((a, b) => Math.abs(b.overUnderPct || 0) - Math.abs(a.overUnderPct || 0))
  }, [traderStats, teams])

  const filteredRows = useMemo(() => {
    if (gradeFilter === 'ALL') return marketRows
    if (gradeFilter === 'D/F') {
      return marketRows.filter(
        (row) => row.tierResult?.startsWith('D') || row.tierResult?.startsWith('F')
      )
    }
    return marketRows.filter((row) => row.tierResult?.startsWith(gradeFilter))
  }, [marketRows, gradeFilter])

  const highQualityTeams = filteredRows.filter((p) => (p.overUnderPct || 0) >= 0)
  const lowQualityTeams = filteredRows.filter((p) => (p.overUnderPct || 0) < 0)

  const playerPerformanceRows = useMemo<MarketRow[]>(() => {
    const byPlayer = new Map<
      string,
      {
        id: string
        name: string
        position: string
        nflTeam: string
        exposure: number
        delta: number
        moves: number
      }
    >()

    for (const trade of tradeAnalysis) {
      for (const team of trade.teams) {
        const receiveWeight =
          team.playersReceived.length > 0 ? team.netValueGain / team.playersReceived.length : 0
        const sendWeight =
          team.playersSent.length > 0 ? team.netValueGain / team.playersSent.length : 0

        for (const p of team.playersReceived) {
          const key = p.playerId || p.playerName
          const prev = byPlayer.get(key) || {
            id: key,
            name: p.playerName,
            position: p.position || 'FLEX',
            nflTeam: p.team || 'NFL',
            exposure: 0,
            delta: 0,
            moves: 0,
          }
          prev.exposure += Math.max(1, p.value || 0)
          prev.delta += receiveWeight
          prev.moves += 1
          byPlayer.set(key, prev)
        }

        for (const p of team.playersSent) {
          const key = p.playerId || p.playerName
          const prev = byPlayer.get(key) || {
            id: key,
            name: p.playerName,
            position: p.position || 'FLEX',
            nflTeam: p.team || 'NFL',
            exposure: 0,
            delta: 0,
            moves: 0,
          }
          prev.exposure += Math.max(1, p.value || 0)
          prev.delta -= sendWeight
          prev.moves += 1
          byPlayer.set(key, prev)
        }
      }
    }

    return Array.from(byPlayer.values())
      .filter((p) => p.moves >= 1)
      .map((p) => {
        const overUnderPct = p.exposure > 0 ? (p.delta / p.exposure) * 100 : 0
        const projected = p.exposure / Math.max(1, p.moves)
        const actual = projected * (1 + overUnderPct / 100)
        return {
          rosterId: Number(p.id.replace(/\D/g, '').slice(0, 9)) || 0,
          name: p.name,
          school: p.nflTeam,
          year: new Date().getFullYear(),
          grade: toGrade(overUnderPct / 2),
          tier: toTier(overUnderPct / 4),
          position: p.position,
          isCollege: false,
          tierResult: null,
          overUnderPct,
          projectedPPG: Number.isFinite(projected) ? projected : null,
          actualPPG: Number.isFinite(actual) ? actual : null,
          gamesPlayed: p.moves,
        }
      })
      .sort((a, b) => Math.abs(b.overUnderPct || 0) - Math.abs(a.overUnderPct || 0))
      .slice(0, 80)
  }, [tradeAnalysis])

  const overperformingPlayers = playerPerformanceRows.filter((p) => (p.overUnderPct || 0) >= 0)
  const underperformingPlayers = playerPerformanceRows.filter((p) => (p.overUnderPct || 0) < 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-blue-400 animate-pulse mx-auto mb-4" />
          <div className="font-mono text-sm text-muted-foreground">Loading market data...</div>
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
                    setNoLeagueId(false)
                    setLoading(true)
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
                  setNoLeagueId(false)
                  setLoading(true)
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

  return (
    <main className="min-h-screen fb-app-surface">
      <Header />

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
              <GradeFilter selected={gradeFilter} onChange={setGradeFilter} />
              <div className="font-mono text-sm text-muted-foreground">
                {time.toLocaleTimeString()} EST
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/league-buddy?leagueId=${leagueId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TickerStrip
        players={playerPerformanceRows.length > 0 ? playerPerformanceRows : filteredRows}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MarketSummary
          highQualityTeams={highQualityTeams}
          lowQualityTeams={lowQualityTeams}
          overperformingPlayers={overperformingPlayers}
          underperformingPlayers={underperformingPlayers}
        />

        <div className="mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Team Trading Quality
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <MarketPanel
            title="HIGH-QUALITY TRADERS"
            icon={TrendingUp}
            players={highQualityTeams}
            color="emerald"
            defaultExpanded
          />
          <MarketPanel
            title="LOW-QUALITY TRADERS"
            icon={TrendingDown}
            players={lowQualityTeams}
            color="amber"
            defaultExpanded
          />
        </div>

        <div className="mt-6 mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Player Performance
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <MarketPanel
            title="OVERPERFORMING PLAYERS"
            icon={Zap}
            players={overperformingPlayers}
            color="cyan"
            defaultExpanded
          />
          <MarketPanel
            title="UNDERPERFORMING PLAYERS"
            icon={AlertTriangle}
            players={underperformingPlayers}
            color="red"
            defaultExpanded
          />
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-4">
              <span>{tradeAnalysis.length} trades analyzed</span>
              <span>|</span>
              <span>{traderStats.length} active traders</span>
              <span>|</span>
              <span>{tradedPicks.length} traded picks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Beat market
              </span>
              <span className="flex items-center gap-1 ml-4">
                <TrendingDown className="w-3 h-3 text-red-400" />
                Lost market
              </span>
              <span className="ml-4 text-blue-400">
                Total Value: {formatValue(tradeAnalysis.reduce((s, t) => s + t.totalTradeValue, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function TradeMarketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground font-mono">Loading trade market...</div>
        </div>
      }
    >
      <TradeMarketContent />
    </Suspense>
  )
}
