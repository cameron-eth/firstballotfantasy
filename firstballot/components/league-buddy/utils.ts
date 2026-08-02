// Utility functions for LeagueBuddy component
import type { PlayerData, TeamTrends, PositionStrengths, TeamData, SleeperTransaction } from './types'
import type { LeaguePlacements } from './competitiveState'

// Utility functions for data validation and processing
export const validateApiResponse = (response: Response, endpoint: string): boolean => {
  if (!response.ok) {
    console.error(`API Error for ${endpoint}:`, response.status, response.statusText)
    return false
  }
  return true
}

export const safeJsonParse = async (response: Response): Promise<any> => {
  try {
    return await response.json()
  } catch (error) {
    console.error('JSON parsing error:', error)
    return null
  }
}

export const getTierFromRank = (rank: number): string => {
  if (!rank || rank <= 0) return 'Tier 4'
  if (rank <= 12) return 'Tier 1'
  if (rank <= 24) return 'Tier 2'
  if (rank <= 48) return 'Tier 3'
  return 'Tier 4'
}

export const calculateRawScore = (players: PlayerData[]): number => {
  if (!players || players.length === 0) return 0

  const tier1Count = players.filter((p) => p.tier === 'Tier 1').length
  const tier2Count = players.filter((p) => p.tier === 'Tier 2').length
  const avgRank = players.reduce((sum, p) => sum + (p.rank || 999) / players.length, 0)
  const youngPlayers = players.filter((p) => p.age && p.age <= 25).length
  const experiencedPlayers = players.filter((p) => p.experience && p.experience >= 3).length

  let score = 0
  score += tier1Count * 15
  score += tier2Count * 10
  score += Math.max(0, 100 - avgRank)
  score += youngPlayers * 2
  score += experiencedPlayers * 1

  return Math.max(0, score) // Ensure non-negative score
}

export const calculateGradeFromPercentile = (
  score: number,
  allScores: number[]
): { letter: string; score: number } => {
  if (!allScores || allScores.length === 0) return { letter: 'F', score: 0 }

  const sortedScores = [...allScores].sort((a, b) => b - a)
  const scoreIndex = sortedScores.findIndex((s) => s <= score)
  const percentile =
    scoreIndex === -1 ? 100 : ((sortedScores.length - scoreIndex) / sortedScores.length) * 100

  let letter = 'C'
  if (percentile >= 90) letter = 'A+'
  else if (percentile >= 80) letter = 'A'
  else if (percentile >= 70) letter = 'A-'
  else if (percentile >= 60) letter = 'B+'
  else if (percentile >= 50) letter = 'B'
  else if (percentile >= 40) letter = 'B-'
  else if (percentile >= 30) letter = 'C+'
  else if (percentile >= 20) letter = 'C'
  else if (percentile >= 10) letter = 'C-'
  else letter = 'D'

  return { letter, score: Math.round(percentile) }
}

export const calculateTeamTrends = (players: PlayerData[]): TeamTrends => {
  if (!players || players.length === 0) {
    const emptyPlayer: PlayerData = {
      playerId: '',
      playerName: 'No Players',
      position: 'N/A',
      team: 'N/A',
      rank: 999,
      tier: 'Tier 4',
      age: 0,
      experience: 0,
      status: 'Inactive',
    }
    return {
      recentForm: 'N/A',
      winStreak: 0,
      avgPointsLast4: 0,
      bestPlayer: emptyPlayer,
      breakoutCandidate: emptyPlayer,
      sleeperPick: emptyPlayer,
    }
  }

  const sortedByRank = [...players].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  const youngPlayers = players.filter((p) => p.age && p.age <= 23)
  const breakoutCandidates = youngPlayers
    .filter((p) => (p.rank || 999) <= 10)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))

  return {
    recentForm: 'Hot', // Placeholder
    winStreak: 3, // Placeholder
    avgPointsLast4: 125.5, // Placeholder
    bestPlayer: sortedByRank[0] || players[0],
    breakoutCandidate: breakoutCandidates[0] || players[0],
    sleeperPick: players.find((p) => (p.rank || 999) > 10 && p.age <= 25) || players[0],
  }
}

