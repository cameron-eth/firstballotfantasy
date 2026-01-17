/**
 * League Types
 * Centralized type definitions for league-related data structures
 */

// Base league information from Sleeper API
export interface League {
  league_id: string
  name: string
  season: string
  total_rosters: number
  roster_positions?: string[]
  scoring_settings?: Record<string, number>
  status?: 'pre_draft' | 'drafting' | 'in_season' | 'complete'
}

// Extended league with user-specific data
export interface UserLeague extends League {
  user_roster_id?: number
  user_team_name?: string
  is_default?: boolean
}

// League context state
export interface LeagueContextState {
  selectedLeagueId: string | null
  selectedLeague: UserLeague | null
  leagues: UserLeague[]
  isLoading: boolean
  error: string | null
}

// League context actions
export interface LeagueContextActions {
  selectLeague: (leagueId: string) => void
  addLeague: (leagueId: string) => Promise<boolean>
  removeLeague: (leagueId: string) => void
  refreshLeagues: () => Promise<void>
  setDefaultLeague: (leagueId: string) => void
}

// Combined context type
export type LeagueContextType = LeagueContextState & LeagueContextActions

// Props for league selector component
export interface LeagueSelectorProps {
  compact?: boolean
  className?: string
}

// Props for add league modal
export interface AddLeagueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeagueAdded?: (league: UserLeague) => void
}

// Sleeper user leagues API response
export interface SleeperLeagueResponse {
  league_id: string
  name: string
  season: string
  total_rosters: number
  roster_positions: string[]
  scoring_settings: Record<string, number>
  status: string
  sport: string
  season_type: string
}
