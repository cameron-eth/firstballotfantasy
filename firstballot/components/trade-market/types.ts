// Analytics shapes shared between the trade market container and its sections.

export interface RosterKPI {
  rosterId: number
  ownerName: string
  teamName: string
  totalTrades: number
  ktcGained: number
  ktcLost: number
  netKtc: number
  winRate: number
  grade: string
  velocityScore: number
  tradesPerWeek: number
  tempo: string
  bestBuyLow: { name: string; playerId?: string; delta: number } | null
  bestSellHigh: { name: string; playerId?: string; delta: number } | null
}

export interface MostTradedPlayer {
  playerId?: string
  name: string
  count: number
}

export interface LeagueVelocity {
  totalTrades: number
  spanDays: number
  perDay: number
  perWeek: number
  perMonth: number
  avgGapDays: number
  busiestCount: number
  busiestLabel: string
}

export interface CounterpartyPair {
  pair: [string, string]
  count: number
  rosterIds: [number, number]
}

export interface PnlPoint {
  ts: number
  value: number
}

export interface PnlSeries {
  rosterId: number
  ownerName: string
  ownerAvatar?: string
  color: string
  final: number
  points: PnlPoint[]
}

// Distinct line colors for the trade P&L "stock" chart
export const PNL_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#22d3ee',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#facc15', '#4ade80',
]

/** Which market view is on screen. */
export type MarketTab = 'overview' | 'trends'
