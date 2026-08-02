'use client'

import { useMemo, useState } from 'react'
import type React from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KtcSparkline } from '@/components/scouting/KtcSparkline'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { PlayerData } from './types'
import {
  calculatePositionalMedians,
  calculatePERatio,
  type PositionalMedians,
} from './utils'

interface TradeIntelligencePanelProps {
  players: PlayerData[]
  /** All rostered players league-wide, used to compute positional P/E medians. Falls back to `players` (within-team only) if omitted. */
  leaguePlayerPool?: PlayerData[]
}

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  RB: 'bg-green-500/20 text-green-400 border-green-500/40',
  WR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  TE: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

function getDynastyWindow(age: number, position: string): {
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
function getDailyDelta(player: PlayerData): number {
  const hist = player.ktcHistory
  if (!hist || hist.length < 2) return 0
  return hist[hist.length - 1].value_sf - hist[hist.length - 2].value_sf
}

const PE_UNDERVALUED = 0.7
const PE_OVERVALUED = 1.5

function classifyPlayer(
  player: PlayerData,
  medians: Record<string, PositionalMedians>
): ClassifiedPlayer {
  const dailyDelta = getDailyDelta(player)
  const age = player.age ?? 0
  const position = player.position ?? 'WR'
  const { label: dynastyWindow } = getDynastyWindow(age, position)
  const peRatio = calculatePERatio(player, medians)

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

interface PlayerRowProps {
  classified: ClassifiedPlayer
  index: number
}

function PlayerCutout({ player }: { player: PlayerData }) {
  const [imgErr, setImgErr] = useState(false)
  const src = !imgErr
    ? (player.headshot_url ?? (player.espn_id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png` : null))
    : (player.espn_id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png` : null)

  const initials = player.playerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative w-28 flex-shrink-0 overflow-hidden bg-secondary/30">
      <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/30 z-[1]" />
      {src ? (
        <Image
          src={src}
          alt={player.playerName}
          width={120}
          height={120}
          className="w-full h-full object-contain object-bottom scale-110 relative z-0"
          onError={() => setImgErr(true)}
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground/40 z-0">
          {initials}
        </div>
      )}
    </div>
  )
}

function PlayerRow({ classified, index }: PlayerRowProps) {
  const { player, reason, dailyDelta } = classified
  const posColor = POSITION_COLORS[player.position] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40'
  const isEven = index % 2 === 0

  // KTC value display
  const ktcValue = player.ktcValueSf
  const hasHistory = (player.ktcHistory?.length ?? 0) >= 2

  return (
    <div
      className={`flex items-stretch h-24 border-b border-border/40 last:border-0 transition-colors hover:bg-secondary/20 ${
        isEven ? 'bg-secondary/10' : 'bg-card'
      }`}
    >
      {/* Full-height cutout image */}
      <PlayerCutout player={player} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-3 gap-1">
        <div className="text-base font-bold text-foreground truncate leading-tight">
          {player.playerName}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border font-mono ${posColor}`}>
            {player.position}
          </Badge>
          <span className="text-foreground/80 text-sm font-mono font-bold tabular-nums">
            #{player.rank}
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className={`text-xs font-mono font-semibold ${getDynastyWindow(player.age ?? 0, player.position).color}`}>
            {getDynastyWindow(player.age ?? 0, player.position).label}
          </span>
        </div>
      </div>

      {/* KTC value + daily delta */}
      <div className="flex-shrink-0 flex flex-col items-end justify-center pr-3 gap-0.5">
        {hasHistory ? (
          <>
            <KtcSparkline
              playerName={player.playerName}
              history={player.ktcHistory}
              useSf
              width={72}
              height={28}
            />
            {dailyDelta !== 0 && (
              <span className={`text-[10px] font-mono font-bold tabular-nums ${dailyDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dailyDelta > 0 ? `+${dailyDelta.toLocaleString()}` : dailyDelta.toLocaleString()} today
              </span>
            )}
          </>
        ) : ktcValue != null ? (
          <>
            <span className="text-foreground font-mono text-base font-semibold tabular-nums">
              {ktcValue.toLocaleString()}
            </span>
            {dailyDelta !== 0 && (
              <span className={`text-[10px] font-mono font-bold tabular-nums ${dailyDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dailyDelta > 0 ? `+${dailyDelta.toLocaleString()}` : dailyDelta.toLocaleString()} today
              </span>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

export function TradeIntelligencePanel({ players, leaguePlayerPool }: TradeIntelligencePanelProps) {
  const medians = useMemo(
    () => calculatePositionalMedians(leaguePlayerPool ?? players),
    [leaguePlayerPool, players]
  )

  const classified = useMemo<ClassifiedPlayer[]>(() => {
    // Only include skill positions
    const skillPlayers = players.filter((p) =>
      ['QB', 'RB', 'WR', 'TE'].includes(p.position)
    )
    return skillPlayers.map((p) => classifyPlayer(p, medians))
  }, [players, medians])

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
      label: 'SELL HIGH',
      accentColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      players: sellPlayers,
      emptyMsg: 'No sell candidates',
    },
    {
      signal: 'hold',
      label: 'HOLD',
      accentColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30',
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      icon: <Minus className="h-3.5 w-3.5" />,
      players: holdPlayers,
      emptyMsg: 'No hold recommendations',
    },
    {
      signal: 'buy',
      label: 'BUY LOW',
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      players: buyPlayers,
      emptyMsg: 'No buy candidates',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => (
        <Card key={col.signal} className={`bg-card ${col.borderColor} overflow-hidden`}>
          {/* Column header */}
          <div className={`flex items-center gap-2 px-4 py-3 border-b ${col.borderColor}`}>
            <span className={col.accentColor}>{col.icon}</span>
            <span className={`font-mono text-sm font-bold ${col.accentColor}`}>{col.label}</span>
            <Badge
              variant="outline"
              className={`ml-auto text-[10px] px-1.5 py-0 font-mono border ${col.badgeClass}`}
            >
              {col.players.length}
            </Badge>
          </div>

          {/* Player list — draft-board style rows */}
          {col.players.length > 0 ? (
            <div>
              {col.players.map((c, i) => (
                <PlayerRow key={c.player.playerId} classified={c} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs text-center py-8">{col.emptyMsg}</div>
          )}
        </Card>
      ))}
    </div>
  )
}
