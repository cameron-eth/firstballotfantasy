// Layer 2 of the Sleeper SDK: value generation.
//
// Everything here is a pure function over data the browser already holds, so power
// rankings recompute client-side on every render pass — no round trip, no server job,
// no stale nightly snapshot. Nothing in this file performs I/O.
//
// The scale is KTC's: a consensus dynasty value roughly in 0–10000 where an elite
// asset sits near the ceiling. When a player has no KTC value we derive one from their
// consensus rank on the same scale (see rankToValue) so mixed rosters stay comparable.

import { CORE_POSITIONS, type CorePosition } from './types'

/** Structural shape this module needs; any richer player object satisfies it. */
export interface ValuablePlayer {
  playerId: string
  playerName: string
  position: string
  rank?: number
  age?: number
  ktcValueSf?: number
  ktcValue1qb?: number
  espn_id?: string
  headshot_url?: string | null
}

export interface ValuationContext {
  /** League starts a SUPER_FLEX slot, so QB scarcity is priced in. */
  superflex: boolean
}

/** Top of the KTC value scale — a consensus 1.01-caliber dynasty asset. */
const VALUE_CEILING = 9999

/**
 * Consensus rank falls off faster than linearly: the gap between the RB1 and RB12 is
 * far wider than between the RB100 and RB111. A decay constant of 45 puts rank 12 near
 * 78% of ceiling, rank 50 near 34%, and rank 150+ into replacement-level noise —
 * closely tracking the shape of the KTC curve it stands in for.
 */
const RANK_DECAY = 45

export function rankToValue(rank: number | undefined): number {
  if (!rank || rank <= 0 || rank >= 999) return 0
  return Math.round(VALUE_CEILING * Math.exp(-(rank - 1) / RANK_DECAY))
}

/** A single player's dynasty value, KTC first and consensus rank as the fallback. */
export function playerValue(player: ValuablePlayer, ctx: ValuationContext): number {
  const ktc = ctx.superflex ? player.ktcValueSf : (player.ktcValue1qb ?? player.ktcValueSf)
  if (typeof ktc === 'number' && ktc > 0) return ktc
  return rankToValue(player.rank)
}

// ---------------------------------------------------------------------------
// Roster slots
// ---------------------------------------------------------------------------

export type SlotKind = 'position' | 'flex' | 'superflex'

export interface RosterSlot {
  /** Stable id, unique within a lineup: 'RB1', 'WR2', 'FLX1'. */
  id: string
  /** Display label: 'RB1', 'WR2', 'FLX', 'SFLX'. */
  label: string
  kind: SlotKind
  /** Positions allowed to fill this slot. */
  eligible: CorePosition[]
}

const FLEX_ELIGIBLE: CorePosition[] = ['RB', 'WR', 'TE']
const SUPER_FLEX_ELIGIBLE: CorePosition[] = ['QB', 'RB', 'WR', 'TE']
const NON_STARTING_SLOTS = new Set(['BN', 'IR', 'TAXI'])

/**
 * Sleeper's `roster_positions` is a flat slot array in lineup order. Turn it into
 * labeled starting slots, numbering repeats (RB1, RB2) the way a lineup card reads.
 * Slots this model does not value (K, DEF, bench, IR, taxi) are dropped.
 */
