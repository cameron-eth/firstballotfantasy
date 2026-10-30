/**
 * Draft-pick prices for Trade Market from KTC's own pick assets (decision D6, G4).
 *
 * Trade Market used to price picks on a hard-coded scale with a 2027 bonus, so a pick and a
 * player in the same trade were on different scales. KTC lists picks as "{season} {Early|Mid|
 * Late} {1st..4th}". A traded pick's slot is rarely known when it is traded, so it is priced
 * as KTC's Mid pick of its season and round. KTC lists no pick past the 4th round; those add
 * no value. Values are KTC superflex, divided by 100 like player values (lib/trade-utils.ts).
 *
 * KTC adds a new pick class some time after the previous draft (2029 picks first appear on
 * 2026-09-22), so a pick traded before KTC listed it takes its first KTC price. A pick used
 * before KTC history starts (every 2025 pick) has no price on either basis.
 */

const ROUND_SUFFIX = ['1st', '2nd', '3rd', '4th']

type TradePick = { season: string | number; round: number }
type Trade = { transaction_id: string; draft_picks?: TradePick[] | null }

/** Today's price per pick, and each trade's picks priced on the trade date, keyed by pickKey. */
export type PickKtc = {
  today: Record<string, number>
  byTrade: Record<string, Record<string, number>>
}

export const pickKey = (pick: TradePick) => `${pick.season}:${pick.round}`

/** The KTC asset that prices a pick, or null for a round KTC doesn't list. */
export function pickAssetName(pick: TradePick): string | null {
  const suffix = ROUND_SUFFIX[pick.round - 1]
  return suffix ? `${pick.season} Mid ${suffix}` : null
}

/** Every KTC pick asset a set of trades needs, by pickKey. */
export function pickAssets(trades: Trade[]): Map<string, string> {
  const assets = new Map<string, string>()
  for (const trade of trades)
    for (const pick of trade.draft_picks ?? []) {
      const name = pickAssetName(pick)
      if (name) assets.set(pickKey(pick), name)
    }
  return assets
}

/**
 * transaction_id → pickKey → KTC SF value on the trade's KTC day. `dayFor` gives that day
 * (the newest complete day on or before the trade); a trade before price history has none.
 * A pick KTC didn't list yet that day takes its first listing from `firstListed`.
 */
export function tradePickKtc(
  trades: (Trade & { created?: number; status_updated?: number })[],
  dayFor: (trade: Trade & { created?: number; status_updated?: number }) => string | null,
  /** Day → asset name → KTC SF value. */
  byDay: Record<string, Record<string, number>>,
  /** Asset name → its first KTC listing. */
  firstListed: Map<string, { day: string; value: number }> = new Map()
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const trade of trades) {
    if (!trade.draft_picks?.length) continue
    const day = dayFor(trade)
    if (!day) continue
    const priced: Record<string, number> = {}
    for (const pick of trade.draft_picks) {
      const name = pickAssetName(pick)
      const first = name ? firstListed.get(name) : undefined
      const value = name
        ? (byDay[day]?.[name] ?? (first && first.day > day ? first.value : undefined))
        : undefined
      if (typeof value === 'number' && value > 0) priced[pickKey(pick)] = value
    }
    result[trade.transaction_id] = priced
  }
  return result
}

/**
 * A pick's value in a trade on the chosen basis, on the player scale (KTC / 100). With no
 * KTC price (a round past the 4th, or no listing that day) the pick adds nothing.
 */
export function pickValue(
  pickKtc: PickKtc | undefined,
  basis: 'today' | 'tradeDate',
  trade: { transaction_id: string },
  pick: TradePick
): number {
  const ktc =
    basis === 'today'
      ? pickKtc?.today[pickKey(pick)]
      : pickKtc?.byTrade[trade.transaction_id]?.[pickKey(pick)]
  return typeof ktc === 'number' ? ktc / 100 : 0
}

/** Traded picks with no KTC price on this basis: rounds past the 4th and picks KTC never listed. */
export function unpricedPicks(
  trades: Trade[],
  pickKtc: PickKtc | undefined,
  basis: 'today' | 'tradeDate'
): number {
  let count = 0
  for (const trade of trades)
    for (const pick of trade.draft_picks ?? [])
      if (pickValue(pickKtc, basis, trade, pick) === 0) count++
  return count
}
