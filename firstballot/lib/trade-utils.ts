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

export interface DraftPickValue {
  season: string
  round: number
  baseValue: number
  adjustedValue: number
  bonus: number
  timeDiscount: number
  finalValue: number
}

export interface TradeAnalysis {
  transactionId: string
  week: number
  season: string
  date: string
  teams: {
    rosterId: number
    teamName: string
    ownerName: string
    playersReceived: PlayerValue[]
    picksReceived: DraftPickValue[]
    totalValueReceived: number
    playersSent: PlayerValue[]
    picksSent: DraftPickValue[]
    totalValueSent: number
    netValueGain: number
  }[]
  totalTradeValue: number
  winner: number | null
}

export interface TraderStats {
  rosterId: number
  teamName: string
  ownerName: string
  totalTrades: number
  totalValueGained: number
  avgValuePerTrade: number
  winRate: number
  bestTrade: number
  worstTrade: number
  totalValueMoved: number
  grade: string
  marketShareByTrades: number // Percentage of total trades
  marketShareByValue: number // Percentage of total value moved
  marketShareByActivity: number // Percentage of total trading activity
}

// Dynasty Player Valuation System
// Based on Dynasty SF Rankings with 150+ top players

export const getPlayerValue = (
  rank: number, 
  fantasyPpg?: number, 
  gamesPlayed?: number
): { 
  value: number; 
  tier: string; 
  isRanked: boolean; 
  valueWithPpg?: number;
  ppgMultiplier?: number;
} => {
  if (!rank || rank <= 0 || rank > 1000) {
    // Unranked or out-of-bounds: assign lowest value
    return {
      value: 1,
      tier: 'Unranked',
      isRanked: false
    }
  }

  // Linear, non-negative, capped at minValue
  const A = 100; // starting value
  const B = 0.5; // decrement per rank
  const minValue = 5;

  const baseValue = Math.max(A - B * (rank - 1), minValue);

  // Assign tier based on rank
  let tier = '';
  if (rank <= 12) tier = 'Tier 1';
  else if (rank <= 36) tier = 'Tier 2';
  else if (rank <= 72) tier = 'Tier 3';
  else if (rank <= 120) tier = 'Tier 4';
  else tier = 'Tier 5';

  // PPG-based value adjustment
  let valueWithPpg = baseValue;
  let ppgMultiplier = 1;

  if (fantasyPpg && gamesPlayed && gamesPlayed >= 3) {
    // Only apply PPG adjustments for players with meaningful sample size
    const positionMultipliers = {
      'QB': { baseline: 20, multiplier: 0.8 },
      'RB': { baseline: 15, multiplier: 1.0 },
      'WR': { baseline: 12, multiplier: 1.2 },
      'TE': { baseline: 8, multiplier: 1.5 }
    };

    // Get position-specific baseline (this would need to be passed in or determined)
    // For now, use a general baseline
    const baseline = 15;
    const ppgRatio = fantasyPpg / baseline;
    
    // Apply PPG multiplier (capped between 0.5x and 2.0x)
    ppgMultiplier = Math.max(0.5, Math.min(2.0, ppgRatio));
    valueWithPpg = baseValue * ppgMultiplier;
  }

  return {
    value: Math.round(baseValue * 100) / 100,
    tier,
    isRanked: true,
    valueWithPpg: Math.round(valueWithPpg * 100) / 100,
    ppgMultiplier: Math.round(ppgMultiplier * 100) / 100
  }
}

// Draft Pick Valuation System
// Base values with 2027 class bonus and time discounting

