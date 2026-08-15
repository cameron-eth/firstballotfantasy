// ProspectBoard Data Layer
// Types and data fetching for the prospect board

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  grade: number
  height: string
  weight: number | null
  fortyTime: number | null
  production: number
  physical: number
  valuation: number
  year: number | null
  isCollege: boolean
  headshotUrl: string | null
}

// ---------------------------------------------------------------------------
// Tier colors matching the design system
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Elite: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  'Blue Chip': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  Starter: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  Rotational: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  Depth: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
  Longshot: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
}

const FALLBACK_TIER = {
  bg: 'bg-slate-500/10',
  text: 'text-slate-500',
  border: 'border-slate-600/20',
}

export function getTierColor(tier: string | null) {
  if (!tier) return FALLBACK_TIER
  if (TIER_COLORS[tier]) return TIER_COLORS[tier]

  // Positional rank tiers (e.g. "WR5", "QB2", "RB12", "TE3")
  if (/^QB\d+$/i.test(tier))
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
  if (/^RB\d+$/i.test(tier))
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }
  if (/^WR\d+$/i.test(tier))
    return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
  if (/^TE\d+$/i.test(tier))
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }

  return FALLBACK_TIER
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
    tier: raw.grade_tier || 'Depth',
    positionRank: `${raw.position}${raw.rank}`,
    grade: raw.overall_grade || 0,
    height: formatHeight(raw.height),
    weight: raw.weight ? Math.round(raw.weight) : null,
    fortyTime: fortyRaw ? Number(fortyRaw) : null,
    production: Math.round(raw.college_production_score || 0),
    physical: Math.round(raw.physical_measurables_score || 0),
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
      .filter((p) => p.position === pos && p.overall_grade !== null)
      .sort((a, b) => (b.overall_grade || 0) - (a.overall_grade || 0))
    result[pos] = filtered.map((raw, index) => {
      const normalized = normalize(raw)
      // Rank reflects position within this grade-sorted list, across all classes.
      const positionalRank = index + 1
      return {
        ...normalized,
        rank: positionalRank,
        positionRank: `${pos}${positionalRank}`,
      }
    })
  }

  return result
}
