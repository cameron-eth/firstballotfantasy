'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  normalizeScoutingGradeTier,
  SCOUTING_TIER_STYLES,
  type ScoutingDisplayTier,
} from '@/lib/scouting-grade-tier'
import type { Prospect } from './types'

interface ProspectCardProps {
  prospect: Prospect
  onSelect: (prospect: Prospect) => void
  onCompare: (prospect: Prospect) => void
  isOnBoard?: boolean
  variant?: 'full' | 'compact' | 'mini' | 'dossier'
  isDiamondTier?: boolean
  positionNeed?: number
}

interface CardPlayer {
  rank: number
  name: string
  espnId: string
  headshotUrl?: string | null
  school: string
  year: number | null
  grade: number | null
  tier: string
  height: string
  weight: number
  fortyTime: number | null
  production: number | null
  physical: number | null
  position: string
  isCollege: boolean
  seasonLine: string | null
}

function formatSeasonLine(stats?: Record<string, number> | null): string | null {
  if (!stats) return null
  const parts: string[] = []
  if (stats.rushing_yards != null) parts.push(`${stats.rushing_yards} rush yds`)
  if (stats.rushing_tds != null) parts.push(`${stats.rushing_tds} rush TD`)
  if (stats.receiving_yards != null) parts.push(`${stats.receiving_yards.toLocaleString()} rec yds`)
  if (stats.receiving_tds != null) parts.push(`${stats.receiving_tds} rec TD`)
  return parts.length ? parts.join(' · ') : null
}

function formatHeight(inches: number | null): string {
  if (!inches) return ''
  const feet = Math.floor(inches / 12)
  const rem = Math.round(inches % 12)
  return `${feet}'${rem}"`
}

function parseFortyTime(stats?: Record<string, number | string> | null): number | null {
  if (!stats) return null
  const raw = stats.forty_time ?? stats['40yd'] ?? stats.forty ?? null
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTier(prospect: Prospect): string {
  return normalizeScoutingGradeTier(
    prospect.grade_tier,
    prospect.overall_grade ?? 0
  )
}

function clampScore(value: number | null | undefined): number {
  const next = Number(value ?? 0)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.min(100, next))
}

function toCardPlayer(prospect: Prospect): CardPlayer {
  return {
    rank: prospect.rank || 0,
    name: prospect.name,
    espnId: prospect.espn_id ? String(prospect.espn_id) : '',
    headshotUrl: prospect.headshot_url || null,
    school: prospect.school || 'TBD',
    year: prospect.draft_year ?? null,
    grade: prospect.overall_grade ?? null,
    tier: prospect.overall_grade == null ? 'Ungraded' : normalizeTier(prospect),
    height: formatHeight(prospect.height),
    weight: prospect.weight || 0,
    fortyTime: parseFortyTime(prospect.college_stats),
    production: prospect.college_production_score == null ? null : clampScore(prospect.college_production_score),
    physical: prospect.physical_measurables_score == null ? null : clampScore(prospect.physical_measurables_score),
    position: prospect.position,
    isCollege: (prospect.draft_year || 0) >= 2025,
    seasonLine: (prospect.draft_year || 0) >= 2028 && prospect.overall_grade == null ? formatSeasonLine(prospect.college_stats) : null,
  }
}

function getPlayerImageUrl(player: CardPlayer): string {
  if (player.headshotUrl) return player.headshotUrl
  if (!player.espnId) return ''
  if (player.isCollege) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${player.espnId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getTierColor(tier: string): { bg: string; text: string; border: string } {
  return (
    SCOUTING_TIER_STYLES[tier as ScoutingDisplayTier] ?? {
      bg: 'bg-secondary',
      text: 'text-foreground',
      border: 'border-border',
    }
  )
}

function StatBar({ label, value }: { label: string; value: number; delay?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-foreground w-6 text-right">{Math.round(value)}</span>
    </div>
  )
}

function UnifiedProspectCard({
  player,
  index,
  onClick,
  className,
  imageHeightClass = 'h-48',
}: {
  player: CardPlayer
  index: number
  onClick: () => void
  className?: string
  imageHeightClass?: string
}) {
  const [imageError, setImageError] = useState(false)
  const tierColor = getTierColor(player.tier)

  return (
    <div
      className={cn(
        'group relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-[fadeInUp_0.3s_ease_both]',
        className
      )}
      style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
      role="button"
      tabIndex={0}
      aria-label={`View scouting profile for ${player.name}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="text-3xl font-mono font-bold text-primary drop-shadow-lg">
          {player.position}
          {player.rank}
        </span>
      </div>

      <div className="absolute top-3 right-3 z-10">
        <span
          className={cn(
            'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border',
            tierColor.bg,
            tierColor.text,
            tierColor.border
          )}
        >
          {player.tier}
        </span>
      </div>

      <div
        className={cn(
          'relative bg-secondary/30 flex items-end justify-center overflow-hidden',
          imageHeightClass
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-[1]" />
        {!imageError && getPlayerImageUrl(player) ? (
          <Image
            src={getPlayerImageUrl(player)}
            alt={player.name}
            width={480}
            height={480}
            className="h-full w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-muted-foreground/20">
              {player.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 z-10">
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded border',
              player.isCollege
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border'
            )}
          >
            {player.year ?? '--'} {(player.year || 0) >= 2028 && player.grade == null ? 'PRELIMINARY' : player.isCollege ? 'PROSPECT' : 'CLASS'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-mono text-lg font-bold text-foreground tracking-tight mb-0.5 truncate">
          {player.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {player.school}
          {player.height && ` • ${player.height}`}
          {player.weight > 0 && ` • ${player.weight} lbs`}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-primary">
                {player.grade == null ? '—' : player.grade.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">Grade</span>
            </div>
          </div>
          {player.fortyTime && (
            <div className="text-right">
              <span className="text-lg font-mono font-semibold text-foreground">
                {player.fortyTime.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">40-YD</span>
            </div>
          )}
        </div>

        {player.production != null || player.physical != null ? (
          <div className="space-y-2">
            {player.production != null && <StatBar label="PROD" value={player.production} />}
            {player.physical != null && <StatBar label="PHYS" value={player.physical} />}
          </div>
        ) : <p className="text-xs text-muted-foreground">{player.seasonLine ? `2026 · ${player.seasonLine}` : 'Early class watchlist · evaluation pending'}</p>}
      </div>
    </div>
  )
}

export function ProspectCard({
  prospect,
  onSelect,
  onCompare: _onCompare,
  isOnBoard = false,
  variant = 'full',
}: ProspectCardProps) {
  const player = toCardPlayer(prospect)

  const imageHeightClass = variant === 'mini' ? 'h-36' : variant === 'compact' ? 'h-40' : 'h-48'

  return (
    <UnifiedProspectCard
      player={player}
      index={0}
      onClick={() => onSelect(prospect)}
      imageHeightClass={imageHeightClass}
      className={isOnBoard ? 'border-primary/60' : undefined}
    />
  )
}
