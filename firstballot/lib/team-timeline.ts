import type { Scenario, Target } from './team-scenarios'
import type { OwnedPick } from './sleeper-sdk/pick-inventory'
import type { Prospect } from '@/components/scouting/types'
export function arrivalYear(target: Target, baseYear: number) {
  return target.kind === 'draft' ? (target.year ?? baseYear + 1) : (target.arrivalYear ?? baseYear)
}
export function scenarioAtYear(scenario: Scenario, year: number, baseYear: number): Scenario {
  return {
    ...scenario,
    targets: scenario.targets.filter((t) => arrivalYear(t, baseYear) <= year),
    outgoing: [
      ...new Set([
        ...scenario.outgoing.filter((id) => (scenario.departureYears?.[id] ?? baseYear) <= year),
        ...(year >= baseYear ? (scenario.fundingPlans ?? []).flatMap((f) => f.givePlayerIds) : []),
      ]),
    ],
  }
}
export interface CapitalFit {
  targetId: string
  status: 'covered' | 'trade-up' | 'no-capital' | 'unknown'
  pick?: OwnedPick
  slot?: number
  rank?: number
}
/** One owned pick can fund at most one target. Class rank is only a planning proxy, never ADP. */
export function assessDraftCapital(
  targets: Target[],
  prospects: Prospect[],
  picks: OwnedPick[],
  slotByOriginal: Record<number, number>,
  leagueSize: number,
  supportedYears = [...new Set(picks.map((p) => Number(p.season)))],
  manual: Record<string, string> = {}
): CapitalFit[] {
  const byId = new Map(prospects.map((p) => [`prospect:${p.id}`, p]))
  const used = new Set<string>()
  // Manual pairings first: the user decided, so automatic allocation must not spend that pick.
  const pinned = new Map<string, OwnedPick>()
  for (const [pickId, targetId] of Object.entries(manual)) {
    const pick = picks.find((p) => p.id === pickId)
    const target = targets.find((t) => t.id === targetId)
    if (
      pick &&
      target?.kind === 'draft' &&
      target.year === Number(pick.season) &&
      !pinned.has(targetId)
    ) {
      pinned.set(targetId, pick)
      used.add(pick.id)
    }
  }
  const ordered = targets
    .filter((t) => t.kind === 'draft')
    .map((t) => ({ target: t, rank: byId.get(t.id)?.overall_rank }))
    .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
  return ordered.map(({ target, rank }) => {
    const chosen = pinned.get(target.id)
    if (chosen) {
      const base = slotByOriginal[chosen.roster_id]
      if (!rank || rank < 1 || !base)
        return { targetId: target.id, status: 'unknown', rank, pick: chosen }
      const slot = (chosen.round - 1) * leagueSize + base
      return {
        targetId: target.id,
        status: slot <= rank ? 'covered' : 'trade-up',
        rank,
        pick: chosen,
        slot,
      }
    }
    if (!target.year || !supportedYears.includes(target.year))
      return { targetId: target.id, status: 'unknown', rank }
    const available = picks.filter((p) => Number(p.season) === target.year && !used.has(p.id))
    const projected = available.flatMap((p) =>
      slotByOriginal[p.roster_id]
        ? [{ pick: p, slot: (p.round - 1) * leagueSize + slotByOriginal[p.roster_id] }]
        : []
    )
    if (!available.length) return { targetId: target.id, status: 'no-capital', rank }
    if (!rank || rank < 1 || projected.length !== available.length)
      return { targetId: target.id, status: 'unknown', rank }
    // Use the latest pick that still reaches the rank proxy, conserving earlier capital.
    const covered = projected.filter((p) => p.slot <= rank).sort((a, b) => b.slot - a.slot)[0]
    const allocation = covered ?? projected.sort((a, b) => a.slot - b.slot)[0]
    used.add(allocation.pick.id)
    return { targetId: target.id, status: covered ? 'covered' : 'trade-up', rank, ...allocation }
  })
}
