import type { SleeperUser } from '@/lib/sleeper-api'
import type { UserLeague } from '@/types/league'

// Type definitions for LeagueBuddy component

export interface LeagueBuddyProps {
  leagueId: string
  user?: SleeperUser | null
  leagues?: UserLeague[]
  onLeagueChange?: (leagueId: string) => void
}

export type LeagueSection = 'overview' | 'roster' | 'power' | 'league' | 'audit'

export interface PlayerRankingSummary {
  rank: number
  position: string
  team: string
  name: string
  tier: number
  projection?: number
}

export type PlayerRankingsMap = Record<string, PlayerRankingSummary>

export interface OverviewActions {
  onTradeMarketClick: () => void
  onScoutingPortalClick: () => void
  onDraftBuddyClick: () => void
  onPlayoffOddsClick?: () => void
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'trade' | 'waiver' | 'free_agent'
  status: 'complete' | 'failed'
  created: number // unix ms
  roster_ids: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: unknown[]
  leg: number
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
  starters: string[] // Sleeper player IDs of starters from roster
  positionStrengths: PositionStrengths
  waiverPosition: number
  totalMoves: number
  recentForm: string
  transactions?: SleeperTransaction[] // all completed transactions this team was part of
}

export interface KtcHistoryPoint {
  scraped_date: string
  value_sf: number
  value_1qb: number
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
  injury_status?: string | null // Injury status from Sleeper API (e.g., 'Questionable', 'Doubtful', 'Out', 'IR')
  injury_start_date?: string | null // Injury start date from Sleeper API - if not null, player is injured
  isOnBye?: boolean // Whether player's team is on bye week
  espn_id?: string
  headshot_url?: string | null // Player headshot URL from NFL data
  fantasy_points_ppr?: number
  fantasy_points_half_ppr?: number
  fantasy_points?: number
  games_played?: number
  fantasy_ppg?: number // Fantasy points per game from NGS
  rankingData?: {
    rank: number
    position: string
    team: string
    name: string
    tier: number
  }
  ktcHistory?: KtcHistoryPoint[] // KTC value history for sparkline
  ktcValueSf?: number // Latest KTC SF value
  ktcValue1qb?: number // Latest KTC 1QB value
  ktcTrendDelta?: number // Change in KTC SF value over the history window
}

export interface PositionStrengths {
  QB: number
  RB: number
  WR: number
  TE: number
  FLEX: number
  SFLX: number
}

// Raw Sleeper API matchup structure
export interface SleeperMatchup {
  starters: string[]
  roster_id: number
  players: string[]
  matchup_id: number
  points: number
  custom_points: number | null
  starters_points: number[] | null
  players_points: Record<string, number> | null
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

export interface LeagueOverview {
  totalTeams: number
  currentWeek: number
  seasonType: string
  averagePointsPerTeam: number
  highestScoringTeam: string
  lowestScoringTeam: string
  trendingPlayers: TrendingPlayer[]
  rosterPositions: Record<string, number>
}

export interface TrendingPlayer {
  playerId: string
  playerName: string
  position: string
  team: string
  addCount: number
  dropCount: number
  netChange: number
  espn_id?: string
}

// Constants for better maintainability
export const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  A: 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  B: 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  C: 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  D: 'bg-red-400/20 text-red-400 border-red-400',
  F: 'bg-red-400/20 text-red-400 border-red-400',
} as const

export const POSITION_COLORS = {
  QB: 'bg-blue-500',
  RB: 'bg-green-500',
  WR: 'bg-yellow-500',
  TE: 'bg-purple-500',
  K: 'bg-pink-500',
  DEF: 'bg-gray-500',
}
