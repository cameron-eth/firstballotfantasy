'use client'

import { useMemo } from 'react'
import type React from 'react'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { Card } from '@/components/ui/card'
import { TONE, VALUE_TONE } from '@/lib/design/tones'
import { KtcSparkline } from '@/components/scouting/KtcSparkline'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { PlayerData } from './types'
import { calculatePositionalMedians, calculatePERatio, type PositionalMedians } from './utils'
import { ktcHistoryValue, ktcValue, type LeagueContext } from '@/lib/sleeper-sdk'

interface TradeIntelligencePanelProps {
  players: PlayerData[]
  /** All rostered players league-wide, used to compute positional P/E medians. Falls back to `players` (within-team only) if omitted. */
  leaguePlayerPool?: PlayerData[]
  leagueContext: LeagueContext
}

function getDynastyWindow(
  age: number,
  position: string
): {
  label: string
  color: string
} {
  const peakAgeMap: Record<string, [number, number]> = {
    QB: [26, 34],
    RB: [22, 27],
    WR: [23, 30],
    TE: [24, 31],
  }
  const [peakStart, peakEnd] = peakAgeMap[position] ?? [24, 30]

  if (age < peakStart - 2) return { label: 'Rising', color: 'text-emerald-400' }
  if (age < peakStart) return { label: 'Prime', color: 'text-green-400' }
  if (age <= peakEnd) return { label: 'Peak', color: 'text-yellow-400' }
  if (age <= peakEnd + 2) return { label: 'Declining', color: 'text-orange-400' }
  return { label: 'Depth', color: 'text-red-400' }
}

interface ClassifiedPlayer {
  player: PlayerData
  signal: 'sell' | 'hold' | 'buy'
  reason: string
  dailyDelta: number // today vs yesterday
  peRatio: number | null
}

/** Daily delta: last scraped value minus the one before it */
function getDailyDelta(player: PlayerData, ctx: LeagueContext): number {
  const hist = player.ktcHistory
  if (!hist || hist.length < 2) return 0
  return ktcHistoryValue(hist[hist.length - 1], ctx) - ktcHistoryValue(hist[hist.length - 2], ctx)
}

const PE_UNDERVALUED = 0.7
const PE_OVERVALUED = 1.5

function classifyPlayer(
  player: PlayerData,
  medians: Record<string, PositionalMedians>,
  ctx: LeagueContext
): ClassifiedPlayer {
  const dailyDelta = getDailyDelta(player, ctx)
  const age = player.age ?? 0
  const position = player.position ?? 'WR'
  const { label: dynastyWindow } = getDynastyWindow(age, position)
  const peRatio = calculatePERatio(player, medians, ctx)

  // Primary signal: production vs price, when there's an actual production sample.
  if (peRatio !== null) {
    if (peRatio > PE_OVERVALUED) {
      return {
        player,
        signal: 'sell',
        reason: `P/E ${peRatio.toFixed(2)} · overvalued · ${dynastyWindow}`,
        dailyDelta,
        peRatio,
      }
    }
    if (peRatio < PE_UNDERVALUED) {
      return {
        player,
        signal: 'buy',
        reason: `P/E ${peRatio.toFixed(2)} · undervalued · ${dynastyWindow}`,
        dailyDelta,
        peRatio,
      }
    }
    // Fair value on production — fall through to momentum as a tiebreaker.
  }

  // Sell High: biggest daily gainers (value jumped today)
  if (dailyDelta > 50) {
    return {
      player,
      signal: 'sell',
      reason: `+${dailyDelta.toLocaleString()} today · ${dynastyWindow}`,
      dailyDelta,
      peRatio,
    }
  }

  // Buy Low: dropped today but young/prime window — buy the dip. Also the primary path
  // for speculative players (rookies etc.) with no production sample yet.
  const isValueDropping = dailyDelta < -50
  const isYoungAndPrime = dynastyWindow === 'Rising' || dynastyWindow === 'Prime'

  if (isValueDropping && isYoungAndPrime) {
    return {
      player,
      signal: 'buy',
      reason: `${dailyDelta.toLocaleString()} today · ${dynastyWindow}`,
      dailyDelta,
      peRatio,
    }
  }

  // Hold: everything else
  return {
    player,
    signal: 'hold',
    reason: peRatio !== null ? `P/E ${peRatio.toFixed(2)} · fair value` : dynastyWindow,
    dailyDelta,
    peRatio,
  }
}

