/**
 * Max Points For — the anti-tanking draft-order metric.
 *
 * A team's Max PF is what it *would* have scored had it started its best possible
 * lineup every week. Because it ignores who was actually started, benching your
 * studs to lose does not move it: you cannot tank your way to the 1.01 without
 * genuinely having the worst roster.
 *
 * Sleeper gives us `players_points` per roster per week (every rostered player,
 * not just starters), so the optimal lineup is recoverable after the fact.
 */

export interface RosterWeekScores {
  rosterId: number
  /** playerId → points scored that week. */
  playersPoints: Record<string, number>
  /** What the manager actually started, as scored by Sleeper. */
  actualPoints: number
}

export interface MaxPointsForEntry {
  rosterId: number
  /** Season sum of the best possible lineup each week. */
  maxPointsFor: number
  /** Season sum of what was actually started. */
  actualPointsFor: number
  /** Max PF − actual PF: points left on the bench. Never negative. */
  pointsLeftOnBench: number
  /** Share of the ceiling the manager actually captured, 0–1. */
  lineupEfficiency: number
  /** Scored weeks that fed the total. */
  weeksCounted: number
}

// ---------------------------------------------------------------------------
// Lineup slots
// ---------------------------------------------------------------------------

const NON_STARTING_SLOTS = new Set(['BN', 'IR', 'TAXI'])

/**
 * Sleeper slot code → the positions allowed to fill it.
 *
 * Unlike the KTC valuation model in `lib/sleeper-sdk/values.ts`, K/DEF/IDP are kept:
 * they score real points, and dropping them would understate Max PF against the
 * league's own Points For.
 */
const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  DL: ['DL', 'DE', 'DT'],
  LB: ['LB'],
  DB: ['DB', 'CB', 'S'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  WRRB_WRT: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  'QB/RB/WR/TE': ['QB', 'RB', 'WR', 'TE'],
  IDP_FLEX: ['DL', 'LB', 'DB', 'DE', 'DT', 'CB', 'S'],
}

/** Starting slots as eligibility sets, in lineup order. Bench/IR/taxi dropped. */
export function parseScoringSlots(rosterPositions: string[] | undefined): string[][] {
  if (!Array.isArray(rosterPositions)) return []
  const slots: string[][] = []
  for (const raw of rosterPositions) {
    const code = raw?.toUpperCase()
    if (!code || NON_STARTING_SLOTS.has(code)) continue
    const eligible = SLOT_ELIGIBILITY[code]
    if (eligible) slots.push(eligible)
  }
  return slots
}

// ---------------------------------------------------------------------------
// Optimal lineup
// ---------------------------------------------------------------------------

interface Candidate {
  points: number
  slots: number[] // indices of slots this player is eligible for
}

/**
 * Score the best legal lineup out of `playersPoints`.
 *
 * Assigning players to slots is a bipartite matching, and the sets of players that
 * can be simultaneously seated form a transversal matroid — so taking players in
 * descending order of points and keeping each one that still leaves a valid seating
 * (found via an augmenting path) yields the true maximum, not just a good guess.
 * A plain "fill the most constrained slot first" pass can miss it whenever slot
 * eligibility overlaps without nesting, e.g. a league running both WRRB_FLEX and
 * REC_FLEX.
 *
 * Negative scorers sort last and so are only seated in slots nothing else can fill,
 * which matches reality: a lineup slot has to be filled by someone.
 */
export function optimalLineupPoints(
  playersPoints: Record<string, number>,
  slots: string[][],
  positionOf: (playerId: string) => string | undefined
): number {
  if (slots.length === 0) return 0

  const candidates: Candidate[] = []
  for (const [playerId, points] of Object.entries(playersPoints)) {
    const position = positionOf(playerId)?.toUpperCase()
    if (!position) continue
    const eligible: number[] = []
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].includes(position)) eligible.push(i)
    }
    if (eligible.length > 0) {
      candidates.push({ points: Number(points) || 0, slots: eligible })
    }
  }

  candidates.sort((a, b) => b.points - a.points)

  // slotOwner[i] = index into `candidates` currently seated in slot i, or -1.
  const slotOwner = new Int32Array(slots.length).fill(-1)
  let seated = 0
  let total = 0

  const tryPlace = (candidateIndex: number, visited: Uint8Array): boolean => {
    for (const slot of candidates[candidateIndex].slots) {
      if (visited[slot]) continue
      visited[slot] = 1
      if (slotOwner[slot] === -1 || tryPlace(slotOwner[slot], visited)) {
        slotOwner[slot] = candidateIndex
        return true
      }
    }
    return false
  }

  for (let i = 0; i < candidates.length && seated < slots.length; i++) {
    if (tryPlace(i, new Uint8Array(slots.length))) {
      seated++
      total += candidates[i].points
    }
  }

  return total
}

// ---------------------------------------------------------------------------
// Season aggregate
// ---------------------------------------------------------------------------

/**
 * Roll weekly scores into per-roster season totals.
 *
 * `weeks` is one entry per scored week. A week where nobody scored anything has not
 * been played yet and is skipped, so an unplayed week cannot drag a team's ceiling
 * down and hand it the 1.01.
 */
export function computeMaxPointsFor(
  weeks: RosterWeekScores[][],
  rosterPositions: string[] | undefined,
  positionOf: (playerId: string) => string | undefined
): Record<number, MaxPointsForEntry> {
  const slots = parseScoringSlots(rosterPositions)
  const totals: Record<number, MaxPointsForEntry> = {}

  const entryFor = (rosterId: number): MaxPointsForEntry => {
    if (!totals[rosterId]) {
      totals[rosterId] = {
        rosterId,
        maxPointsFor: 0,
        actualPointsFor: 0,
        pointsLeftOnBench: 0,
        lineupEfficiency: 0,
        weeksCounted: 0,
      }
    }
    return totals[rosterId]
  }

  for (const week of weeks) {
    const played = week.some(
      (roster) =>
        roster.actualPoints > 0 || Object.values(roster.playersPoints).some((p) => p !== 0)
    )
    if (!played) continue

    for (const roster of week) {
      const entry = entryFor(roster.rosterId)
      entry.maxPointsFor += optimalLineupPoints(roster.playersPoints, slots, positionOf)
      entry.actualPointsFor += roster.actualPoints
      entry.weeksCounted += 1
    }
  }

  for (const entry of Object.values(totals)) {
    // Actual can edge past the computed ceiling when Sleeper's stored starter scores
    // include a correction we can't see in players_points. Floor the gap at zero
    // rather than reporting a negative "left on bench".
    entry.pointsLeftOnBench = Math.max(0, entry.maxPointsFor - entry.actualPointsFor)
    entry.lineupEfficiency =
      entry.maxPointsFor > 0 ? Math.min(1, entry.actualPointsFor / entry.maxPointsFor) : 0
  }

  return totals
}
