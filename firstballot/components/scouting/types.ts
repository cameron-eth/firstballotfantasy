export interface Prospect {
  id: number
  rank: number
  name: string
  position: string
  school: string
  espn_id: number | null
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
  height: number | null
  weight: number | null
  draft_year: number | null
}

export interface ProspectCardProps {
  prospect: Prospect
  onSelect: (prospect: Prospect) => void
  onCompare: (prospect: Prospect) => void
  isOnBoard?: boolean
}

export type GradeTier =
  | 'Elite'
  | 'Blue Chip'
  | 'Starter'
  | 'Rotational'
  | 'Backup'
  | 'Depth'
  | 'Ungraded'

export type ProspectTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5'
