/**
 * KTC value of each traded player on the day of the trade (PR-16b, decision D4).
 *
 * Trade Market used today's KTC for every trade, so a deal was judged with hindsight. A
 * trade from the first complete KTC day on (2026-04-17 when this shipped; complete days are
 * the ones scripts/sync-ktc-values.mjs marks) is priced on its date: the newest complete
 * day on or before it. An older trade has no price history; it is left out of the
 * trade-date view rather than given today's price.
 */

type Trade = {
  transaction_id: string
  created?: number
  status_updated?: number
  adds?: Record<string, number> | null
}
type SleeperPlayer = { first_name?: string; last_name?: string; full_name?: string }

/** Same normalization the Trade Market uses to join KTC names. */
export const normalizeKtcName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** UTC calendar day of a Sleeper timestamp (unix ms). */
export const tradeDay = (trade: Trade) =>
  new Date(Number(trade.created || trade.status_updated || 0)).toISOString().slice(0, 10)

/** The newest KTC day on or before `day`, or null before price history starts. */
export function ktcDayFor(day: string, sortedDays: readonly string[]): string | null {
  let found: string | null = null
  for (const d of sortedDays) {
    if (d > day) break
    found = d
  }
  return found
}

/** The KTC days a set of trades needs. */
export function ktcDaysNeeded(trades: Trade[], sortedDays: readonly string[]): string[] {
  return [...new Set(trades.flatMap((t) => ktcDayFor(tradeDay(t), sortedDays) ?? []))].sort()
}

/**
 * transaction_id → player id → KTC superflex value on the trade date. A trade before price
 * history has no entry; a player KTC didn't list that day is absent from the trade's map.
 */
export function tradeDateKtc(
  trades: Trade[],
  players: Record<string, SleeperPlayer>,
  ktcByDay: Record<string, Record<string, number>>,
  sortedDays: readonly string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const trade of trades) {
    const day = ktcDayFor(tradeDay(trade), sortedDays)
    if (!day) continue
    const values = ktcByDay[day] ?? {}
    const priced: Record<string, number> = {}
    for (const pid of Object.keys(trade.adds ?? {})) {
      const p = players[pid]
      const name = p?.full_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()
      const value = name ? values[normalizeKtcName(name)] : undefined
      if (typeof value === 'number' && value > 0) priced[pid] = value
    }
    result[trade.transaction_id] = priced
  }
  return result
}

/**
 * Rankings that price one player at `ktc`, for processPlayerForTrade: the player's own
 * entry (tier, rank) with the trade-date KTC value in place of today's. With no KTC value
 * that day (null), the player falls back to rank, as today's view does without KTC.
 */
export function rankingsAtTradeDate(
  playerName: string,
  ktc: number | null,
  rankings: Record<string, any>,
  keysFor: (name: string) => string[]
): Record<string, any> {
  const own = keysFor(playerName)
    .map((key) => rankings[key])
    .find(Boolean)
  return {
    [playerName]: {
      rank: 999,
      tier_name: 'Unranked',
      ...own,
      total_score: null,
      ktc_value_sf: ktc,
    },
  }
}
