export interface PlayerRanking {
  player_id?: string | number | null
  rank: number
  player_name: string
  position: string
  team: string
  age: number
  total_score: number
  tier: string
  draft_year?: number | null
  draft_class?: number | null
  espn_id?: string | null
  headshot_url?: string | null
  age_score?: number
  draft_capital_score?: number
  recent_form_score?: number
  volume_score?: number
  td_efficiency_score?: number
  versatility_score?: number
  epa_efficiency_score?: number
}

export type SortField = 'rank' | 'total_score' | 'age' | 'player_name'
export type SortDirection = 'asc' | 'desc'

export interface RankingsFilters {
  searchTerm: string
  positionFilter: string
  tierFilter: string
}

export interface RankingsPagination {
  currentPage: number
  itemsPerPage: number
  totalPages: number
}

export interface RankingsSort {
  field: SortField
  direction: SortDirection
}
