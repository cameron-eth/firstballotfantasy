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

export interface PlayerData {
  playerId: string
  playerName: string
  position: string
  team: string
  rank: number
  tier: string
  age: number
  experience: number
  status: string
  injury_status?: string | null
  injury_start_date?: string | null
  isOnBye?: boolean
  espn_id?: string
  headshot_url?: string | null
  fantasy_points_ppr?: number
  fantasy_points_half_ppr?: number
  fantasy_points?: number
  games_played?: number
  fantasy_ppg?: number
  rankingData?: {
    rank: number
    position: string
    team: string
    name: string
    tier: number
  }
}

export interface MatchupData {
  rosterId: number
  teamName: string
  projectedPoints: number
  actualPoints: number
  opponentRosterId: number
  opponentTeamName: string
  opponentProjectedPoints: number
  opponentActualPoints: number
  isHome: boolean
  matchupId?: number
  starters?: string[]
  players?: string[]
  startersPoints?: number[]
  playersPoints?: Record<string, number>
  opponentAvatar?: string
  opponentUsername?: string
  opponentDisplayName?: string
}

export interface Transaction {
  transactionId: string
  type: 'trade' | 'free_agent' | 'waiver'
  status: 'complete' | 'failed'
  created: number
  rosterIds: number[]
  adds?: Record<string, number>
  drops?: Record<string, number>
  week?: number
}

export interface TeamData {
  rosterId: number
  teamName: string
  ownerName: string
  ownerAvatar?: string
  ownerUsername?: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  grade: string
  gradeScore: number
  players: PlayerData[]
  starters: string[]
  trends: TeamTrends
  positionStrengths: PositionStrengths
  currentWeekProjection?: number
  waiverPosition: number
  totalMoves: number
  recentForm: string
}

export interface TeamTrends {
  recentForm: string
  winStreak: number
  avgPointsLast4: number
  bestPlayer: PlayerData
  breakoutCandidate: PlayerData
  sleeperPick: PlayerData
}

export interface PositionStrengths {
  QB: number
  RB: number
  WR: number
  TE: number
  FLEX: number
  SFLX: number
}
