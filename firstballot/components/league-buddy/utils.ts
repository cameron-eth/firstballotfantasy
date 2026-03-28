// Utility functions for LeagueBuddy component
import type { PlayerData, TeamTrends, PositionStrengths, TeamData } from './types'

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

// Helper functions for tier and color calculations
export const getContenderTier = (grade: string, rank: number): string => {
  if (['A+', 'A'].includes(grade) && rank <= 2) return 'Powerhouse'
  if (['A-', 'B+', 'B'].includes(grade) && rank <= 6) return 'Contender'
  if (['B-', 'C+', 'C'].includes(grade) && rank <= 10) return 'Pretender'
  return 'Rebuilder'
}

export const getTierColor = (tier: string): string => {
  switch (tier) {
    case 'Powerhouse':
      return 'bg-green-900/80 text-green-200 border-green-700/50'
    case 'Contender':
      return 'bg-yellow-900/80 text-yellow-200 border-yellow-700/50'
    case 'Pretender':
      return 'bg-orange-900/80 text-orange-200 border-orange-700/50'
    case 'Rebuilder':
      return 'bg-red-900/80 text-red-200 border-red-700/50'
    default:
      return 'bg-gray-900/80 text-gray-200 border-gray-700/50'
  }
}

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
    // Optimized mode: use filtered availablePlayers
    const qbs = availablePlayers.filter((p) => p.position === 'QB').sort((a, b) => a.rank - b.rank)
    const rbs = availablePlayers.filter((p) => p.position === 'RB').sort((a, b) => a.rank - b.rank)
    const wrs = availablePlayers.filter((p) => p.position === 'WR').sort((a, b) => a.rank - b.rank)
    const tes = availablePlayers.filter((p) => p.position === 'TE').sort((a, b) => a.rank - b.rank)
    const flexEligible = [...rbs, ...wrs, ...tes].sort((a, b) => a.rank - b.rank)
    const superFlexEligible = [...qbs, ...rbs, ...wrs, ...tes].sort((a, b) => a.rank - b.rank)

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
