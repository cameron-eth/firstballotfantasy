// ProspectBoard Data Layer
// Types and data fetching for the prospect board

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import { prospectTier } from '@/lib/scouting-grade-tier'

export type Position = 'QB' | 'RB' | 'WR' | 'TE'

// Raw API shape from /api/prospects
interface RawProspect {
  id: number
  rank: number
  name: string
  first_name?: string | null
  last_name?: string | null
  position: string
  school: string
  espn_id: number | null
  draft_year: number | null
  overall_grade: number | null
  valuation?: number | null
  grade_tier: string | null
  tier: string | null
  height: number | null
  weight: number | null
  college_stats: Record<string, number | string> | null
  headshot_url?: string | null
  nfl_comparisons?: string | null
  college_production_score?: number | null
  physical_measurables_score?: number | null
  hs_recruiting_score?: number | null
  draft_projection_score?: number | null
  expert_consensus_score?: number | null
}

// Normalized shape consumed by components
export interface Player {
  id: number
  rank: number
  name: string
  position: Position
  school: string
  espnId: number | null
  /** Scouting grade tier from the database — the facet the tier filter uses. */
  tier: string
  /** Positional-rank badge shown on the card, e.g. "WR3". */
  positionRank: string
  grade: number | null
  height: string
  weight: number | null
  fortyTime: number | null
  production: number | null
  physical: number | null
  valuation: number
  year: number | null
  isCollege: boolean
  headshotUrl: string | null
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

export function getPlayerImageUrl(player: Player): string {
  if (player.headshotUrl) return player.headshotUrl
  if (player.espnId) {
    if (player.isCollege) {
      return `https://a.espncdn.com/i/headshots/college-football/players/full/${player.espnId}.png`
    }
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`
  }
  return ''
}

// ---------------------------------------------------------------------------
// Height formatter (inches → "6'2"")
// ---------------------------------------------------------------------------

function formatHeight(inches: number | null): string {
  if (!inches) return '—'
  const ft = Math.floor(inches / 12)
  const rem = Math.round(inches % 12)
  return `${ft}'${rem}"`
}

// ---------------------------------------------------------------------------
// Transform raw API data into the normalized Player shape
// ---------------------------------------------------------------------------

function normalize(raw: RawProspect): Player {
  const fortyRaw = raw.college_stats?.forty_time
  return {
    id: raw.id,
    // Keep API-provided positional rank (e.g., RB3) rather than deriving from list index.
    rank: raw.rank,
    name: raw.name,
    position: raw.position as Position,
    school: raw.school || 'TBD',
    espnId: raw.espn_id,
    tier: prospectTier(raw),
    positionRank: `${raw.position}${raw.rank}`,
    grade: raw.overall_grade ?? null,
    height: formatHeight(raw.height),
    weight: raw.weight ? Math.round(raw.weight) : null,
    fortyTime: fortyRaw ? Number(fortyRaw) : null,
    production:
      raw.college_production_score == null ? null : Math.round(raw.college_production_score),
    physical:
      raw.physical_measurables_score == null ? null : Math.round(raw.physical_measurables_score),
    valuation: raw.valuation ? Number(raw.valuation) : raw.overall_grade || 0,
    year: raw.draft_year,
    isCollege: (raw.draft_year || 0) >= 2025,
    headshotUrl: raw.headshot_url || null,
  }
}

// ---------------------------------------------------------------------------
// Data fetching — loads all positions at once for instant tab switching
// ---------------------------------------------------------------------------

export async function fetchAllProspects(): Promise<Record<Position, Player[]>> {
  const res = await fetch('/api/prospects?draft_year=all')
  if (!res.ok) throw new Error('Failed to fetch prospects')
  const data: RawProspect[] = await res.json()

  const result: Record<Position, Player[]> = { QB: [], RB: [], WR: [], TE: [] }

  for (const pos of ['QB', 'RB', 'WR', 'TE'] as Position[]) {
    const filtered = data
      .filter((p) => p.position === pos)
      .sort((a, b) => (b.overall_grade || 0) - (a.overall_grade || 0))
    result[pos] = filtered.map((raw) => {
      const normalized = normalize(raw)
      return {
        ...normalized,
        rank: normalized.rank,
        positionRank: `${pos}${normalized.rank}`,
      }
    })
  }

  return result
}