/**
 * Score the top-N players at each position using their rank.
 * rank 1 → 100 pts, rank 200+ → ~0 pts. Normalized to 0–100 output.
 */
export const calculatePositionStrengths = (players: PlayerData[]): PositionStrengths => {
  // How many starters to consider per position (dynasty SF context)
  const starterSlots: Record<string, number> = { QB: 2, RB: 4, WR: 4, TE: 2 }

  function positionScore(pos: string): number {
    const posPlayers = players
      .filter((p) => p.position?.toUpperCase() === pos && (p.rank ?? 999) < 999)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .slice(0, starterSlots[pos] ?? 3)

    if (posPlayers.length === 0) return 0

    // Each rank maps to a score: rank 1=100, rank 300=0 (linear decay)
    const rankCap = 300
    const rawScores = posPlayers.map((p) => Math.max(0, (rankCap - (p.rank ?? rankCap)) / rankCap * 100))
    const avg = rawScores.reduce((s, v) => s + v, 0) / rawScores.length

    return Math.round(avg)
  }

  return {
    QB: positionScore('QB'),
    RB: positionScore('RB'),
    WR: positionScore('WR'),
    TE: positionScore('TE'),
    FLEX: 0,
    SFLX: 0,
  }
}

export const calculateRecentForm = (roster: any, matchups: any[]): string => {
  if (!matchups || matchups.length === 0) return 'N/A'

  const rosterMatchups = matchups.filter((m: any) => m.roster_id === roster.roster_id)
  if (rosterMatchups.length === 0) return 'N/A'

  let wins = 0
  let losses = 0
  let ties = 0

  rosterMatchups.forEach((matchup: any) => {
    const opponentMatchup = matchups.find(
      (m: any) => m.matchup_id === matchup.matchup_id && m.roster_id !== roster.roster_id
    )

    if (opponentMatchup) {
      const teamPoints = matchup.points || 0
      const opponentPoints = opponentMatchup.points || 0

      if (teamPoints > opponentPoints) wins++
      else if (teamPoints < opponentPoints) losses++
      else ties++
    }
  })

  const totalGames = wins + losses + ties
  if (totalGames === 0) return 'N/A'

  const winRate = (wins / totalGames) * 100
  if (winRate >= 70) return 'Hot'
  if (winRate >= 50) return 'Neutral'
  if (winRate >= 30) return 'Cold'
  return 'Very Cold'
}

// Helper function for rank color calculations
export const getRankColor = (rank: number): string => {
  if (rank <= 3) return 'bg-green-900/70 text-green-100 border-green-700/40'
  if (rank <= 6) return 'bg-yellow-900/70 text-yellow-100 border-yellow-700/40'
  if (rank <= 9) return 'bg-orange-900/70 text-orange-100 border-orange-700/40'
  return 'bg-red-900/70 text-red-100 border-red-700/40'
}

