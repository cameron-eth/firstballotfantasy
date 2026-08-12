// Canonical Sleeper API shapes.
//
// Sleeper's own docs are loose about which fields are optional, so everything the
// API does not guarantee is marked optional here. Consumers narrow before use.

export type Sport = 'nfl'

export type CorePosition = 'QB' | 'RB' | 'WR' | 'TE'

export const CORE_POSITIONS: readonly CorePosition[] = ['QB', 'RB', 'WR', 'TE']

export interface SleeperUser {
  user_id: string
  username: string
  display_name?: string
  avatar?: string
}

export interface SleeperLeagueUser {
  user_id: string
  username?: string
  display_name?: string
  avatar?: string
  metadata?: { team_name?: string; [key: string]: unknown }
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  sport: Sport
  total_rosters: number
  draft_id?: string
  previous_league_id?: string
  /** Flat slot array, e.g. ['QB','RB','RB','WR','WR','TE','FLEX','SUPER_FLEX','BN','BN'] */
  roster_positions?: string[]
  settings?: Record<string, unknown>
  scoring_settings?: Record<string, number>
}

export interface SleeperRosterSettings {
  wins?: number
  losses?: number
  ties?: number
  fpts?: number
  fpts_decimal?: number
  fpts_against?: number
  fpts_against_decimal?: number
  waiver_position?: number
  total_moves?: number
}

export interface SleeperRoster {
  roster_id: number
  league_id?: string
  owner_id?: string
  players?: string[]
  starters?: string[]
  reserve?: string[]
  taxi?: string[]
  settings?: SleeperRosterSettings
}

export interface SleeperPlayer {
  player_id: string
  first_name?: string
  last_name?: string
  position?: string
  team?: string
  search_full_name?: string
  search_rank?: number
  status?: string
  age?: number
  years_exp?: number
  injury_status?: string | null
  injury_start_date?: string | null
  espn_id?: string
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number
  points: number
  custom_points: number | null
  starters: string[]
  players: string[]
  starters_points: number[] | null
  players_points: Record<string, number> | null
}

export interface SleeperTradedPick {
  season: string
  round: number
  /** Original owner of the pick — NOT the current holder. */
  roster_id: number
  previous_owner_id: number
  owner_id: number
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'trade' | 'waiver' | 'free_agent' | string
  status: string
  created: number
  leg: number
  roster_ids: number[]
  creator?: string
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks?: SleeperTradedPick[]
  waiver_budget?: { sender: number; receiver: number; amount: number }[]
}

export interface SleeperNflState {
  week: number
  display_week?: number
  season: string
  season_type: string
}

export interface SleeperTrendingItem {
  player_id: string
  count: number
}
