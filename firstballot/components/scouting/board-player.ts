import {
  normalizeScoutingGradeTier,
  SCOUTING_TIER_STYLES,
  type ScoutingDisplayTier,
} from '@/lib/scouting-grade-tier'
import { computeMyGrade } from '@/lib/user-grade'
import type { UserProspectGrade } from '@/types/prospect-grades'
import type { Prospect } from './types'

/**
 * The flattened, display-ready shape every draft board surface renders from.
 * Shared by DraftBoardTab, OffBoardPanel, and BoardBreakdownPanel so the three
 * cannot disagree about what a row is.
 */
export interface BoardPlayer {
  id: number
  rank: number
  name: string
  school: string
  position: string
  draftYear: number | null
  grade: number
  tier: string
  height: number | null
  weight: number
  fortyTime: number | null
  production: number
  physical: number
  espnId: string
  isCollege: boolean
  headshotUrl: string | null
}

/** Which of a row's two editable grade cells is open for input. */
export type GradeField = 'film' | 'talent'

export const BOARD_POSITIONS = ['QB', 'RB', 'WR', 'TE']
/** Earliest class the draft board will show — classes before this are history. */
export const DRAFT_BOARD_MIN_YEAR = 2027

export function getTierLabel(gradeTier: string | null, grade: number): string {
  return normalizeScoutingGradeTier(gradeTier, grade)
}

export function tierStyleFor(
  tier: string
): (typeof SCOUTING_TIER_STYLES)[ScoutingDisplayTier] {
  return SCOUTING_TIER_STYLES[tier as ScoutingDisplayTier] ?? SCOUTING_TIER_STYLES.Depth
}

export function parseForty(stats?: Record<string, number> | null): number | null {
  if (!stats) return null
  const raw = (stats as Record<string, number | string>).forty_time
  if (raw === undefined || raw === null || raw === '') return null
  const val = Number(raw)
  return Number.isFinite(val) ? val : null
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Board rows are ordered and labelled by class-overall rank, not position rank. */
export function overallRankOf(p: Prospect): number {
  return Number(p.overall_rank || p.rank || 9999)
}

export function toBoardPlayer(p: Prospect): BoardPlayer {
  return {
    id: p.id,
    rank: overallRankOf(p),
    name: p.name,
    school: p.school || 'TBD',
    position: p.position,
    draftYear: p.draft_year ?? null,
    grade: Number(p.overall_grade || 0),
    tier: getTierLabel(p.grade_tier, Number(p.overall_grade || 0)),
    height: p.height ? Number(p.height) : null,
    weight: Number(p.weight || 0),
    fortyTime: parseForty(p.college_stats || null),
    production: Math.round(Number(p.college_production_score || 0)),
    physical: Math.round(Number(p.physical_measurables_score || 0)),
    espnId: p.espn_id ? String(p.espn_id) : '',
    isCollege: (p.draft_year || 0) >= 2025,
    headshotUrl: p.headshot_url || null,
  }
}

export function getPlayerImageUrl(player: BoardPlayer): string {
  if (player.headshotUrl) return player.headshotUrl
  if (!player.espnId) return ''
  const espnId = player.espnId.includes('.') ? player.espnId.split('.')[0] : player.espnId
  if (player.isCollege) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${espnId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
}

export function formatHeight(inches: number | null): string {
  if (!inches || inches <= 0) return '—'
  const ft = Math.floor(inches / 12)
  const inch = inches % 12
  return `${ft}'${inch}"`
}

/** Returns percentile 0–1 for value within a list. 1 = best. */
export function rankPercentile(
  value: number,
  values: number[],
  lowerIsBetter = false
): number {
  if (values.length < 2) return 0.5
  const better = values.filter((v) => (lowerIsBetter ? v > value : v < value)).length
  return better / (values.length - 1)
}

/** Maps a 0–1 percentile to background + text color for heat cells. */
export function heatCell(pct: number): { bg: string; color: string } {
  if (pct >= 0.75) return { bg: 'rgba(16,185,129,0.18)', color: 'rgb(52,211,153)' }
  if (pct >= 0.5) return { bg: 'rgba(59,130,246,0.16)', color: 'rgb(96,165,250)' }
  if (pct >= 0.25) return { bg: 'rgba(245,158,11,0.16)', color: 'rgb(251,191,36)' }
  return { bg: 'rgba(239,68,68,0.16)', color: 'rgb(248,113,113)' }
}

/**
 * Reads one of the user's own grades off a row. Postgres NUMERIC can arrive as
 * a string, so everything is coerced before it reaches the math.
 */
export function userGradeOf(
  grade: UserProspectGrade | undefined,
  field: GradeField
): number | null {
  const raw = field === 'film' ? grade?.film_grade : grade?.talent_grade
  if (raw === null || raw === undefined) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** The user's composite MY GRADE for a prospect, or null when ungraded. */
export function myGradeOf(
  grades: Map<number, UserProspectGrade> | undefined,
  prospectId: number
): number | null {
  const grade = grades?.get(prospectId)
  if (!grade) return null
  return computeMyGrade(userGradeOf(grade, 'film'), userGradeOf(grade, 'talent'))
}

export function splitComparisons(raw: string): string[] {
  if (raw.includes('), ')) {
    const parts = raw.split('), ')
    return parts.map((part, idx) => (idx < parts.length - 1 ? `${part})` : part))
  }
  return raw.split(', ')
}

export function parseComparisonName(comp: string): string {
  const match = comp.match(/^(.+?)\s*\(/)
  if (match) return match[1].trim()
  return comp.trim()
}

export function getComparisonNames(
  comparisons: string | null | undefined,
  max = 6
): string[] {
  if (!comparisons) return []
  const names = splitComparisons(comparisons).map(parseComparisonName).filter(Boolean)
  return Array.from(new Set(names)).slice(0, max)
}
