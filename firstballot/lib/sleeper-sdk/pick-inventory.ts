import type { SleeperTradedPick } from './types'
export interface OwnedPick {
  id: string
  season: string
  round: number
  roster_id: number
  owner_id: number
}
/** Port of sleeper-sdk analytics/pick_ownership.py: original identity + current holder. */
export function pickInventory(
  rosters: number[],
  years: number[],
  rounds: number,
  traded: SleeperTradedPick[]
): OwnedPick[] {
  const overrides = new Map(
    traded.map((p) => [`${p.season}:${p.round}:${p.roster_id}`, p.owner_id])
  )
  return years.flatMap((year) =>
    Array.from({ length: rounds }, (_, i) => i + 1).flatMap((round) =>
      rosters.flatMap((roster_id) => {
        const id = `${year}:${round}:${roster_id}`
        const owner_id = overrides.get(id) ?? roster_id
        return rosters.includes(owner_id)
          ? [{ id, season: String(year), round, roster_id, owner_id }]
          : []
      })
    )
  )
}
