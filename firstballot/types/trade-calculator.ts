export interface TradeItem {
  name: string
  position?: string
  total_score: number
  tier: string
  rank?: number | null
}

export interface TradeResult {
  side1: TradeItem[]
  side1_total: number
  side1_rank?: number
  side1_not_found: string[]
  side2: TradeItem[]
  side2_total: number
  side2_rank?: number
  side2_not_found: string[]
  difference: number
  difference_pct: number
  fairness: string
  winner: string
}

export interface PlayerSuggestion {
  player_name: string
  position: string
  team: string
  headshot_url?: string | null
}
