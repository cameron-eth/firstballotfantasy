'use client'

import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { prospectTier } from '@/lib/scouting-grade-tier'
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
    tier: prospectTier(prospect),
    height: formatHeight(prospect.height),
    weight: prospect.weight || 0,
    fortyTime: parseFortyTime(prospect.college_stats),
    production:
      prospect.college_production_score == null
        ? null
        : clampScore(prospect.college_production_score),
    physical:
      prospect.physical_measurables_score == null
        ? null
        : clampScore(prospect.physical_measurables_score),
    position: prospect.position,
    isCollege: (prospect.draft_year || 0) >= 2025,
    seasonLine:
      (prospect.draft_year || 0) >= 2028 && prospect.overall_grade == null
        ? formatSeasonLine(prospect.college_stats)
        : null,
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

export function ProspectCard({
  prospect,
  onSelect,
  isOnBoard = false,
  variant = 'full',
}: ProspectCardProps) {
  const player = toCardPlayer(prospect)
  return (
    <PlayerTradingCard
      name={player.name}
      position={player.position}
      team={player.school}
      image={getPlayerImageUrl(player)}
      imageHeight={variant === 'mini' ? 'h-36' : variant === 'compact' ? 'h-40' : 'h-48'}
      badge={`${player.position}${player.rank || '—'} · ${player.tier}${isOnBoard ? ' · On your board' : ''}`}
      label={`${player.year ?? 'Class TBD'}${player.year && player.year >= 2028 && player.grade == null ? ' · Preliminary' : ''}`}
      action="Scout player"
      onAction={() => onSelect(prospect)}
    >
      <div className="flex items-baseline justify-between gap-2 border-t border-white/10 pt-3">
        <span className="text-slate-400">Scouting grade</span>
        <strong className="text-lg tabular-nums text-white">
          {player.grade == null ? '—' : player.grade.toFixed(1)}
        </strong>
      </div>
      <p className="mt-2 text-slate-400">
        {[
          player.height,
          player.weight ? `${player.weight} lbs` : null,
          player.fortyTime ? `${player.fortyTime.toFixed(2)}s 40` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {(player.production != null || player.physical != null) && (
        <div className="mt-2 flex justify-between gap-2 text-slate-400">
          {player.production != null && (
            <span>
              Production <strong className="text-white">{Math.round(player.production)}</strong>
            </span>
          )}
          {player.physical != null && (
            <span>
              Physical <strong className="text-white">{Math.round(player.physical)}</strong>
            </span>
          )}
        </div>
      )}
      {player.seasonLine && (
        <p className="mt-2 leading-relaxed text-slate-400">{player.seasonLine}</p>
      )}
    </PlayerTradingCard>
  )
}
