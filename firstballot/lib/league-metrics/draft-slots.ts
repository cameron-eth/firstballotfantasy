/**
 * Which slot each team drafts from, and on what basis (PR-8, audit R1-3, decision D2).
 *
 * Five call sites used to pick slots with three bases and three readiness checks, so the
 * Picks tab could show 1.01 on the capital cards and 1.03 on the board. Every surface now
 * asks this module, and each one names the basis it shows.
 *
 * Default basis (D2): projected Max PF when every team has a real projection, otherwise
 * record. A page may let the viewer pick another basis; the same basis always gives the
 * same slots.
 */
import {
  buildDraftOrder,
  type DraftOrderMetric,
  type DraftOrderRow,
} from '@/components/league-buddy/draft-order/draftOrderBoard'
import type { MaxPointsForEntry } from '@/components/league-buddy/draft-order/maxPointsFor'

export type DraftSlotBasis = DraftOrderMetric

export interface DraftSlotInputs {
  maxPointsFor: Record<number, MaxPointsForEntry>
  /** rosterId → projected season-end Max PF. */
  projectedMaxPointsFor: Record<number, number>
  /** rosterId → projected optimal-lineup points per remaining week; 0 without projections. */
  projectedPerWeek: Record<number, number>
  /** Regular-season weeks already scored. */
  weeksCounted: number
  /** Regular-season weeks still to play. */
  remainingWeeks: number
  loading: boolean
}

interface Team {
  rosterId: number
}

/** Max PF needs a scored week for every team; before that every team sits at zero. */
export function maxPfReady(teams: Team[], d: DraftSlotInputs): boolean {
  return (
    !d.loading &&
    teams.length > 1 &&
    d.weeksCounted > 0 &&
    teams.every((t) => (d.maxPointsFor[t.rosterId]?.maxPointsFor ?? 0) > 0)
  )
}

/**
 * The projection is real only when every team's remaining weeks were projected from player
 * projections. Without them the projected total is just Max PF so far, which used to make
 * the record fallback unreachable.
 */
export function projectedReady(teams: Team[], d: DraftSlotInputs): boolean {
  if (d.loading || teams.length < 2) return false
  const totals = teams.every((t) => {
    const total = d.projectedMaxPointsFor[t.rosterId]
    return Number.isFinite(total) && total > 0
  })
  if (!totals) return false
  return d.remainingWeeks > 0
    ? teams.every((t) => (d.projectedPerWeek[t.rosterId] ?? 0) > 0)
    : maxPfReady(teams, d)
}

export function basisReady(basis: DraftSlotBasis, teams: Team[], d: DraftSlotInputs): boolean {
  if (basis === 'maxpf') return maxPfReady(teams, d)
  if (basis === 'projected') return projectedReady(teams, d)
  return !d.loading && teams.length > 1
}

export function defaultDraftSlotBasis(teams: Team[], d: DraftSlotInputs): DraftSlotBasis {
  return projectedReady(teams, d) ? 'projected' : 'record'
}

export interface DraftSlots {
  basis: DraftSlotBasis
  ready: boolean
  /** Draft order, 1.01 first; empty until the basis is ready. */
  rows: DraftOrderRow[]
  /** rosterId → slot (1-based); empty until the basis is ready. */
  slotByRoster: Record<number, number>
}

export function draftSlots(
  teams: Parameters<typeof buildDraftOrder>[0],
  d: DraftSlotInputs,
  basis: DraftSlotBasis = defaultDraftSlotBasis(teams, d)
): DraftSlots {
  const ready = basisReady(basis, teams, d)
  const rows = ready ? buildDraftOrder(teams, d.maxPointsFor, d.projectedMaxPointsFor, basis) : []
  return {
    basis,
    ready,
    rows,
    slotByRoster: Object.fromEntries(rows.map((r) => [r.rosterId, r.pick])),
  }
}

/** How a slot was decided, for the label next to it: "Slot 1.03 by projected Max PF". */
export const BASIS_PHRASE: Record<DraftSlotBasis, string> = {
  record: 'record',
  maxpf: 'Max PF',
  projected: 'projected Max PF',
}