// League position ranking calculations
export const calculateLeaguePositionRankings = (
  sortedTeams: TeamData[]
): Record<string, Record<string, number>> => {
  if (!sortedTeams || sortedTeams.length === 0) return {}

  const positions = ['QB', 'RB', 'WR', 'TE']
  const teamPositionScores: Record<string, Record<string, number>> = {}

  // Calculate position scores for each team
  sortedTeams.forEach((team) => {
    if (!team || !team.rosterId || !team.players) return

    teamPositionScores[team.rosterId] = {}

    positions.forEach((position) => {
      const positionPlayers = team.players.filter((p) => p && p.position && p.position === position)
      if (positionPlayers.length === 0) {
        teamPositionScores[team.rosterId][position] = 999 // Worst possible score
      } else {
        // Use best player rank for QB, average of top 2 for skill positions
        const sortedRanks = positionPlayers.map((p) => p.rank || 999).sort((a, b) => a - b)
        if (position === 'QB') {
          teamPositionScores[team.rosterId][position] = sortedRanks[0]
        } else {
          // Average of top 2 players for RB/WR/TE
          teamPositionScores[team.rosterId][position] =
            (sortedRanks[0] + (sortedRanks[1] || sortedRanks[0])) / 2
        }
      }
    })

    // FLEX is based on overall team grade score
    teamPositionScores[team.rosterId]['FLEX'] = Math.max(0, 100 - (team.gradeScore || 0))
  })

  // Rank teams by position (1 = best position group in league)
  const positionRankings: Record<string, Record<string, number>> = {}

  const allPositions = [...positions, 'FLEX']
  allPositions.forEach((position) => {
    const teamScores = sortedTeams
      .filter((team) => team && team.rosterId && teamPositionScores[team.rosterId])
      .map((team) => ({
        rosterId: team.rosterId,
        score: teamPositionScores[team.rosterId][position] || 999,
      }))
      .sort((a, b) => a.score - b.score) // Lower score = better rank

    teamScores.forEach((teamScore, index) => {
      if (!positionRankings[teamScore.rosterId]) positionRankings[teamScore.rosterId] = {}
      positionRankings[teamScore.rosterId][position] = index + 1
    })
  })

  return positionRankings
}

// Lineup calculation functions
export interface OpponentInfo {
  opponentTeam: string
  isHome: boolean
  matchupRating: string
  gameTime: null
}

export const getOpponentInfo = (
  player: PlayerData,
  nflGames: Record<string, { opponent: string; isHome: boolean }>
): OpponentInfo => {
  const gameInfo = nflGames[player.team]

  if (gameInfo && gameInfo.opponent && gameInfo.opponent !== 'TBD') {
    const { opponent, isHome } = gameInfo

    const toughDefenses = ['BAL', 'SF', 'BUF', 'DAL', 'PIT', 'CLE', 'NYJ', 'PHI']
    const eliteMatchups = ['ARI', 'CAR', 'DEN', 'LV', 'NYG', 'WAS', 'ATL', 'IND']
    const goodMatchups = ['GB', 'KC', 'LAC', 'MIA', 'TB', 'HOU']

    let matchupRating = 'Average'
    if (toughDefenses.includes(opponent)) matchupRating = 'Tough'
    else if (eliteMatchups.includes(opponent)) matchupRating = 'Elite'
    else if (goodMatchups.includes(opponent)) matchupRating = 'Good'
    else matchupRating = 'Great'

    return {
      opponentTeam: opponent,
      isHome,
      matchupRating,
      gameTime: null,
    }
  }

  // No game info = bye week
  return {
    opponentTeam: 'BYE',
    isHome: false,
    matchupRating: 'Average',
    gameTime: null,
  }
}

export const calculateProjection = (player: PlayerData, matchupRating: string): number => {
  let avgFPPG = 0

  if (player.fantasy_ppg && player.fantasy_ppg > 0) {
    avgFPPG = player.fantasy_ppg
  } else {
    switch (player.position) {
      case 'QB':
        if (player.rank <= 6) avgFPPG = 22
        else if (player.rank <= 12) avgFPPG = 19
        else if (player.rank <= 18) avgFPPG = 17
        else if (player.rank <= 24) avgFPPG = 15
        else avgFPPG = 12
        break
      case 'RB':
        if (player.rank <= 12) avgFPPG = 16
        else if (player.rank <= 24) avgFPPG = 13
        else if (player.rank <= 36) avgFPPG = 11
        else if (player.rank <= 48) avgFPPG = 9
        else avgFPPG = 7
        break
      case 'WR':
        if (player.rank <= 12) avgFPPG = 15
        else if (player.rank <= 24) avgFPPG = 12
        else if (player.rank <= 36) avgFPPG = 10
        else if (player.rank <= 48) avgFPPG = 8
        else avgFPPG = 6
        break
      case 'TE':
        if (player.rank <= 6) avgFPPG = 12
        else if (player.rank <= 12) avgFPPG = 9
        else if (player.rank <= 18) avgFPPG = 7
        else avgFPPG = 5
        break
      default:
        avgFPPG = 8
    }
  }

  let matchupModifier = 1.0
  if (matchupRating === 'Elite') matchupModifier = 1.15
  else if (matchupRating === 'Great') matchupModifier = 1.08
  else if (matchupRating === 'Good') matchupModifier = 1.03
  else if (matchupRating === 'Average') matchupModifier = 1.0
  else if (matchupRating === 'Tough') matchupModifier = 0.88

  const variance = (Math.random() * 2 - 1) * 1.2

  return Math.max(0, Math.round((avgFPPG * matchupModifier + variance) * 10) / 10)
}

