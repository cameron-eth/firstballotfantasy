// Trade market filter state and the trade-scoping logic that reads it.
//
// The four filters always move together and are read as a set, so they live in one
// reducer rather than four useState calls.

import { inWeekRange } from './utils'

export type AssetFilter = 'all' | 'players' | 'picks' | 'faab'

export interface MarketFilters {
  season: string
  weekRange: string
  roster: string
  asset: AssetFilter
}

export type MarketFilterKey = keyof MarketFilters

export const INITIAL_MARKET_FILTERS: MarketFilters = {
  season: 'all',
  weekRange: 'all',
  roster: 'all',
  asset: 'all',
}

export type MarketFilterAction =
  | { type: 'set'; key: MarketFilterKey; value: string }
  | { type: 'reset' }

export function marketFiltersReducer(
  state: MarketFilters,
  action: MarketFilterAction
): MarketFilters {
  switch (action.type) {
    case 'set':
      return { ...state, [action.key]: action.value }
    case 'reset':
      return INITIAL_MARKET_FILTERS
    default:
      return state
  }
}

interface RawTransaction {
  type?: string
  created?: number
  status_updated?: number
  leg?: number
  roster_ids?: number[]
  adds?: Record<string, number> | null
  drops?: Record<string, number> | null
  draft_picks?: unknown[]
  waiver_budget?: unknown[]
}

/** Season a transaction belongs to, from whichever timestamp Sleeper supplied. */
function seasonOf(tx: RawTransaction): string {
  const timestamp = tx.created || tx.status_updated
  if (!timestamp) return ''
  return new Date(timestamp).getFullYear().toString()
}

/** Completed trades matching every active filter. */
export function filterTrades<T extends RawTransaction>(
  transactions: T[],
  filters: MarketFilters
): T[] {
  return transactions
    .filter((tx) => tx?.type === 'trade')
    .filter((tx) => {
      const rosterIds = Array.isArray(tx.roster_ids) ? tx.roster_ids : []
      const hasPlayers =
        Object.keys(tx.adds ?? {}).length > 0 || Object.keys(tx.drops ?? {}).length > 0
      const hasPicks = Array.isArray(tx.draft_picks) && tx.draft_picks.length > 0
      const hasFaab = Array.isArray(tx.waiver_budget) && tx.waiver_budget.length > 0

      const seasonOk = filters.season === 'all' || seasonOf(tx) === filters.season
      const weekOk = inWeekRange(Number(tx.leg || 0), filters.weekRange)
      const rosterOk = filters.roster === 'all' || rosterIds.includes(Number(filters.roster))
      const assetOk =
        filters.asset === 'all' ||
        (filters.asset === 'players' && hasPlayers) ||
        (filters.asset === 'picks' && hasPicks) ||
        (filters.asset === 'faab' && hasFaab)

      return seasonOk && weekOk && rosterOk && assetOk
    })
}

/** Seasons present in the data, newest first, for the season filter options. */
export function collectSeasonOptions(
  transactions: RawTransaction[],
  leagueHistory: { season: string }[]
): string[] {
  const seasons = new Set<string>()
  for (const tx of transactions) {
    const season = seasonOf(tx)
    if (season) seasons.add(season)
  }
  for (const league of leagueHistory) {
    if (league.season) seasons.add(league.season)
  }
  return [...seasons].sort((a, b) => Number(b) - Number(a))
}
