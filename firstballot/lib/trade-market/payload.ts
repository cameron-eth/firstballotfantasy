/**
 * The Trade Market sends only what its trades reference (PR-16, audit R3-2). The page
 * used to receive Sleeper's whole players file (~15.6 MB) and every ranking (~290 KB) to
 * price a few hundred players. Players and rankings are both keyed by Sleeper id (PR-19),
 * so the trimmed payload holds exactly what the page can look up.
 */

type Trade = { adds?: Record<string, number> | null; drops?: Record<string, number> | null }

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
export function trimForTrades<P>(
  trades: Trade[],
  allPlayers: Record<string, P>,
  rankings: Record<string, unknown>
) {
  const ids = referencedPlayerIds(trades)
  const pick = <T>(map: Record<string, T>) =>
    Object.fromEntries([...ids].flatMap((id) => (id in map ? [[id, map[id]]] : [])))
  return { allPlayers: pick(allPlayers), dynastyRankings: pick(rankings) }
}
