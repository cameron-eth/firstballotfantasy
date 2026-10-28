/**
 * The Trade Market sends only what its trades reference (PR-16, audit R3-2). The page
 * used to receive Sleeper's whole players file (~15.6 MB) and every ranking (~290 KB) to
 * price a few hundred players. Every client lookup is by a traded player's id or by a
 * name form from rankingNameKeys, so the trimmed payload gives the same numbers.
 */
import { rankingNameKeys } from '@/lib/trade-utils'

type Trade = { adds?: Record<string, number> | null; drops?: Record<string, number> | null }
type SleeperPlayer = { full_name?: string; first_name?: string; last_name?: string }

/** Every player id that moved in any of these trades. */
export function referencedPlayerIds(trades: Trade[]): Set<string> {
  const ids = new Set<string>()
  for (const trade of trades) {
    for (const id of Object.keys(trade.adds ?? {})) ids.add(id)
    for (const id of Object.keys(trade.drops ?? {})) ids.add(id)
  }
  return ids
}

/** The players and rankings entries these trades can look up, nothing else. */
export function trimForTrades<P extends SleeperPlayer>(
  trades: Trade[],
  allPlayers: Record<string, P>,
  rankings: Record<string, unknown>
) {
  const players: Record<string, P> = {}
  const keys = new Set<string>()
  for (const id of referencedPlayerIds(trades)) {
    const player = allPlayers[id]
    if (!player) continue
    players[id] = player
    // Both name forms the page uses: valuation ("first last") and display (full_name first).
    const names = [
      `${player.first_name} ${player.last_name}`,
      player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim(),
    ]
    for (const name of names) for (const key of rankingNameKeys(name)) keys.add(key)
  }
  const trimmedRankings = Object.fromEntries(
    Object.entries(rankings).filter(([key]) => keys.has(key))
  )
  return { allPlayers: players, dynastyRankings: trimmedRankings }
}
