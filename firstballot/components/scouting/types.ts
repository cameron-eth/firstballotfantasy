export interface Prospect {
  id: number
  /** Positional rank inside the draft class (the "WR3" shown on cards). */
  rank: number
  /** Rank inside the draft class across all positions. */
  overall_rank?: number
  name: string
  first_name?: string | null
  last_name?: string | null
  position: string
  school: string
  espn_id: number | null
  cfbd_id?: number | null
  grade?: string
  notes?: string
  projectedRound?: string
  // Grading fields from database
  tier: string | null
  tier_numeric: number | null
  valuation: number | null
  overall_grade: number | null
  grade_tier: string | null
  nfl_comparisons: string | null
  // Physical attributes
  height: number | null
  weight: number | null
  hometown?: string | null
  jersey?: number | null
  class?: string | null // Freshman, Sophomore, Junior, Senior
  // Headshot & Team
  headshot_url?: string | null
  team_color?: string | null
  // Stats
  college_stats?: Record<string, number> | null
  college_production_score?: number | null
  physical_measurables_score?: number | null
  hs_recruiting_score?: number | null
  draft_projection_score?: number | null
  expert_consensus_score?: number | null
  draft_year: number | null
}

export interface ProspectCardProps {
  prospect: Prospect
  onSelect: (prospect: Prospect) => void
  onCompare: (prospect: Prospect) => void
  isOnBoard?: boolean
}

export type GradeTier =
  | 'Generational'
  | 'Elite'
  | 'Blue Chip'
  | 'Contributer'
  | 'Depth'
  | 'Walk-On'
  | 'Ungraded'

export type ProspectTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5'