function PlayerRow({ classified, ctx }: { classified: ClassifiedPlayer; ctx: LeagueContext }) {
  const { player, dailyDelta, reason } = classified
  return (
    <PlayerTradingCard
      name={player.playerName}
      position={player.position}
      team={player.team}
      image={
        player.headshot_url ||
        (player.espn_id
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`
          : `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`)
      }
      imageHeight="h-40"
      badge={getDynastyWindow(player.age ?? 0, player.position).label}
      label={reason}
    >
      <div className="flex justify-between gap-2">
        <span>
          KTC {ctx.superflex ? 'SF' : '1QB'}{' '}
          <strong className="text-white">{ktcValue(player, ctx)?.toLocaleString() ?? '—'}</strong>
        </span>
        <span className={dailyDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          {dailyDelta > 0 ? '+' : ''}
          {dailyDelta.toLocaleString()} today
        </span>
      </div>
      {(player.ktcHistory?.length ?? 0) >= 2 && (
        <div className="mt-2">
          <KtcSparkline
            playerName={player.playerName}
            history={player.ktcHistory}
            useSf={ctx.superflex}
            width={170}
            height={32}
          />
        </div>
      )}
    </PlayerTradingCard>
  )
}

export function TradeIntelligencePanel({
  players,
  leaguePlayerPool,
  leagueContext,
}: TradeIntelligencePanelProps) {
  const medians = useMemo(
    () => calculatePositionalMedians(leaguePlayerPool ?? players, leagueContext),
    [leaguePlayerPool, players, leagueContext]
  )

  const classified = useMemo<ClassifiedPlayer[]>(() => {
    // Only include skill positions
    const skillPlayers = players.filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
    return skillPlayers.map((p) => classifyPlayer(p, medians, leagueContext))
  }, [players, medians, leagueContext])

  const sellPlayers = useMemo(
    () =>
      classified
        .filter((c) => c.signal === 'sell')
        .sort((a, b) => b.dailyDelta - a.dailyDelta) // biggest daily gainers first
        .slice(0, 5),
    [classified]
  )

  const holdPlayers = useMemo(
    () =>
      classified
        .filter((c) => c.signal === 'hold')
        .sort((a, b) => (a.player.rank ?? 999) - (b.player.rank ?? 999))
        .slice(0, 5),
    [classified]
  )

  const buyPlayers = useMemo(
    () =>
      classified
        .filter((c) => c.signal === 'buy')
        .sort((a, b) => a.dailyDelta - b.dailyDelta) // biggest drops first
        .slice(0, 5),
    [classified]
  )

  const columns: {
    signal: 'sell' | 'hold' | 'buy'
    label: string
    accentColor: string
    borderColor: string
    badgeClass: string
    icon: React.ReactNode
    players: ClassifiedPlayer[]
    emptyMsg: string
  }[] = [
    {
      signal: 'sell',
      label: 'Sell high',
      // Section color is the action (DESIGN_SYSTEM.md §1); the arrow is the price move.
      accentColor: 'text-value',
      borderColor: 'border-value/30',
      badgeClass: VALUE_TONE,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      players: sellPlayers,
      emptyMsg: 'No sell candidates',
    },
    {
      signal: 'hold',
      label: 'Hold',
      accentColor: 'text-slate-300',
      borderColor: 'border-line/60',
      badgeClass: TONE.neutral,
      icon: <Minus className="h-3.5 w-3.5" />,
      players: holdPlayers,
      emptyMsg: 'No hold recommendations',
    },
    {
      signal: 'buy',
      label: 'Buy low',
      accentColor: 'text-action',
      borderColor: 'border-action/30',
      badgeClass: 'border-action/40 bg-action/10 text-blue-100',
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      players: buyPlayers,
      emptyMsg: 'No buy candidates',
    },
  ]

  return (
    <div className="space-y-5">
      {columns.map((col) => (
        <Card
          key={col.signal}
          className={`rounded-none border-0 border-b border-white/10 bg-transparent shadow-none overflow-hidden`}
        >
          {/* Column header */}
          <div className={`flex items-center gap-2 px-4 py-3 border-b ${col.borderColor}`}>
            <span className={col.accentColor}>{col.icon}</span>
            <span className={`text-sm font-semibold ${col.accentColor}`}>{col.label}</span>
            <span
              className={`ml-auto rounded-md border px-1.5 py-0.5 text-badge font-semibold leading-none tabular-nums ${col.badgeClass}`}
            >
              {col.players.length}
            </span>
          </div>

          {/* Player list — draft-board style rows */}
          {col.players.length > 0 ? (
            // The right-edge fade hints that the rail scrolls when cards run past the edge.
            <div className="relative after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-background">
              <div
                className="flex snap-x gap-3 overflow-x-auto py-4 pr-12"
                tabIndex={0}
                aria-label={`${col.label} players`}
              >
                {col.players.map((c) => (
                  <div key={c.player.playerId} className="w-60 shrink-0 snap-start">
                    <PlayerRow classified={c} ctx={leagueContext} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">{col.emptyMsg}</div>
          )}
        </Card>
      ))}
    </div>
  )
}
