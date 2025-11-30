/**
 * Trade Calculator Utility
 * Uses existing player values from dynasty_player_tiers table
 * and calculates draft pick values using the same formula as Python model
 */

interface TradeItem {
  name: string
  type: 'player' | 'pick'
  position?: string
  total_score: number
  tier: string
}

interface TradeResult {
  side1: TradeItem[]
  side1_total: number
  side1_not_found: string[]
  side2: TradeItem[]
  side2_total: number
  side2_not_found: string[]
  difference: number
  difference_pct: number
  fairness: string
  winner: string
  side1_rank?: number
  side2_rank?: number
}

/**
 * Calculate draft capital score (0-2500 points) - matches Python DraftCapitalScorer
 */
function calculateDraftCapitalScore(pick: number, round: number): number {
  if (!pick || !round) {
    return 487 // UDFA baseline
  }

  // Round 1 - Extremely granular
  if (round === 1) {
    if (pick === 1) return 2500
    if (pick === 2) return 2469
    if (pick === 3) return 2438
    if (pick === 4) return 2406
    if (pick === 5) return 2375
    if (pick === 6) return 2344
    if (pick === 7) return 2313
    if (pick === 8) return 2281
    if (pick === 9) return 2250
    if (pick === 10) return 2219
    if (pick <= 12) return 2219 - (pick - 10) * 31
    if (pick <= 16) return 2157 - (pick - 12) * 28
    if (pick <= 20) return 2045 - (pick - 16) * 25
    if (pick <= 24) return 1945 - (pick - 20) * 22
    if (pick <= 28) return 1857 - (pick - 24) * 19
    return 1781 - (pick - 28) * 16
  }

  // Round 2
  if (round === 2) {
    return Math.max(1063, 1813 - (pick - 33) * 23)
  }

  // Round 3
  if (round === 3) {
    return Math.max(813, 1438 - (pick - 65) * 15)
  }

  // Round 4
  if (round === 4) {
    return Math.max(563, 1125 - (pick - 97) * 13)
  }

  // Round 5
  if (round === 5) {
    return Math.max(438, 875 - (pick - 129) * 10)
  }

  // Round 6
  if (round === 6) {
    return Math.max(350, 688 - (pick - 161) * 8)
  }

  // Round 7+
  return Math.max(250, 563 - (pick - 193) * 6)
}

/**
 * Calculate draft pick value using the same formula as Python model
 * Matches calculate_draft_pick_values() from tiering.py
 * Supports years 2025-2028 (current year + 3 future years)
 */
function calculateDraftPickValue(
  season: number,
  round: number,
  pick: number,
  currentSeason: number = 2025
): number {
  // Validate year range (2025-2028)
  if (season < 2025 || season > 2028) {
    console.warn(`Draft pick year ${season} outside supported range (2025-2028)`)
  }

  // Calculate overall pick number (12 picks per round)
  const overallPick = (round - 1) * 12 + pick

  // Get base value from draft capital
  const baseValue = calculateDraftCapitalScore(overallPick, round)

  // Calculate year offset (0 for current year, 1+ for future years)
  const yearOffset = Math.max(0, season - currentSeason)

  // Discount future picks (15% discount per year)
  // 2025: 0.85^0 = 1.0 (no discount)
  // 2026: 0.85^1 = 0.85 (15% discount)
  // 2027: 0.85^2 = 0.7225, then apply bonus
  // 2028: 0.85^3 = 0.614125 (no bonus)
  let discountFactor = Math.pow(0.85, yearOffset)

  // 2027 class bonus (special handling for that draft class)
  if (season === 2027) {
    if (round === 1)
      discountFactor *= 1.25 // 25% bonus for 1st round
    else if (round === 2)
      discountFactor *= 1.35 // 35% bonus for 2nd round
    else if (round === 3)
      discountFactor *= 1.3 // 30% bonus for 3rd round
    else discountFactor *= 1.25 // 25% bonus for rounds 4+
  }

  const pickValue = baseValue * discountFactor

  // Convert to total_score scale (picks max out ~7875)
  // This matches: total_score = min(pick_value * 3.15, 7875)
  return Math.min(pickValue * 3.15, 7875)
}

