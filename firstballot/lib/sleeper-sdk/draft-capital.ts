import { pickInventory } from './pick-inventory'
import type { SleeperTradedPick } from './types'
export function draftCapital(
  rosterIds: number[],
  owner: number,
  years: number[],
  rounds: number,
  traded: SleeperTradedPick[]
) {
  const picks = pickInventory(rosterIds, years, rounds, traded).filter((p) => p.owner_id === owner)
  return years.map((year) => {
    const byRound = Array.from({ length: rounds }, (_, i) => ({
      round: i + 1,
      count: picks.filter((p) => Number(p.season) === year && p.round === i + 1).length,
    }))
    return { year, total: byRound.reduce((sum, r) => sum + r.count, 0), byRound }
  })
}