export const getDraftPickValue = (round: number, season: string): DraftPickValue => {
  const currentYear = new Date().getFullYear()
  const yearDiff = parseInt(season) - currentYear
  
  // Base values (more realistic dynasty values)
  let baseValue = 0
  if (round === 1) baseValue = 55.25 // Reduced from 65 by 15%
  else if (round === 2) baseValue = 25
  else if (round === 3) baseValue = 15
  else baseValue = Math.max(3, 8 - (round - 4) * 1) // 4th+: 8-3
  
  // 2027 Draft Class Bonus
  // 2027 is considered a strong draft class with exceptional talent depth
  let bonus = 0
  if (season === "2027") {
    if (round === 1) bonus = baseValue * 0.25      // +25%
    else if (round === 2) bonus = baseValue * 0.35 // +35%
    else if (round === 3) bonus = baseValue * 0.30 // +30%
    else bonus = baseValue * 0.25                  // +25%
  }
  
  // Time discounting for future/past picks
  let timeDiscount = 0
  let adjustedValue = baseValue + bonus
  
  if (yearDiff > 0) {
    // Future picks discounted 15% per year (dynasty format)
    timeDiscount = adjustedValue * (1 - Math.pow(0.85, yearDiff))
    adjustedValue *= Math.pow(0.85, yearDiff)
  } else if (yearDiff < 0) {
    // Past picks heavily discounted (70% per year)
    timeDiscount = adjustedValue * (1 - Math.pow(0.30, Math.abs(yearDiff)))
    adjustedValue *= Math.pow(0.30, Math.abs(yearDiff))
  }
  
  return {
    season,
    round,
    baseValue: Math.round(baseValue * 100) / 100,
    adjustedValue: Math.round(adjustedValue * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    timeDiscount: Math.round(timeDiscount * 100) / 100,
    finalValue: Math.round(adjustedValue * 100) / 100
  }
}

// Get approximate 2027 enhanced values (for reference)
export const get2027EnhancedValues = (round: number): number => {
  const baseValue = getDraftPickValue(round, "2027")
  return baseValue.finalValue
}

// Grade calculation based on total value gained
export const getGradeFromValue = (value: number): string => {
  if (value >= 50) return "A+"
  if (value >= 30) return "A"
  if (value >= 20) return "A-"
  if (value >= 10) return "B+"
  if (value >= 5) return "B"
  if (value >= 0) return "B-"
  if (value >= -10) return "C+"
  if (value >= -20) return "C"
  if (value >= -30) return "C-"
  if (value >= -50) return "D"
  return "F"
}

// Grade colors for UI
export const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  'B': 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'D': 'bg-red-400/20 text-red-400 border-red-400',
  'F': 'bg-red-400/20 text-red-400 border-red-400',
} as const

// Smart player name matching with dynasty database
export const matchPlayerToRankings = (
  playerName: string, 
  dynastyRankings: Record<string, any>
): { rank: number; tier: string; isRanked: boolean } => {
  // Direct match
  if (dynastyRankings[playerName]) {
    const ranking = dynastyRankings[playerName]
    return {
      rank: ranking.rank,
      tier: `Tier ${ranking.tier}`,
      isRanked: true
    }
  }
  
  // Try different name formats
  const nameVariations = [
    playerName,
    playerName.replace(/\./g, ''), // Remove periods
    playerName.replace(/\s+/g, ' ').trim(), // Normalize spaces
    playerName.toLowerCase(),
    playerName.split(' ').reverse().join(' '), // Last, First
  ]
  
  for (const variation of nameVariations) {
    if (dynastyRankings[variation]) {
      const ranking = dynastyRankings[variation]
      return {
        rank: ranking.rank,
        tier: `Tier ${ranking.tier}`,
        isRanked: true
      }
    }
  }
  
  // No match found - return unranked
  return {
    rank: 999,
    tier: 'Unranked',
    isRanked: false
  }
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
  const ranking = matchPlayerToRankings(playerName, dynastyRankings)
  
  // Get PPG data from player stats if available
  const stats = playerStats?.[playerId]
  const fantasyPpg = stats?.fantasy_ppg || player.fantasy_ppg
  const gamesPlayed = stats?.games_played || player.games_played
  const totalFantasyPoints = stats?.total_fantasy_points || player.fantasy_points_ppr
  
  const valueData = getPlayerValue(ranking.rank, fantasyPpg, gamesPlayed)
  
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
    valueWithPpg: valueData.valueWithPpg
  }
}