export interface LineupSlot {
  position: string
  player: PlayerData
  slotType: 'starter' | 'flex' | 'superflex'
}

export interface BuildLineupResult {
  lineup: LineupSlot[]
  bench: PlayerData[]
}

export interface RosterPositions {
  QB?: number
  RB?: number
  WR?: number
  TE?: number
  FLEX?: number
  SUPER_FLEX?: number
}

/**
 * Sleeper's roster_positions is a flat slot array (e.g. ['QB','RB','RB','WR','WR','TE',
 * 'FLEX','SUPER_FLEX','BN','BN',...]), not a position->count map. Tally it into counts,
 * ignoring bench/IR/taxi slots and any position buildLineup doesn't fill (K, DEF, etc).
 */
export const countRosterPositions = (positions: string[] | undefined): RosterPositions => {
  // Empty/missing input means "unknown" — return {} so callers can fall back to sane
  // defaults instead of zeroing out every slot.
  if (!Array.isArray(positions) || positions.length === 0) return {}

  const counts: RosterPositions = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 }
  const ignored = new Set(['BN', 'IR', 'TAXI'])
  for (const slot of positions) {
    const key = slot?.toUpperCase()
    if (!key || ignored.has(key) || !(key in counts)) continue
    counts[key as keyof RosterPositions] = (counts[key as keyof RosterPositions] ?? 0) + 1
  }
  return counts
}

// Helper function to check if player should be excluded from optimized lineup
export const isPlayerAvailable = (player: PlayerData): boolean => {
  // Exclude injured players - specifically IR and Doubtful statuses
  // Also exclude if injury_start_date is set (indicates active injury)
  const injuryStatus = (player.injury_status || '').toString().toLowerCase().trim()

  // Filter out: IR, Out, Doubtful (case-insensitive)
  // Note: Questionable players are still available (they might play)
  const excludedStatuses = ['ir', 'out', 'doubtful']
  const hasExcludedStatus = injuryStatus && excludedStatuses.includes(injuryStatus)

  // Also exclude if injury_start_date is set (indicates active injury)
  const hasInjuryDate = player.injury_start_date !== null && player.injury_start_date !== undefined

  const isInjured = hasExcludedStatus || hasInjuryDate

  // Exclude players on bye week
  const isBye = player.isOnBye === true

  // Player is available if not injured and not on bye
  return !isInjured && !isBye
}

/**
 * Prefer fantasy_ppg (points per game) when available — a more realistic proxy for
 * "who should start" than static rank. Falls back to rank when ppg data is missing,
 * and prefers a player with ppg data over one without regardless of rank.
 */
function compareByProjection(a: PlayerData, b: PlayerData): number {
  const aHasPpg = typeof a.fantasy_ppg === 'number' && a.fantasy_ppg > 0
  const bHasPpg = typeof b.fantasy_ppg === 'number' && b.fantasy_ppg > 0
  if (aHasPpg && bHasPpg) return b.fantasy_ppg! - a.fantasy_ppg!
  if (aHasPpg !== bHasPpg) return aHasPpg ? -1 : 1
  return (a.rank ?? 999) - (b.rank ?? 999)
}

