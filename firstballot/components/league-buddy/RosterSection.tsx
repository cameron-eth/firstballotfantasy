'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KtcSparkline } from '@/components/scouting/KtcSparkline'
import { TradeIntelligencePanel } from './TradeIntelligencePanel'
import { BarChart3, TrendingUp } from 'lucide-react'
import type { TeamData, PlayerData } from './types'

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
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground/40">
          {initials}
        </div>
      )}
    </div>
  )
}

const POSITION_BADGE: Record<string, string> = {
  QB: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  RB: 'bg-green-500/20 text-green-400 border-green-500/40',
  WR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  TE: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  K: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  DEF: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50',
  A: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50',
  'B+': 'bg-green-400/20 text-green-400 border-green-400/50',
  B: 'bg-green-400/20 text-green-400 border-green-400/50',
  'B-': 'bg-green-400/20 text-green-400 border-green-400/50',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400/50',
  C: 'bg-blue-400/20 text-blue-400 border-blue-400/50',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400/50',
  D: 'bg-orange-400/20 text-orange-400 border-orange-400/50',
  F: 'bg-red-500/20 text-red-500 border-red-500/50',
}

function getDynastyWindow(age: number, position: string): { label: string; color: string } {
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

function getRankTier(rank: number): string {
  if (rank <= 12) return 'Elite'
  if (rank <= 36) return 'Blue Chip'
  if (rank <= 72) return 'Starter'
  if (rank <= 150) return 'Rotational'
  return 'Depth'
}

interface RosterSectionProps {
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  teams: TeamData[]
}

export function RosterSection({ selectedTeam, sortedTeams, teams }: RosterSectionProps) {
  // Sort players by rank (best first), then non-skill positions at the end
  const sortedPlayers = useMemo(() => {
    const skill = selectedTeam.players.filter((p) =>
      ['QB', 'RB', 'WR', 'TE'].includes(p.position)
    )
    const other = selectedTeam.players.filter(
      (p) => !['QB', 'RB', 'WR', 'TE'].includes(p.position)
    )
    return [
      ...skill.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
      ...other.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    ]
  }, [selectedTeam.players])

  // Compute roster-level metrics
  const metrics = useMemo(() => {
    const skill = selectedTeam.players.filter((p) =>
      ['QB', 'RB', 'WR', 'TE'].includes(p.position)
    )
    const totalKtcSf = skill.reduce((sum, p) => sum + (p.ktcValueSf ?? 0), 0)
    const avgAge =
      skill.length > 0
        ? skill.reduce((sum, p) => sum + (p.age ?? 0), 0) / skill.length
        : 0
    const tier1Count = skill.filter((p) => p.rank <= 12).length
    const tier2Count = skill.filter((p) => p.rank > 12 && p.rank <= 36).length

    // Rank all teams by total KTC SF (skill positions only)
    const teamTotals = teams.map((t) => ({
      rosterId: t.rosterId,
      total: t.players
        .filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
        .reduce((sum, p) => sum + (p.ktcValueSf ?? 0), 0),
    }))
    teamTotals.sort((a, b) => b.total - a.total)
    const ktcLeagueRank =
      teamTotals.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1

    return { totalKtcSf, avgAge, tier1Count, tier2Count, ktcLeagueRank, leagueSize: teams.length }
  }, [selectedTeam.players, selectedTeam.rosterId, teams])

  const hasKtcData = selectedTeam.players.some((p) => p.ktcValueSf != null)
  const hasTrendData = selectedTeam.players.some((p) => (p.ktcHistory?.length ?? 0) >= 2)

  return (
    <div className="space-y-4">
      {/* Team Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Avg Age</div>
            <div className="text-foreground text-2xl font-bold font-mono">
              {metrics.avgAge > 0 ? metrics.avgAge.toFixed(1) : '—'}
            </div>
            <div className="text-muted-foreground/60 text-[10px] mt-0.5">skill positions</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Tier Density</div>
            <div className="text-foreground text-2xl font-bold font-mono">
              {metrics.tier1Count}
              <span className="text-muted-foreground text-base font-normal">+{metrics.tier2Count}</span>
            </div>
            <div className="text-muted-foreground/60 text-[10px] mt-0.5">T1 + T2 assets</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">KTC Total SF</div>
            <div className="text-foreground text-2xl font-bold font-mono">
              {metrics.totalKtcSf > 0 ? metrics.totalKtcSf.toLocaleString() : '—'}
            </div>
            <div className="text-muted-foreground/60 text-[10px] mt-0.5">dynasty value</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">KTC Rank</div>
            <div className="flex items-baseline gap-1">
              <div className={`text-2xl font-bold font-mono ${
                metrics.ktcLeagueRank === 0
                  ? 'text-muted-foreground'
                  : metrics.ktcLeagueRank <= Math.ceil(metrics.leagueSize / 4)
                  ? 'text-emerald-400'
                  : metrics.ktcLeagueRank <= Math.ceil(metrics.leagueSize / 2)
                  ? 'text-yellow-400'
                  : 'text-orange-400'
              }`}>
                {metrics.ktcLeagueRank > 0 ? `#${metrics.ktcLeagueRank}` : '—'}
              </div>
              {metrics.ktcLeagueRank > 0 && (
                <span className="text-muted-foreground text-sm font-mono">of {metrics.leagueSize}</span>
              )}
            </div>
            <div className="text-muted-foreground/60 text-[10px] mt-0.5">by total KTC SF</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Team Grade</div>
            <div
              className={`text-2xl font-bold font-mono ${
                GRADE_COLORS[selectedTeam.grade]
                  ? GRADE_COLORS[selectedTeam.grade].split(' ')[1]
                  : 'text-slate-300'
              }`}
            >
              {selectedTeam.grade || '—'}
            </div>
            <div className="text-muted-foreground/60 text-[10px] mt-0.5">
              #{sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1} in league
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trade Intelligence */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-yellow-400" />
          <h3 className="text-yellow-400 font-mono text-sm font-bold uppercase">
            Trade Intelligence
          </h3>
          {!hasTrendData && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground border-border ml-auto"
            >
              Signals based on age/rank — accumulate daily KTC data for trend signals
            </Badge>
          )}
        </div>
        <TradeIntelligencePanel players={selectedTeam.players} />
      </div>

      {/* Roster Scorecard */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="text-blue-400 font-mono text-sm font-bold uppercase">Roster Scorecard</h3>
        </div>

        {/* Column header — desktop only */}
        <div className="hidden md:grid grid-cols-[112px_1fr_52px_64px_52px_72px_88px] gap-0 px-0 py-2 border-b border-border/60 bg-secondary/5">
          <div />
          <span className="text-[10px] font-mono text-muted-foreground uppercase px-3">Player</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase text-center">Rank</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase text-center">Tier</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase text-center">Age</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase text-center">Window</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase text-center pr-3">KTC SF</span>
        </div>

        {/* Rows */}
        {sortedPlayers.map((player, idx) => {
          const posColor =
            POSITION_BADGE[player.position] ??
            'bg-slate-500/20 text-slate-400 border-slate-500/40'
          const tierLabel = getRankTier(player.rank)
          const { label: windowLabel, color: windowColor } = getDynastyWindow(
            player.age ?? 0,
            player.position
          )
          const isEven = idx % 2 === 0

          return (
            <div
              key={`scorecard-${player.playerId}`}
              className={`flex md:grid md:grid-cols-[112px_1fr_52px_64px_52px_72px_88px] items-stretch h-24 border-b border-border/40 last:border-0 transition-colors hover:bg-secondary/20 ${
                isEven ? 'bg-secondary/10' : 'bg-card'
              }`}
            >
              {/* Full-height cutout image */}
              <PlayerCutout player={player} />

              {/* Name + position — flex-1 */}
              <div className="flex-1 md:flex-none flex flex-col justify-center px-3 gap-1 min-w-0">
                <div className="text-base font-bold text-foreground truncate leading-tight">
                  {player.playerName}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border font-mono ${posColor}`}>
                    {player.position}
                  </Badge>
                  <span className="text-muted-foreground/60 text-xs">{player.team}</span>
                  {/* Mobile condensed */}
                  <span className="md:hidden text-muted-foreground text-xs font-mono">
                    · #{player.rank} · <span className={windowColor}>{windowLabel}</span>
                  </span>
                </div>
              </div>

              {/* Rank */}
              <div className="hidden md:flex items-center justify-center">
                <span className="text-foreground font-mono text-sm font-semibold tabular-nums">
                  #{player.rank}
                </span>
              </div>

              {/* Tier */}
              <div className="hidden md:flex items-center justify-center">
                <span className="text-muted-foreground text-xs font-mono">{tierLabel}</span>
              </div>

              {/* Age */}
              <div className="hidden md:flex items-center justify-center">
                <span className="text-foreground font-mono text-sm tabular-nums">
                  {player.age ?? '—'}
                </span>
              </div>

              {/* Dynasty Window */}
              <div className="hidden md:flex items-center justify-center">
                <span className={`text-xs font-mono font-semibold ${windowColor}`}>
                  {windowLabel}
                </span>
              </div>

              {/* KTC SF value / sparkline */}
              <div className="hidden md:flex items-center justify-center pr-3">
                {player.ktcHistory && player.ktcHistory.length >= 2 ? (
                  <KtcSparkline
                    playerName={player.playerName}
                    history={player.ktcHistory}
                    useSf
                    width={76}
                    height={36}
                  />
                ) : player.ktcValueSf != null ? (
                  <span className="text-foreground font-mono text-sm font-semibold tabular-nums">
                    {player.ktcValueSf.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