// Calculate trade statistics
export const calculateTraderStats = (tradeAnalysis: TradeAnalysis[]): TraderStats[] => {
  const stats: Record<number, TraderStats & { winningTrades: number }> = {}
  
  tradeAnalysis.forEach(trade => {
    trade.teams.forEach(team => {
      if (!stats[team.rosterId]) {
        stats[team.rosterId] = {
          rosterId: team.rosterId,
          teamName: team.teamName,
          ownerName: team.ownerName,
          totalTrades: 0,
          totalValueGained: 0,
          avgValuePerTrade: 0,
          winRate: 0,
          bestTrade: 0,
          worstTrade: 0,
          totalValueMoved: 0,
          grade: 'F',
          marketShareByTrades: 0,
          marketShareByValue: 0,
          marketShareByActivity: 0,
          winningTrades: 0
        }
      }
      
      const stat = stats[team.rosterId]
      stat.totalTrades++
      stat.totalValueGained += team.netValueGain
      stat.totalValueMoved += team.totalValueReceived + team.totalValueSent
      
      // Count winning trades (trades where they left with more value)
      if (team.netValueGain > 0) {
        stat.winningTrades++
      }
      
      if (team.netValueGain > stat.bestTrade) {
        stat.bestTrade = team.netValueGain
      }
      if (team.netValueGain < stat.worstTrade) {
        stat.worstTrade = team.netValueGain
      }
    })
  })
  
  // Calculate totals for market share percentages
  const totalTrades = tradeAnalysis.length
  const totalValueMoved = Object.values(stats).reduce((sum, stat) => sum + stat.totalValueMoved, 0)
  const totalActivity = Object.values(stats).reduce((sum, stat) => sum + stat.totalTrades, 0)
  
  // Calculate averages, win rates, and market share percentages
  Object.values(stats).forEach(stat => {
    stat.avgValuePerTrade = stat.totalTrades > 0 ? stat.totalValueGained / stat.totalTrades : 0
    stat.grade = getGradeFromValue(stat.totalValueGained)
    
    // Calculate win rate as percentage of trades where they left with more value
    stat.winRate = stat.totalTrades > 0 ? (stat.winningTrades / stat.totalTrades) * 100 : 0
    
    // Calculate market share percentages
    stat.marketShareByTrades = totalTrades > 0 ? (stat.totalTrades / totalActivity) * 100 : 0
    stat.marketShareByValue = totalValueMoved > 0 ? (stat.totalValueMoved / totalValueMoved) * 100 : 0
    stat.marketShareByActivity = totalActivity > 0 ? (stat.totalTrades / totalActivity) * 100 : 0
  })
  
  // Remove temporary winningTrades field and return clean TraderStats
  return Object.values(stats).map(({ winningTrades, ...stat }) => stat).sort((a, b) => b.totalValueGained - a.totalValueGained)
}

// Format value for display
export const formatValue = (value: number): string => {
  if (value >= 0) {
    return `+${Math.round(value * 10) / 10}`
  }
  return `${Math.round(value * 10) / 10}`
}

// Get valuation system description
export const getValuationSystemDescription = () => ({
  playerValues: {
    title: "Player Values (Based on Dynasty SF Rankings)",
    tiers: [
      "Top 12: 85-100 points",
      "Ranks 13-36: 65-84 points", 
      "Ranks 37-72: 45-64 points",
      "Ranks 73-120: 25-44 points",
      "Ranks 121+: 5-24 points",
      "Unranked: 3-15 points"
    ]
  },
  draftPickValues: {
    title: "Draft Pick Values (Base)",
    values: [
      "1st: 55 points",
      "2nd: 25 points", 
      "3rd: 15 points",
      "4th+: 8-3 points"
    ],
    timeDiscount: "Future picks discounted 15% per year (dynasty format)"
  },
  classBonus: {
    title: "2027 Draft Class Bonus",
    description: "2027 is considered a strong draft class with exceptional talent depth",
    bonuses: [
      "1st: +25%",
      "2nd: +35%", 
      "3rd: +30%",
      "4th+: +25%"
    ],
    enhancedValues: [
      "1st: ~69 points",
      "2nd: ~34 points",
      "3rd: ~20 points", 
      "4th+: ~10 points"
    ]
  }
}) 