export const buildLineup = (
  players: PlayerData[],
  mode: 'current' | 'optimized',
  currentStarters: string[],
  rosterPositions: RosterPositions,
  whatIfStarters?: string[]
): BuildLineupResult => {
  const lineup: LineupSlot[] = []
  const bench: PlayerData[] = []
  const usedPlayers = new Set<string>()

  // Filter out injured/bye players for optimized mode only
  // This excludes: IR, Out, Doubtful players, players with injury_start_date set, and players on bye week
  // In 'current' mode, show all players for visibility (even if injured/bye)
  const availablePlayers = mode === 'optimized' ? players.filter(isPlayerAvailable) : players

  if (mode === 'current' && whatIfStarters && whatIfStarters.length > 0) {
    whatIfStarters.forEach((playerId) => {
      const player = players.find((p) => p.playerId === playerId)
      if (player) {
        // In current mode, show all players even if injured/bye (for visibility)
        lineup.push({ position: player.position, player, slotType: 'starter' })
        usedPlayers.add(playerId)
      }
    })
  } else if (mode === 'current' && currentStarters.length > 0) {
    currentStarters.forEach((playerId) => {
      const player = players.find((p) => p.playerId === playerId)
      if (player) {
        // In current mode, show all players even if injured/bye (for visibility)
        lineup.push({ position: player.position, player, slotType: 'starter' })
        usedPlayers.add(playerId)
      }
    })
  } else {
    // Optimized mode: use filtered availablePlayers, ranked by projected points (rank as fallback)
    const qbs = availablePlayers.filter((p) => p.position === 'QB').sort(compareByProjection)
    const rbs = availablePlayers.filter((p) => p.position === 'RB').sort(compareByProjection)
    const wrs = availablePlayers.filter((p) => p.position === 'WR').sort(compareByProjection)
    const tes = availablePlayers.filter((p) => p.position === 'TE').sort(compareByProjection)
    const flexEligible = [...rbs, ...wrs, ...tes].sort(compareByProjection)
    const superFlexEligible = [...qbs, ...rbs, ...wrs, ...tes].sort(compareByProjection)

    for (let i = 0; i < (rosterPositions.QB || 0); i++) {
      if (qbs[i]) {
        lineup.push({ position: 'QB', player: qbs[i], slotType: 'starter' })
        usedPlayers.add(qbs[i].playerId)
      }
    }

    for (let i = 0; i < (rosterPositions.RB || 0); i++) {
      if (rbs[i]) {
        lineup.push({ position: 'RB', player: rbs[i], slotType: 'starter' })
        usedPlayers.add(rbs[i].playerId)
      }
    }

    for (let i = 0; i < (rosterPositions.WR || 0); i++) {
      if (wrs[i]) {
        lineup.push({ position: 'WR', player: wrs[i], slotType: 'starter' })
        usedPlayers.add(wrs[i].playerId)
      }
    }

    for (let i = 0; i < (rosterPositions.TE || 0); i++) {
      if (tes[i]) {
        lineup.push({ position: 'TE', player: tes[i], slotType: 'starter' })
        usedPlayers.add(tes[i].playerId)
      }
    }

    const remainingFlex = flexEligible.filter((p) => !usedPlayers.has(p.playerId))
    for (let i = 0; i < (rosterPositions.FLEX || 0); i++) {
      if (remainingFlex[i]) {
        lineup.push({ position: 'FLEX', player: remainingFlex[i], slotType: 'flex' })
        usedPlayers.add(remainingFlex[i].playerId)
      }
    }

    const remainingSuperFlex = superFlexEligible.filter((p) => !usedPlayers.has(p.playerId))
    for (let i = 0; i < (rosterPositions.SUPER_FLEX || 0); i++) {
      if (remainingSuperFlex[i]) {
        lineup.push({
          position: 'SUPER_FLEX',
          player: remainingSuperFlex[i],
          slotType: 'superflex',
        })
        usedPlayers.add(remainingSuperFlex[i].playerId)
      }
    }
  }

  // Add all players to bench (show all players including injured/bye for visibility)
  players.forEach((p) => {
    if (!usedPlayers.has(p.playerId)) {
      bench.push(p)
    }
  })

  return { lineup, bench }
}

