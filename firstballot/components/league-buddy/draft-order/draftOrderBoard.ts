/**
 * Projected draft order, under either of the two orderings a league can assign.
 *
 * `record` is the traditional reverse-standings order. `maxpf` orders by Max Points
 * For, the anti-tanking variant: the worst *ceiling* picks first, so sitting your
 * best players can't buy you the 1.01.
 */
import type { TeamData } from '../types'
import type { MaxPointsForEntry } from './maxPointsFor'

export type DraftOrderMetric = 'record' | 'maxpf'

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
  maxPointsFor: number
  /** Where this team would pick under the *other* metric. */
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

export function pickLabel(pick: number): string {
  return `1.${String(pick).padStart(2, '0')}`
}

function winPctOf(team: TeamData): number {
  const ties = team.ties ?? 0
  const games = team.wins + team.losses + ties
  return games > 0 ? (team.wins + ties * 0.5) / games : 0
}

interface Scored {
  team: TeamData
  winPct: number
  pointsFor: number
  maxPointsFor: number
}

/**
 * Reverse-standings comparator: the worst team sorts first.
 *
 * Record ties break on points scored (Sleeper's own tiebreaker — fewer points is the
 * worse team, so it drafts earlier). Max PF ties break on record, which effectively
 * never happens with two decimal places of scoring.
 */
function comparatorFor(metric: DraftOrderMetric) {
  return (a: Scored, b: Scored): number => {
    if (metric === 'maxpf') {
      if (a.maxPointsFor !== b.maxPointsFor) return a.maxPointsFor - b.maxPointsFor
      if (a.winPct !== b.winPct) return a.winPct - b.winPct
      return a.pointsFor - b.pointsFor
    }
    if (a.winPct !== b.winPct) return a.winPct - b.winPct
    if (a.pointsFor !== b.pointsFor) return a.pointsFor - b.pointsFor
    return a.maxPointsFor - b.maxPointsFor
  }
}

export function buildDraftOrder(
  teams: TeamData[],
  maxPointsForByRoster: Record<number, MaxPointsForEntry>,
  metric: DraftOrderMetric
): DraftOrderRow[] {
  const scored: Scored[] = teams.map((team) => {
    const entry = maxPointsForByRoster[team.rosterId]
    return {
      team,
      winPct: winPctOf(team),
      // Prefer the week-by-week sum: Sleeper's roster `fpts` drops the decimal into a
      // separate field, so it reads a fraction of a point low.
      pointsFor: entry?.actualPointsFor ?? team.pointsFor,
      maxPointsFor: entry?.maxPointsFor ?? 0,
    }
  })

  const ordered = [...scored].sort(comparatorFor(metric))
  const alternate = [...scored].sort(comparatorFor(metric === 'record' ? 'maxpf' : 'record'))
  const altPickOf = new Map(alternate.map((s, index) => [s.team.rosterId, index + 1]))

  const valueOf = (s: Scored) => (metric === 'maxpf' ? s.maxPointsFor : s.winPct)
  const top = ordered.length > 0 ? valueOf(ordered[0]) : 0
  const bottom = ordered.length > 0 ? valueOf(ordered[ordered.length - 1]) : 0
  const spread = bottom - top

  return ordered.map((s, index) => {
    const pick = index + 1
    const altPick = altPickOf.get(s.team.rosterId) ?? pick
    const gamesPlayed = s.team.wins + s.team.losses + (s.team.ties ?? 0)
    const gapToTop =
      metric === 'maxpf'
        ? s.maxPointsFor - top
        : // Win percentage differences are hard to read; convert back to wins so the
          // gap says "you are two wins away from the 1.01".
          (s.winPct - top) * gamesPlayed

    return {
      pick,
      label: pickLabel(pick),
      rosterId: s.team.rosterId,
      teamName: s.team.teamName,
      wins: s.team.wins,
      losses: s.team.losses,
      ties: s.team.ties ?? 0,
      winPct: s.winPct,
      pointsFor: s.pointsFor,
      maxPointsFor: s.maxPointsFor,
      altPick,
      altLabel: pickLabel(altPick),
      gapToTop,
      raceShare: spread > 0 ? 1 - (valueOf(s) - top) / spread : 0,
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
  if (metric === 'maxpf') return `+${row.gapToTop.toFixed(1)} pts`
  const wins = Math.round(row.gapToTop * 10) / 10
  if (wins <= 0) return 'tiebreak'
  return `+${wins % 1 === 0 ? wins.toFixed(0) : wins.toFixed(1)} ${wins === 1 ? 'win' : 'wins'}`
}
