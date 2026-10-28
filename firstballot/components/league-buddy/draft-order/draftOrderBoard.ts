/**
 * Projected draft order, under either of the two orderings a league can assign.
 *
 * `record` is the traditional reverse-standings order. `maxpf` orders by Max Points
 * For, the anti-tanking variant: the worst *ceiling* picks first, so sitting your
 * best players can't buy you the 1.01.
 */
import type { TeamData } from '../types'
import { compareStandings, winPct } from '@/lib/league-metrics/standings'
import { slotLabel } from '@/lib/picks-overview'
import type { MaxPointsForEntry } from './maxPointsFor'

export type DraftOrderMetric = 'record' | 'maxpf' | 'projected'

/**
 * The metric each view is measured against in the comparison column.
 *
 * Record and Max PF check each other — that pairing is the anti-tanking signal. The
 * projected board checks today's Max PF instead, so the column reads as "where the
 * race stands now" against "where it finishes".
 */
const ALTERNATE_METRIC: Record<DraftOrderMetric, DraftOrderMetric> = {
  record: 'maxpf',
  maxpf: 'record',
  projected: 'maxpf',
}

export interface DraftOrderRow {
  /** 1-based pick number; 1 is the 1.01. */
  pick: number
  /** '1.01', '1.12' — round-one slot notation. */
  label: string
  rosterId: number
  teamName: string
  wins: number
  losses: number
  ties: number
  winPct: number
  /** Season points actually scored. */
  pointsFor: number
  /** Null when this team has no Max PF yet; such teams sort after every team with data. */
  maxPointsFor: number | null
  /** Projected season-end Max PF; null when the team has no projection. */
  projectedMaxPointsFor: number | null
  /** Where this team would pick under the comparison metric. */
  altPick: number
  altLabel: string
  /**
   * Distance from the 1.01 in the active metric's units — wins for `record`,
   * points for `maxpf`. Zero for the team currently holding the pick.
   */
  gapToTop: number
  /**
   * 0–1 position in the race, 1 = holds the 1.01. Drives the bar width. Zero for
   * every team when nothing separates them yet, so the board doesn't draw a race
   * that hasn't started.
   */
  raceShare: number
}

export function firstRoundLabel(pick: number): string {
  return slotLabel(1, pick)
}

interface Scored {
  team: TeamData
  winPct: number
  pointsFor: number
  maxPointsFor: number | null
  projectedMaxPointsFor: number | null
}

/**
 * Worst first, but a team with no value for the metric sorts last: missing data is not
 * a bad season, so it must never claim the 1.01 (it used to count as 0).
 */
function ascendingKnownFirst(a: number | null, b: number | null): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
  return a - b
}

/**
 * Reverse-standings comparator: the worst team sorts first.
 *
 * The record order is the standings order (lib/league-metrics/standings) reversed, so a
 * team drafts exactly where it finishes. Max PF ties break on that same order, which
 * effectively never happens with two decimal places of scoring.
 */
function comparatorFor(metric: DraftOrderMetric) {
  return (a: Scored, b: Scored): number => {
    if (metric === 'projected') {
      return (
        ascendingKnownFirst(a.projectedMaxPointsFor, b.projectedMaxPointsFor) ||
        ascendingKnownFirst(a.maxPointsFor, b.maxPointsFor) ||
        compareStandings(b.team, a.team)
      )
    }
    if (metric === 'maxpf') {
      return ascendingKnownFirst(a.maxPointsFor, b.maxPointsFor) || compareStandings(b.team, a.team)
    }
    // Exactly the reverse of the standings order on every page.
    return compareStandings(b.team, a.team)
  }
}

export function buildDraftOrder(
  teams: TeamData[],
  maxPointsForByRoster: Record<number, MaxPointsForEntry>,
  projectedByRoster: Record<number, number>,
  metric: DraftOrderMetric
): DraftOrderRow[] {
  const scored: Scored[] = teams.map((team) => {
    const entry = maxPointsForByRoster[team.rosterId]
    return {
      team,
      winPct: winPct(team),
      // Season points with Sleeper's decimals, the same number the standings sort on.
      pointsFor: team.pointsFor,
      maxPointsFor: entry ? entry.maxPointsFor : null,
      projectedMaxPointsFor: Number.isFinite(projectedByRoster[team.rosterId])
        ? projectedByRoster[team.rosterId]
        : null,
    }
  })

  const ordered = [...scored].sort(comparatorFor(metric))
  const alternate = [...scored].sort(comparatorFor(ALTERNATE_METRIC[metric]))
  const altPickOf = new Map(alternate.map((s, index) => [s.team.rosterId, index + 1]))

  const valueOf = (s: Scored) => {
    if (metric === 'projected') return s.projectedMaxPointsFor
    if (metric === 'maxpf') return s.maxPointsFor
    return s.winPct
  }
  // The race is measured among teams that have a value; the rest sort last with no gap.
  const known = ordered.flatMap((s) => {
    const value = valueOf(s)
    return value == null ? [] : [value]
  })
  const top = known[0] ?? 0
  const spread = (known[known.length - 1] ?? 0) - top

  return ordered.map((s, index) => {
    const pick = index + 1
    const altPick = altPickOf.get(s.team.rosterId) ?? pick
    const gamesPlayed = s.team.wins + s.team.losses + (s.team.ties ?? 0)
    const value = valueOf(s)
    const gapToTop =
      value == null
        ? 0
        : metric !== 'record'
          ? value - top
          : // Win percentage differences are hard to read; convert back to wins so the
            // gap says "you are two wins away from the 1.01".
            (s.winPct - top) * gamesPlayed

    return {
      pick,
      label: firstRoundLabel(pick),
      rosterId: s.team.rosterId,
      teamName: s.team.teamName,
      wins: s.team.wins,
      losses: s.team.losses,
      ties: s.team.ties ?? 0,
      winPct: s.winPct,
      pointsFor: s.pointsFor,
      maxPointsFor: s.maxPointsFor,
      projectedMaxPointsFor: s.projectedMaxPointsFor,
      altPick,
      altLabel: firstRoundLabel(altPick),
      gapToTop,
      raceShare: value != null && spread > 0 ? 1 - (value - top) / spread : 0,
    }
  })
}

/** Record as '3-1' or '3-1-1'. */
export function formatRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}

/** How far this team is from the 1.01, phrased for the metric in play. */
export function formatGap(row: DraftOrderRow, metric: DraftOrderMetric): string {
  if (row.pick === 1) return 'holds 1.01'
  if (metric !== 'record') return `+${row.gapToTop.toFixed(1)} pts`
  const wins = Math.round(row.gapToTop * 10) / 10
  if (wins <= 0) return 'tiebreak'
  return `+${wins % 1 === 0 ? wins.toFixed(0) : wins.toFixed(1)} ${wins === 1 ? 'win' : 'wins'}`
}

/** Which metric the comparison column is measured against. */
export function alternateMetric(metric: DraftOrderMetric): DraftOrderMetric {
  return ALTERNATE_METRIC[metric]
}

export const METRIC_LABELS: Record<DraftOrderMetric, string> = {
  record: 'Record',
  maxpf: 'Max PF',
  projected: 'Projected',
}