// ---------------------------------------------------------------------------
// Audit: stat-management diagnostics (position depth, injury exposure, activity)
// ---------------------------------------------------------------------------

const AUDIT_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])

export interface PositionDepthGap {
  position: string
  startersNeeded: number
  rosteredCount: number
  availableCount: number
  healthScore: number // 0-100+; 100 = exactly enough available starters, no bench buffer
  severity: 'critical' | 'thin' | 'healthy'
}

/**
 * How many rostered/available players a team has at each position relative to how many
 * that roster shape actually needs to start (direct slots + a fair share of FLEX/SUPER_FLEX).
 */
export const calculatePositionDepthGaps = (
  players: PlayerData[],
  rosterPositions: RosterPositions
): PositionDepthGap[] => {
  const flexShare = Math.ceil((rosterPositions.FLEX ?? 0) / FLEX_ELIGIBLE.size)
  const superFlexShare = Math.ceil((rosterPositions.SUPER_FLEX ?? 0) / (AUDIT_POSITIONS.length))

  return AUDIT_POSITIONS.map((position) => {
    const directSlots = rosterPositions[position as keyof RosterPositions] ?? 0
    const startersNeeded =
      directSlots + (FLEX_ELIGIBLE.has(position) ? flexShare : 0) + superFlexShare

    const atPosition = players.filter((p) => p.position === position)
    const rosteredCount = atPosition.length
    const availableCount = atPosition.filter(isPlayerAvailable).length

    const healthScore =
      startersNeeded > 0 ? Math.round((availableCount / startersNeeded) * 100) : 100

    let severity: PositionDepthGap['severity'] = 'healthy'
    if (availableCount < startersNeeded) severity = 'critical'
    else if (availableCount <= startersNeeded) severity = 'thin'

    return { position, startersNeeded, rosteredCount, availableCount, healthScore, severity }
  })
}

export interface InjuryExposure {
  injuredCount: number
  injuredStarterCount: number
  players: PlayerData[]
  riskLevel: 'low' | 'moderate' | 'high'
}

const INJURY_STATUSES = new Set(['questionable', 'doubtful', 'out', 'ir'])

function isInjuryFlagged(player: PlayerData): boolean {
  const status = (player.injury_status || '').toLowerCase().trim()
  return INJURY_STATUSES.has(status) || Boolean(player.injury_start_date)
}

/** Surfaces every rostered player carrying an injury designation, weighted by starter impact. */
export const calculateInjuryExposure = (
  players: PlayerData[],
  currentStarters: string[]
): InjuryExposure => {
  const injuredPlayers = players.filter(isInjuryFlagged)
  const starterSet = new Set(currentStarters)
  const injuredStarterCount = injuredPlayers.filter((p) => starterSet.has(p.playerId)).length

  let riskLevel: InjuryExposure['riskLevel'] = 'low'
  if (injuredStarterCount >= 2) riskLevel = 'high'
  else if (injuredStarterCount === 1) riskLevel = 'moderate'

  return {
    injuredCount: injuredPlayers.length,
    injuredStarterCount,
    players: injuredPlayers,
    riskLevel,
  }
}

export interface TransactionActivitySummary {
  totalMoves: number
  waiverClaims: number
  trades: number
  freeAgentAdds: number
  last4WeeksMoves: number
  activityLevel: 'inactive' | 'moderate' | 'active' | 'hyperactive'
}

