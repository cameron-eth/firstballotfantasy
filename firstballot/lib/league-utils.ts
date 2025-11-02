import { PlayerData, TeamTrends, PositionStrengths, TeamData } from '@/types/league'

// API Response Validation
export const validateApiResponse = (response: Response, endpoint: string): boolean => {
  if (!response.ok) {
    console.error(`API Error at ${endpoint}: ${response.status} ${response.statusText}`)
    return false
  }
  return true
}

export const safeJsonParse = async (response: Response): Promise<any> => {
  try {
    return await response.json()
  } catch (error) {
    console.error('JSON Parse Error:', error)
    return null
  }
}

// Tier Calculation
export const getTierFromRank = (rank: number): string => {
  if (rank <= 12) return 'Elite'
  if (rank <= 36) return 'Tier 1'
  if (rank <= 72) return 'Tier 2'
  if (rank <= 120) return 'Tier 3'
  return 'Depth'
}

// Team Grading System
export const calculateRawScore = (players: PlayerData[]): number => {
  if (!players || players.length === 0) return 0

  return players.reduce((score, player) => {
    if (!player || !player.rank) return score

    const rank = player.rank
    const positionWeight =
      player.position === 'QB'
        ? 1.2
        : player.position === 'TE'
          ? 1.1
          : player.position === 'RB'
            ? 0.9
            : 1.0

    const rankScore = Math.max(0, 200 - rank)
    return score + rankScore * positionWeight
  }, 0)
}

export const calculateGradeFromPercentile = (
  score: number,
  allScores: number[]
): { letter: string; score: number } => {
  if (!allScores || allScores.length === 0) return { letter: 'C', score: 70 }

  const sortedScores = [...allScores].sort((a, b) => b - a)
  const rank = sortedScores.findIndex((s) => s <= score) + 1
  const percentile = ((sortedScores.length - rank + 1) / sortedScores.length) * 100

  const gradeScore = Math.round(percentile)

  let letter: string
  if (percentile >= 95) letter = 'A+'
  else if (percentile >= 90) letter = 'A'
  else if (percentile >= 85) letter = 'A-'
  else if (percentile >= 80) letter = 'B+'
  else if (percentile >= 75) letter = 'B'
  else if (percentile >= 70) letter = 'B-'
  else if (percentile >= 65) letter = 'C+'
  else if (percentile >= 60) letter = 'C'
  else if (percentile >= 55) letter = 'C-'
  else if (percentile >= 50) letter = 'D'
  else letter = 'F'

  return { letter, score: gradeScore }
}

// Team Analysis Functions
export const calculateTeamTrends = (players: PlayerData[]): TeamTrends => {
  if (!players || players.length === 0) {
    return {
      recentForm: 'N/A',
      winStreak: 0,
      avgPointsLast4: 0,
      bestPlayer: {} as PlayerData,
      breakoutCandidate: {} as PlayerData,
      sleeperPick: {} as PlayerData,
    }
  }

  const sortedByRank = [...players].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  const bestPlayer = sortedByRank[0] || ({} as PlayerData)

  const youngPlayers = players.filter((p) => p.age && p.age <= 25)
  const sortedYoung = youngPlayers.sort((a, b) => (a.rank || 999) - (b.rank || 999))
  const breakoutCandidate = sortedYoung[0] || bestPlayer

  const sleeperPick = sortedYoung[1] || sortedYoung[0] || bestPlayer

  return {
    recentForm: 'W-W-L-W',
    winStreak: 2,
    avgPointsLast4: 125.5,
    bestPlayer,
    breakoutCandidate,
    sleeperPick,
  }
}

export const calculatePositionStrengths = (players: PlayerData[]): PositionStrengths => {
  if (!players || players.length === 0) {
    return { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SFLX: 0 }
  }

  const positions = ['QB', 'RB', 'WR', 'TE']
  const strengths: any = {}

  positions.forEach((pos) => {
    const posPlayers = players.filter((p) => p.position === pos)
    if (posPlayers.length === 0) {
      strengths[pos] = 0
    } else {
      const avgRank = posPlayers.reduce((sum, p) => sum + (p.rank || 100), 0) / posPlayers.length
      strengths[pos] = Math.max(0, 100 - avgRank)
    }
  })

  strengths.FLEX = (strengths.RB + strengths.WR + strengths.TE) / 3
  strengths.SFLX = (strengths.QB + strengths.FLEX) / 2

  return strengths
}

export const calculateRecentForm = (roster: any, matchups: any[]): string => {
  return 'W-W-L-W'
}

// Grade Colors
export const GRADE_COLORS: Record<string, string> = {
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
}
