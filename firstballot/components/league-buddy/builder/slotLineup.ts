import { optimalLineup, parseScoringSlots } from '../draft-order/maxPointsFor'

export interface SlotPlayer {
  id: string
  position: string
  positions?: string[]
  ppg?: number
}
export const fitsSlot = (eligible: string[], player: SlotPlayer) =>
  (player.positions?.length ? player.positions : [player.position]).some((position) =>
    eligible.includes(position)
  )

export function buildSlotLineup(
  raw: string[],
  players: SlotPlayer[],
  overrides: Record<string, string> = {}
) {
  const counts: Record<string, number> = {}
  const slots = raw.flatMap((code) => {
    const eligible = parseScoringSlots([code])[0]
    if (!eligible) return []
    const key = code.toUpperCase()
    counts[key] = (counts[key] ?? 0) + 1
    const label =
      key === 'SUPER_FLEX' || key === 'QB/RB/WR/TE'
        ? 'SF'
        : key === 'REC_FLEX'
          ? 'W/T'
          : key === 'WRRB_FLEX'
            ? 'W/R'
            : key
    return [{ id: `${key}${counts[key]}`, label: `${label}${counts[key]}`, eligible }]
  })
  const byId = new Map(players.map((p) => [p.id, p]))
  const used = new Set<string>()
  const assignments: Record<string, string> = {}
  for (const slot of slots) {
    const p = byId.get(overrides[slot.id])
    if (p && fitsSlot(slot.eligible, p) && !used.has(p.id)) {
      assignments[slot.id] = p.id
      used.add(p.id)
    }
  }
  const remaining = slots.filter((s) => !assignments[s.id])
  const scores = Object.fromEntries(
    players
      .filter((p) => !used.has(p.id))
      .map((p) => [p.id, Number.isFinite(p.ppg) ? p.ppg! : -10000])
  )
  const best = optimalLineup(
    scores,
    remaining.map((s) => s.eligible),
    (id) => byId.get(id)?.positions ?? byId.get(id)?.position
  )
  for (const seat of best.seated) assignments[remaining[seat.slotIndex].id] = seat.playerId
  // Prefer the strongest player in the first compatible slot without changing the optimal set.
  for (let i = 0; i < remaining.length; i++)
    for (let j = i + 1; j < remaining.length; j++) {
      const a = byId.get(assignments[remaining[i].id]),
        b = byId.get(assignments[remaining[j].id])
      if (
        a &&
        b &&
        fitsSlot(remaining[i].eligible, b) &&
        fitsSlot(remaining[j].eligible, a) &&
        (b.ppg ?? -10000) > (a.ppg ?? -10000)
      ) {
        assignments[remaining[i].id] = b.id
        assignments[remaining[j].id] = a.id
      }
    }
  const starters = new Set(Object.values(assignments))
  return slots.map((slot) => ({
    ...slot,
    starter: byId.get(assignments[slot.id]),
    backups: players
      .filter((p) => !starters.has(p.id) && fitsSlot(slot.eligible, p))
      .sort((a, b) => (b.ppg ?? -10000) - (a.ppg ?? -10000)),
  }))
}