/** Summarizes a team's roster-management activity from their completed transactions. */
export const calculateTransactionActivity = (
  transactions: SleeperTransaction[] | undefined,
  currentWeek: number
): TransactionActivitySummary => {
  const tx = transactions ?? []
  const waiverClaims = tx.filter((t) => t.type === 'waiver').length
  const trades = tx.filter((t) => t.type === 'trade').length
  const freeAgentAdds = tx.filter((t) => t.type === 'free_agent').length
  const last4WeeksMoves = tx.filter((t) => t.leg > currentWeek - 4 && t.leg <= currentWeek).length

  let activityLevel: TransactionActivitySummary['activityLevel'] = 'inactive'
  if (last4WeeksMoves >= 6) activityLevel = 'hyperactive'
  else if (last4WeeksMoves >= 3) activityLevel = 'active'
  else if (last4WeeksMoves >= 1) activityLevel = 'moderate'

  return {
    totalMoves: tx.length,
    waiverClaims,
    trades,
    freeAgentAdds,
    last4WeeksMoves,
    activityLevel,
  }
}

// ---------------------------------------------------------------------------
// Valuation: P/E-ratio-style price (KTC) vs earnings (production) scoring
// ---------------------------------------------------------------------------

function medianOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface PositionalMedians {
  medianKtc: number
  medianFfpg: number
}

/** League-wide KTC value and fantasy PPG medians per position, for normalizing P/E ratios. */
export const calculatePositionalMedians = (
  players: PlayerData[]
): Record<string, PositionalMedians> => {
  const result: Record<string, PositionalMedians> = {}
  for (const pos of AUDIT_POSITIONS) {
    const atPos = players.filter((p) => p.position === pos)
    const ktcValues = atPos
      .map((p) => p.ktcValueSf)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const ffpgValues = atPos
      .map((p) => p.fantasy_ppg)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    result[pos] = { medianKtc: medianOf(ktcValues), medianFfpg: medianOf(ffpgValues) }
  }
  return result
}

/**
 * Price/earnings ratio: (KTC value ÷ positional median KTC) ÷ (fantasy_ppg ÷ positional
 * median fantasy_ppg). < 0.7 = undervalued (production exceeds price), > 1.5 = overvalued
 * (paying for name value over output), ~1.0 = fair. Returns null when there's no production
 * sample yet (rookies, injured all season) — those are speculative, not mispriced.
 */
export const calculatePERatio = (
  player: PlayerData,
  medians: Record<string, PositionalMedians>
): number | null => {
  const posMedians = medians[player.position]
  if (!posMedians || posMedians.medianKtc <= 0 || posMedians.medianFfpg <= 0) return null
  if (!player.ktcValueSf || !player.fantasy_ppg || player.fantasy_ppg <= 0) return null

  const priceMultiple = player.ktcValueSf / posMedians.medianKtc
  const earningsMultiple = player.fantasy_ppg / posMedians.medianFfpg
  if (earningsMultiple <= 0) return null

  return priceMultiple / earningsMultiple
}

// ---------------------------------------------------------------------------
// Production vs. value: is this team's on-field output backed by its roster talent?
// ---------------------------------------------------------------------------

export interface ProductionVsValue {
  productionRank: number // 1 = most points scored league-wide
  valueRank: number // 1 = highest roster value (nowScore) league-wide
  gap: number // productionRank - valueRank; positive = production trailing value
  signal: 'underperforming' | 'overperforming' | 'aligned'
}

/**
 * Compares a team's points-scored rank against its roster-value rank. A team can rank well
 * on value (talented roster, per KTC) but rank poorly on production (points scored) —
 * talent that isn't translating to the scoreboard — or the reverse (punching above its
 * roster's weight). This is a different failure mode than the win/loss-based Pretender
 * overlay in competitiveState.ts, which only looks at record vs. roster value.
 */
export const calculateProductionVsValue = (
  rosterId: number,
  teams: TeamData[],
  placements: LeaguePlacements
): ProductionVsValue | null => {
  if (teams.length === 0) return null

  const byPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor)
  const productionRank = byPoints.findIndex((t) => t.rosterId === rosterId) + 1

  const byValue = [...teams].sort(
    (a, b) =>
      (placements.placements[b.rosterId]?.nowScore ?? 0) -
      (placements.placements[a.rosterId]?.nowScore ?? 0)
  )
  const valueRank = byValue.findIndex((t) => t.rosterId === rosterId) + 1

  if (productionRank === 0 || valueRank === 0) return null

  const gap = productionRank - valueRank
  const gapThreshold = Math.max(2, Math.ceil(teams.length / 4))

  let signal: ProductionVsValue['signal'] = 'aligned'
  if (gap >= gapThreshold) signal = 'underperforming'
  else if (gap <= -gapThreshold) signal = 'overperforming'

  return { productionRank, valueRank, gap, signal }
}

