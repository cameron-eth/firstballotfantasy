// League Buddy Type Definitions

export interface LeagueBuddyProps {
  leagueId: string
  user?: any
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
  trends: TeamTrends
  positionStrengths: PositionStrengths
  currentWeekProjection?: number
  waiverPosition: number
  totalMoves: number
  recentForm: string
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
  espn_id?: string
  rankingData?: {
    rank: number
    position: string
    team: string
    name: string
    tier: number
  }
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
}

export interface LeagueOverview {
  totalTeams: number
  currentWeek: number
  seasonType: string
  averagePointsPerTeam: number
  highestScoringTeam: string
  lowestScoringTeam: string
  trendingPlayers: TrendingPlayer[]
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

export interface Transaction {
  transactionId: string
  type: 'trade' | 'free_agent' | 'waiver'
  status: string
  week: number
  rosterIds: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draftPicks: any[]
  waiverBudget: any[]
  creator: string
  created: number
  consenterIds: number[]
  metadata: any
}

