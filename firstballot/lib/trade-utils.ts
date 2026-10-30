// Trade Market Utilities
// Dynasty-based valuation system for fantasy football trades

export interface PlayerValue {
  playerId: string
  playerName: string
  position: string
  team: string
  rank: number
  value: number
  tier: string
  isRanked: boolean
  fantasyPpg?: number
  gamesPlayed?: number
  totalFantasyPoints?: number
  valueWithPpg?: number
}

// Dynasty Player Valuation System
// Based on FirstBallotModel comprehensive scoring (0-13125 scale)

export interface PlayerValuationData {
  total_score?: number
  tier?: string
  player_name?: string
  position?: string
  ktc_value_sf?: number | null
}

/**
 * Convert total_score (0-13125) to a normalized value
 * Uses a more linear scale that better reflects the actual total_score
 * Divides by ~131 to get values roughly in the 0-100 range but preserves differences
 */
const convertTotalScoreToValue = (totalScore: number): number => {
  // More linear conversion: divide by 131.25 to get 0-100 scale
  // This preserves the relative differences between players better
  // Elite players (12000+) will show ~90-100
  // Mid-tier players (6000-8000) will show ~45-60
  // Lower players (3000-5000) will show ~20-40

  // Scale: divide by 131.25, then apply a slight curve to emphasize top players
  const baseValue = totalScore / 131.25

  // Apply a slight exponential curve to better separate elite players
  // This makes top players (10000+) stand out more while keeping lower players readable
  if (totalScore >= 10000) {
    // Elite players: slight boost to separate them
    return Math.min(100, baseValue * 1.1)
  } else if (totalScore >= 8000) {
    // Star players: slight boost
    return baseValue * 1.05
  } else if (totalScore >= 5000) {
    // Mid-tier: linear
    return baseValue
  } else {
    // Lower tier: slight reduction but still readable
    return Math.max(1, baseValue * 0.95)
  }
}

const convertKtcToValue = (ktcValue: number): number => {
  // KTC SF values are typically in ~1,000-10,000 range.
  // Convert to 0-100 style trade value while preserving spread.
  return Math.max(1, Math.min(100, ktcValue / 100))
}

/**
 * Get player value from FirstBallotModel scoring system
 * @param valuationData - Player valuation data from the published tier rankings
 * @param fantasyPpg - Optional fantasy PPG for adjustment
 * @param gamesPlayed - Optional games played for adjustment
 */
export const getPlayerValue = (
  valuationData?: PlayerValuationData,
  fantasyPpg?: number,
  gamesPlayed?: number
): {
  value: number
  tier: string
  isRanked: boolean
  valueWithPpg?: number
  ppgMultiplier?: number
} => {
  // If no valuation data, return unranked
  if (
    !valuationData ||
    (!valuationData.total_score && !(valuationData.ktc_value_sf && valuationData.ktc_value_sf > 0))
  ) {
    return {
      value: 1,
      tier: 'Unranked',
      isRanked: false,
    }
  }

  // Ensure total_score is a number (handle string conversion from database)
  const totalScoreRaw =
    typeof valuationData.total_score === 'string'
      ? parseFloat(valuationData.total_score)
      : valuationData.total_score
  const totalScore = Number.isFinite(totalScoreRaw as number) ? Number(totalScoreRaw) : 0
  const ktcRaw = Number(valuationData.ktc_value_sf || 0)
  const hasTotalScore = totalScore > 0
  const hasKtc = Number.isFinite(ktcRaw) && ktcRaw > 0

  if (!hasTotalScore && !hasKtc) {
    return {
      value: 1,
      tier: 'Unranked',
      isRanked: false,
    }
  }

  // KTC-first valuation: prefer KTC when available, blend with model score when both exist.
  const modelValue = hasTotalScore ? convertTotalScoreToValue(totalScore) : null
  const ktcValue = hasKtc ? convertKtcToValue(ktcRaw) : null
  const baseValue =
    ktcValue !== null && modelValue !== null
      ? ktcValue * 0.7 + modelValue * 0.3
      : (ktcValue ?? modelValue ?? 1)
  const tier = valuationData.tier || 'Unranked'

  // PPG-based value adjustment (optional, for fine-tuning)
  let valueWithPpg = baseValue
  let ppgMultiplier = 1

  if (fantasyPpg && gamesPlayed && gamesPlayed >= 3) {
    // Only apply PPG adjustments for players with meaningful sample size

    const baseline = 15
    const ppgRatio = fantasyPpg / baseline

    // Apply PPG multiplier (capped between 0.5x and 2.0x)
    ppgMultiplier = Math.max(0.5, Math.min(2.0, ppgRatio))
    valueWithPpg = baseValue * ppgMultiplier
  }

  return {
    value: Math.round(baseValue * 100) / 100,
    tier,
    isRanked: true,
    valueWithPpg: Math.round(valueWithPpg * 100) / 100,
    ppgMultiplier: Math.round(ppgMultiplier * 100) / 100,
  }
}

/**
 * Legacy function for backward compatibility - converts rank to valuation data
 * @deprecated Use getPlayerValue with PlayerValuationData instead
 */
