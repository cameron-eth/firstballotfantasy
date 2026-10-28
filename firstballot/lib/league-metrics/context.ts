/**
 * League format, resolved once per league and passed to every metric (PR-5, audit R1-1).
 *
 * Before this module the app had four superflex rules that disagreed (one missed 2QB
 * leagues, one missed Sleeper's 'QB/RB/WR/TE' slot) and three places that assumed
 * superflex outright, so 1QB leagues were priced with superflex values. This is now the
 * only rule; tests/league-context.test.mjs pins it.
 */

export interface LeagueContext {
  /** A second QB can start, so KTC's superflex values apply instead of its 1QB values. */
  superflex: boolean
}

/** Sleeper's most common dynasty superflex shape, used when a league omits its slots. */
export const DEFAULT_ROSTER_POSITIONS: readonly string[] = [
  'QB',
  'RB',
  'RB',
  'WR',
  'WR',
  'WR',
  'TE',
  'FLEX',
  'SUPER_FLEX',
]

const SUPERFLEX_SLOTS = new Set(['SUPER_FLEX', 'QB/RB/WR/TE'])

/**
 * A lineup is superflex when any starting slot can hold a second QB: a superflex slot
 * (Sleeper names it 'SUPER_FLEX' or 'QB/RB/WR/TE') or more than one dedicated QB slot.
 */
export function isSuperflexFormat(rosterPositions: readonly string[]): boolean {
  return (
    rosterPositions.some((slot) => SUPERFLEX_SLOTS.has(slot)) ||
    rosterPositions.filter((slot) => slot === 'QB').length > 1
  )
}

/** The slots a league starts, or the default shape when Sleeper sent none. */
export function effectiveRosterPositions(
  rosterPositions: readonly string[] | null | undefined
): readonly string[] {
  return Array.isArray(rosterPositions) && rosterPositions.length > 0
    ? rosterPositions
    : DEFAULT_ROSTER_POSITIONS
}

export function resolveLeagueContext(
  league: { roster_positions?: readonly string[] | null } | null | undefined
): LeagueContext {
  return { superflex: isSuperflexFormat(effectiveRosterPositions(league?.roster_positions)) }
}