// ---------------------------------------------------------------------------
// League activity feed: resolves raw transactions into named adds/drops
// ---------------------------------------------------------------------------

export interface ActivityFeedItem {
  id: string
  type: 'trade' | 'waiver' | 'free_agent'
  timestamp: number
  adds: { playerName: string; teamName: string }[]
  drops: { playerName: string; teamName: string }[]
}

/** Resolves raw Sleeper transactions (player IDs, roster IDs) into a display-ready feed. */
export const buildActivityFeed = (
  transactions: SleeperTransaction[],
  teams: TeamData[],
  allPlayers: Record<string, any>
): ActivityFeedItem[] => {
  const teamNameFor = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? 'Unknown Team'

  const playerNameFor = (playerId: string) => {
    const p = allPlayers[playerId]
    if (!p) return playerId
    return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || playerId
  }

  return transactions.map((tx) => ({
    id: tx.transaction_id,
    type: tx.type,
    timestamp: tx.created,
    adds: Object.entries(tx.adds ?? {}).map(([playerId, rosterId]) => ({
      playerName: playerNameFor(playerId),
      teamName: teamNameFor(rosterId),
    })),
    drops: Object.entries(tx.drops ?? {}).map(([playerId, rosterId]) => ({
      playerName: playerNameFor(playerId),
      teamName: teamNameFor(rosterId),
    })),
  }))
}

// ---------------------------------------------------------------------------
// Risk factor: composite of aged/declining production and injury exposure
// ---------------------------------------------------------------------------

export interface RiskFactor {
  score: number // 0-100, higher = riskier
  ageRiskScore: number // 0-100 — share of roster past its position's typical peak window
  injuryRiskScore: number // 0-100 — current injury exposure blended with season durability
  label: 'low' | 'moderate' | 'high'
}

const PEAK_AGE_END: Record<string, number> = { QB: 34, RB: 27, WR: 30, TE: 31 }

/**
 * Blends two independent risk signals into one team-level score: how much of the roster
 * is past its position's typical productive age window (age risk), and how much on-field
 * availability is already compromised — current injured starters plus games already missed
 * relative to what should have been played by now (injury risk).
 */
export const calculateRiskFactor = (team: TeamData, currentWeek: number): RiskFactor => {
  const relevant = team.players.filter((p) =>
    (AUDIT_POSITIONS as readonly string[]).includes(p.position)
  )

  const aged = relevant.filter((p) => p.age)
  const pastPeakCount = aged.filter((p) => p.age > (PEAK_AGE_END[p.position] ?? 30)).length
  const ageRiskScore = aged.length > 0 ? Math.round((pastPeakCount / aged.length) * 100) : 0

  const injuryExposure = calculateInjuryExposure(team.players, team.starters)
  const currentInjuryRisk =
    team.starters.length > 0
      ? (injuryExposure.injuredStarterCount / team.starters.length) * 100
      : 0

  const expectedGames = Math.max(1, currentWeek - 1)
  const trackable = relevant.filter((p) => typeof p.games_played === 'number')
  const missedTimeCount = trackable.filter(
    (p) => (p.games_played as number) < expectedGames * 0.7
  ).length
  const durabilityRisk = trackable.length > 0 ? (missedTimeCount / trackable.length) * 100 : 0

  const injuryRiskScore = Math.round(currentInjuryRisk * 0.6 + durabilityRisk * 0.4)
  const score = Math.round(ageRiskScore * 0.5 + injuryRiskScore * 0.5)
  const label: RiskFactor['label'] = score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low'

  return { score, ageRiskScore, injuryRiskScore, label }
}