export const getPlayerValueFromRank = (
  rank: number,
  fantasyPpg?: number,
  gamesPlayed?: number
): {
  value: number
  tier: string
  isRanked: boolean
  valueWithPpg?: number
  ppgMultiplier?: number
} => {
  // Approximate rank-based scoring (for backward compatibility)
  // This is a rough conversion - prefer using total_score from database
  if (!rank || rank <= 0 || rank > 1000) {
    return {
      value: 1,
      tier: 'Unranked',
      isRanked: false,
    }
  }

  // Rough approximation: rank 1 ≈ score 13125, rank 150 ≈ score 3281
  const estimatedScore = Math.max(3281, 13125 - (rank - 1) * 65)

  return getPlayerValue(
    { total_score: estimatedScore, tier: `Tier ${Math.ceil(rank / 30)}` },
    fantasyPpg,
    gamesPlayed
  )
}

// Grade calculation based on total value gained
export const getGradeFromValue = (value: number): string => {
  if (value >= 50) return 'A+'
  if (value >= 30) return 'A'
  if (value >= 20) return 'A-'
  if (value >= 10) return 'B+'
  if (value >= 5) return 'B'
  if (value >= 0) return 'B-'
  if (value >= -10) return 'C+'
  if (value >= -20) return 'C'
  if (value >= -30) return 'C-'
  if (value >= -50) return 'D'
  return 'F'
}

// Grade colors for UI
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

// Smart player name matching with dynasty database
/**
 * A player's ranking, looked up by Sleeper id (PR-19). Rankings are keyed by the tier
 * publish's KTC ↔ Sleeper match, so two players who share a name can't be confused; a
 * player without a match is unranked and valued by rank.
 */
export const rankingFor = (
  playerId: string,
  dynastyRankings: Record<string, any>
): { rank: number; tier: string; isRanked: boolean; total_score?: number; ktc_value_sf?: number } => {
  const ranking = dynastyRankings[playerId]
  if (!ranking) return { rank: 999, tier: 'Unranked', isRanked: false }
  const totalScore =
    typeof ranking.total_score === 'string' ? parseFloat(ranking.total_score) : ranking.total_score
  return {
    rank: ranking.rank || (totalScore ? calculateRankFromScore(totalScore) : 999),
    tier: ranking.tier_name || ranking.tier || 'Unranked', // Prefer tier_name (string) over tier (number)
    isRanked: true,
    total_score: totalScore,
    ktc_value_sf: ranking.ktc_value_sf ? Number(ranking.ktc_value_sf) : undefined,
  }
}

/**
 * Calculate approximate rank from total_score (for backward compatibility)
 */
const calculateRankFromScore = (totalScore: number): number => {
  // Rough approximation: score 13125 ≈ rank 1, score 3281 ≈ rank 150
  if (!totalScore || totalScore <= 0) return 999
  return Math.max(1, Math.round(150 - ((totalScore - 3281) / (13125 - 3281)) * 149))
}

// Process player data for trade analysis
export const processPlayerForTrade = (
  playerId: string,
  allPlayers: Record<string, any>,
  dynastyRankings: Record<string, any>,
  playerStats?: Record<string, any>
): PlayerValue | null => {
  const player = allPlayers[playerId]
  if (!player) return null

  const playerName = `${player.first_name} ${player.last_name}`
  const ranking = rankingFor(playerId, dynastyRankings)

  // Get PPG data from player stats if available
  const stats = playerStats?.[playerId]
  const fantasyPpg = stats?.fantasy_ppg || player.fantasy_ppg
  const gamesPlayed = stats?.games_played || player.games_played
  const totalFantasyPoints = stats?.total_fantasy_points || player.fantasy_points_ppr

  // Use new valuation system with total_score if available
  const valuationData = ranking.total_score
    ? {
        total_score: ranking.total_score,
        tier: ranking.tier, // tier is now the full tier name string (e.g., "Elite (Tier 1)")
        player_name: playerName,
        position: player.position,
        ktc_value_sf: ranking.ktc_value_sf || null,
      }
    : ranking.ktc_value_sf
      ? {
          tier: ranking.tier,
          player_name: playerName,
          position: player.position,
          ktc_value_sf: ranking.ktc_value_sf,
        }
      : undefined

  const valueData = valuationData
    ? getPlayerValue(valuationData, fantasyPpg, gamesPlayed)
    : getPlayerValueFromRank(ranking.rank, fantasyPpg, gamesPlayed)

  return {
    playerId,
    playerName,
    position: player.position,
    team: player.team,
    rank: ranking.rank,
    value: valueData.value,
    tier: valueData.tier,
    isRanked: valueData.isRanked,
    fantasyPpg,
    gamesPlayed,
    totalFantasyPoints,
    valueWithPpg: valueData.valueWithPpg,
  }
}

// Format value for display
export const formatValue = (value: number): string => {
  if (value >= 0) {
    return `+${Math.round(value * 10) / 10}`
  }
  return `${Math.round(value * 10) / 10}`
}