/**
 * Get tier name for a given total_score
 */
function getTierFromScore(totalScore: number): string {
  if (totalScore >= 12000) return 'Elite (Tier 1)'
  if (totalScore >= 10000) return 'Star (Tier 2)'
  if (totalScore >= 8000) return 'High-End Starter (Tier 3)'
  if (totalScore >= 6000) return 'Solid Starter (Tier 4)'
  if (totalScore >= 4000) return 'Flex/Upside (Tier 5)'
  if (totalScore >= 2000) return 'Depth/Dart (Tier 6)'
  if (totalScore >= 1000) return 'Roster Clogger (Tier 7)'
  return 'Waiver Wire (Tier 8)'
}

/**
 * Parse draft pick string (format: "2025 1.05" or "2026 2.08")
 */
function parseDraftPick(pickStr: string, currentSeason: number = 2025): TradeItem | null {
  try {
    const parts = pickStr.trim().split(/\s+/)
    if (parts.length !== 2) return null

    const season = parseInt(parts[0])
    const roundPick = parts[1].split('.')
    if (roundPick.length !== 2) return null

    const roundNum = parseInt(roundPick[0])
    const pickNum = parseInt(roundPick[1])

    if (isNaN(season) || isNaN(roundNum) || isNaN(pickNum)) return null

    // Calculate draft pick value using the same formula as Python
    const totalScore = calculateDraftPickValue(season, roundNum, pickNum, currentSeason)

    return {
      name: `${season} ${roundNum}.${pickNum.toString().padStart(2, '0')}`,
      type: 'pick',
      total_score: Math.round(totalScore),
      tier: getTierFromScore(totalScore),
    }
  } catch {
    return null
  }
}

/**
 * Evaluate a trade using existing player values from rankings
 */
export async function evaluateTrade(
  side1Items: string[],
  side2Items: string[],
  rankingsMap: Record<string, any>,
  currentSeason: number = 2025
): Promise<TradeResult> {
  const parseItem = (item: string): TradeItem | null => {
    // Check if it's a draft pick (format: "YYYY R.PP")
    if (/\d{4}\s+\d+\.\d+/.test(item)) {
      return parseDraftPick(item, currentSeason)
    }

    // Otherwise treat as player name - look up in rankings
    const player = rankingsMap[item]
    if (player) {
      return {
        name: item,
        type: 'player',
        position: player.position,
        total_score:
          typeof player.total_score === 'string'
            ? parseFloat(player.total_score)
            : player.total_score,
        tier: player.tier || 'Unknown',
      }
    }

    return null
  }

  const side1Parsed: TradeItem[] = []
  let side1Total = 0
  const side1NotFound: string[] = []

  for (const item of side1Items) {
    const parsed = parseItem(item)
    if (parsed) {
      side1Parsed.push(parsed)
      side1Total += parsed.total_score
    } else {
      side1NotFound.push(item)
    }
  }

  const side2Parsed: TradeItem[] = []
  let side2Total = 0
  const side2NotFound: string[] = []

  for (const item of side2Items) {
    const parsed = parseItem(item)
    if (parsed) {
      side2Parsed.push(parsed)
      side2Total += parsed.total_score
    } else {
      side2NotFound.push(item)
    }
  }

  const difference = Math.abs(side1Total - side2Total)
  const differencePct =
    Math.max(side1Total, side2Total) > 0 ? (difference / Math.max(side1Total, side2Total)) * 100 : 0

  // Determine fairness
  let fairness: string
  if (differencePct <= 5) {
    fairness = 'FAIR'
  } else if (differencePct <= 10) {
    fairness = 'SLIGHTLY UNEVEN'
  } else if (differencePct <= 20) {
    fairness = 'UNEVEN'
  } else {
    fairness = 'VERY UNEVEN'
  }

  const winner = side1Total > side2Total ? 'SIDE 1' : side2Total > side1Total ? 'SIDE 2' : 'EVEN'

  return {
    side1: side1Parsed,
    side1_total: side1Total,
    side1_not_found: side1NotFound,
    side2: side2Parsed,
    side2_total: side2Total,
    side2_not_found: side2NotFound,
    difference,
    difference_pct: differencePct,
    fairness,
    winner,
  }
}