export function parseRosterSlots(rosterPositions: string[] | undefined): RosterSlot[] {
  if (!Array.isArray(rosterPositions) || rosterPositions.length === 0) return []

  const slots: RosterSlot[] = []
  const seen: Record<string, number> = {}

  const push = (key: string, label: string, kind: SlotKind, eligible: CorePosition[]) => {
    seen[key] = (seen[key] ?? 0) + 1
    slots.push({ id: `${key}${seen[key]}`, label, kind, eligible })
  }

  for (const raw of rosterPositions) {
    const slot = raw?.toUpperCase()
    if (!slot || NON_STARTING_SLOTS.has(slot)) continue

    if ((CORE_POSITIONS as readonly string[]).includes(slot)) {
      push(slot, slot, 'position', [slot as CorePosition])
    } else if (slot === 'FLEX' || slot === 'REC_FLEX' || slot === 'WRRB_FLEX') {
      push('FLX', 'FLX', 'flex', slot === 'REC_FLEX' ? ['WR', 'TE'] : FLEX_ELIGIBLE)
    } else if (slot === 'SUPER_FLEX' || slot === 'QB/RB/WR/TE') {
      push('SFLX', 'SFLX', 'superflex', SUPER_FLEX_ELIGIBLE)
    }
  }

  // Repeated dedicated slots read as RB1/RB2; a lone slot needs no number.
  const counts = slots.reduce<Record<string, number>>((acc, slot) => {
    const key = slot.label.replace(/\d+$/, '')
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return slots.map((slot) => {
    const key = slot.id.replace(/\d+$/, '')
    const index = slot.id.slice(key.length)
    return { ...slot, label: counts[key] > 1 ? `${key}${index}` : key }
  })
}

/** A league is superflex if any starting slot can hold a second QB. */
export function isSuperflexLineup(slots: RosterSlot[]): boolean {
  return slots.some((slot) => slot.kind === 'superflex')
}

// ---------------------------------------------------------------------------
// Team valuation
// ---------------------------------------------------------------------------

export interface FilledSlot extends RosterSlot {
  player: ValuablePlayer | null
  value: number
}

export interface TeamValuation {
  rosterId: number
  slots: FilledSlot[]
  /** Sum of every filled starting slot. */
  startersValue: number
  /**
   * Value of the best backup lineup — the top N bench players where N is the number of
   * starting slots. Bounding it this way scores usable depth instead of rewarding a
   * manager for hoarding forty replacement-level bodies.
   */
  benchValue: number
  /** Starter value by dedicated position slot (FLEX/SUPER_FLEX excluded). */
  positionValues: Record<CorePosition, number>
  /** Bench value by position, for the starters-vs-bench radar. */
  benchPositionValues: Record<CorePosition, number>
  flexValue: number
  superFlexValue: number
  /** Composite: starters carry the week, depth is insurance priced at a quarter. */
  powerScore: number
}

const BENCH_WEIGHT = 0.25

function emptyPositionMap(): Record<CorePosition, number> {
  return { QB: 0, RB: 0, WR: 0, TE: 0 }
}

/**
 * Fill a team's optimal starting lineup and score it. Dedicated slots are filled first
 * (most constrained wins — a QB-only slot has fewer candidates than a superflex), then
 * FLEX, then SUPER_FLEX, each taking the highest-valued player still on the board.
 */
export function valuateTeam(
  rosterId: number,
  players: ValuablePlayer[],
  slots: RosterSlot[],
  ctx: ValuationContext
): TeamValuation {
  const valued = players
    .filter((p) => (CORE_POSITIONS as readonly string[]).includes(p.position?.toUpperCase() ?? ''))
    .map((p) => ({ player: p, value: playerValue(p, ctx) }))
    .sort((a, b) => b.value - a.value)

  const used = new Set<string>()
  const order: SlotKind[] = ['position', 'flex', 'superflex']

  const filled: FilledSlot[] = slots.map((slot) => ({ ...slot, player: null, value: 0 }))

  for (const kind of order) {
    for (const slot of filled) {
      if (slot.kind !== kind) continue
      const pick = valued.find(
        (entry) =>
          !used.has(entry.player.playerId) &&
          slot.eligible.includes(entry.player.position.toUpperCase() as CorePosition)
      )
      if (!pick) continue
      used.add(pick.player.playerId)
      slot.player = pick.player
      slot.value = pick.value
    }
  }

  const positionValues = emptyPositionMap()
  const benchPositionValues = emptyPositionMap()
  let flexValue = 0
  let superFlexValue = 0

  for (const slot of filled) {
    if (!slot.player) continue
    if (slot.kind === 'flex') flexValue += slot.value
    else if (slot.kind === 'superflex') superFlexValue += slot.value
    else positionValues[slot.eligible[0]] += slot.value
  }

  const bench = valued.filter((entry) => !used.has(entry.player.playerId))
  const benchDepth = Math.max(1, filled.length)
  const usableBench = bench.slice(0, benchDepth)

  for (const entry of usableBench) {
    benchPositionValues[entry.player.position.toUpperCase() as CorePosition] += entry.value
  }

  const startersValue = filled.reduce((sum, slot) => sum + slot.value, 0)
  const benchValue = usableBench.reduce((sum, entry) => sum + entry.value, 0)

  return {
    rosterId,
    slots: filled,
    startersValue,
    benchValue,
    positionValues,
    benchPositionValues,
    flexValue,
    superFlexValue,
    powerScore: startersValue + benchValue * BENCH_WEIGHT,
  }
}

// ---------------------------------------------------------------------------
// League-wide power rankings
// ---------------------------------------------------------------------------

export type CategoryKey = CorePosition | 'FLEX' | 'SFLX' | 'STARTERS' | 'BENCH'

export interface RankedValue {
  value: number
  /** 1 = best in league. */
  rank: number
  /** value ÷ league best, 0–1 — the bar fill. */
  share: number
}

export interface TeamPowerRanking {
  rosterId: number
  valuation: TeamValuation
  /** 0–100 where the league's best roster scores 100, as in a power-ranking board. */
  score: number
  /** 1 = best roster in the league. */
  rank: number
}

export interface PowerRankings {
  teams: TeamPowerRanking[]
  slots: RosterSlot[]
  superflex: boolean
  /** Categories present in this league, in display order. */
  categories: CategoryKey[]
  categoryRanks: Record<number, Record<string, RankedValue>>
  slotRanks: Record<number, Record<string, RankedValue>>
}

export interface RankableTeam {
  rosterId: number
  players: ValuablePlayer[]
}

/** Rank a set of (rosterId, value) pairs — highest value is rank 1, ties share a rank. */
function rankValues(entries: { rosterId: number; value: number }[]): Record<number, RankedValue> {
  const sorted = [...entries].sort((a, b) => b.value - a.value)
  const best = sorted[0]?.value ?? 0
  const result: Record<number, RankedValue> = {}

  sorted.forEach((entry, index) => {
    const tied = sorted.findIndex((candidate) => candidate.value === entry.value)
    result[entry.rosterId] = {
      value: entry.value,
      rank: (tied === -1 ? index : tied) + 1,
      share: best > 0 ? entry.value / best : 0,
    }
  })

  return result
}

function categoryValue(valuation: TeamValuation, category: CategoryKey): number {
  switch (category) {
    case 'FLEX':
      return valuation.flexValue
    case 'SFLX':
      return valuation.superFlexValue
    case 'STARTERS':
      return valuation.startersValue
    case 'BENCH':
      return valuation.benchValue
    default:
      return valuation.positionValues[category]
  }
}

/**
 * Score every roster in the league and rank them overall, by category, and slot by slot.
 * One pass produces everything the power-rankings board renders.
 */
export function buildPowerRankings(
  teams: RankableTeam[],
  rosterPositions: string[] | undefined,
  options: { fallbackSlots?: RosterSlot[] } = {}
): PowerRankings {
  const slots =
    parseRosterSlots(rosterPositions).length > 0
      ? parseRosterSlots(rosterPositions)
      : (options.fallbackSlots ?? DEFAULT_SLOTS)

  const superflex = isSuperflexLineup(slots)
  const ctx: ValuationContext = { superflex }

  const valuations = teams.map((team) => valuateTeam(team.rosterId, team.players, slots, ctx))
  const bestPower = Math.max(0, ...valuations.map((v) => v.powerScore))

  const ranked = [...valuations]
    .sort((a, b) => b.powerScore - a.powerScore)
    .map((valuation, index) => ({
      rosterId: valuation.rosterId,
      valuation,
      score: bestPower > 0 ? Math.round((valuation.powerScore / bestPower) * 100) : 0,
      rank: index + 1,
    }))

  // Only surface categories this league actually starts.
  const categories: CategoryKey[] = []
  for (const position of CORE_POSITIONS) {
    if (slots.some((slot) => slot.kind === 'position' && slot.eligible[0] === position)) {
      categories.push(position)
    }
  }
  if (slots.some((slot) => slot.kind === 'flex')) categories.push('FLEX')
  if (superflex) categories.push('SFLX')
  categories.push('STARTERS', 'BENCH')

  const categoryRanks: Record<number, Record<string, RankedValue>> = {}
  for (const category of categories) {
    const ranks = rankValues(
      valuations.map((valuation) => ({
        rosterId: valuation.rosterId,
        value: categoryValue(valuation, category),
      }))
    )
    for (const [rosterId, rankedValue] of Object.entries(ranks)) {
      const id = Number(rosterId)
      categoryRanks[id] = { ...(categoryRanks[id] ?? {}), [category]: rankedValue }
    }
  }

  const slotRanks: Record<number, Record<string, RankedValue>> = {}
  for (const slot of slots) {
    const ranks = rankValues(
      valuations.map((valuation) => ({
        rosterId: valuation.rosterId,
        value: valuation.slots.find((s) => s.id === slot.id)?.value ?? 0,
      }))
    )
    for (const [rosterId, rankedValue] of Object.entries(ranks)) {
      const id = Number(rosterId)
      slotRanks[id] = { ...(slotRanks[id] ?? {}), [slot.id]: rankedValue }
    }
  }

  return { teams: ranked, slots, superflex, categories, categoryRanks, slotRanks }
}

/** Sleeper's most common dynasty superflex shape, used when a league omits its slots. */
export const DEFAULT_SLOTS: RosterSlot[] = parseRosterSlots([
  'QB',
  'RB',
  'RB',
  'WR',
  'WR',
  'WR',
  'TE',
  'FLEX',
  'SUPER_FLEX',
])

/** Ordinal suffix for rank labels: 1 → 1st, 2 → 2nd, 11 → 11th. */
export function ordinal(rank: number): string {
  const mod100 = rank % 100
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`
  switch (rank % 10) {
    case 1:
      return `${rank}st`
    case 2:
      return `${rank}nd`
    case 3:
      return `${rank}rd`
    default:
      return `${rank}th`
  }
}
