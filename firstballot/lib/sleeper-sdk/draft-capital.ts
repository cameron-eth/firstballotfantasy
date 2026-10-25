import type { SleeperTradedPick } from './types'
export function draftCapital(
  rosterIds: number[],
  owner: number,
  years: number[],
  rounds: number,
  traded: SleeperTradedPick[]
) {
  const holders = new Map(traded.map((p) => [`${p.season}:${p.round}:${p.roster_id}`, p.owner_id]))
  return years.map((year) => {
    const byRound = Array.from({ length: rounds }, (_, i) => ({ round: i + 1, count: 0 }))
    for (const original of rosterIds)
      for (const entry of byRound) {
        const holder = holders.get(`${year}:${entry.round}:${original}`) ?? original
        if (holder === owner) entry.count++
      }
    return { year, total: byRound.reduce((sum, r) => sum + r.count, 0), byRound }
  })
}
