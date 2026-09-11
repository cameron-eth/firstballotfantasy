/**
 * Where the 1.01 race ends up, not just where it stands today.
 *
 * Realized Max PF answers "who has the worst roster so far". Early in a season that
 * is almost entirely noise — at week 1 it is one game. Projecting the remaining
 * weeks from each roster's projected per-week ceiling gives the race a shape before
 * the standings have one.
 */
import { optimalLineupPoints, parseScoringSlots } from './maxPointsFor'

/**
 * Projected optimal lineups systematically read *below* realized Max PF, because a
 * realized best-lineup captures whoever actually boomed while a projection is an
 * expected value. Measured against the 2025 season (weeks 3/6/9/12, 12 teams), the
 * realized ceiling ran 1.049x the projected one — range 1.014 to 1.080.
 */
export const DEFAULT_CEILING_CALIBRATION = 1.05

/**
 * Weeks of real results before the league's own ratio is trusted over the default.
 * A single week is one slate of variance; by around six the pooled ratio is steadier
 * than a constant fitted on a different season.
 */
const CALIBRATION_CONFIDENCE_WEEKS = 6

interface RosterForProjection {
  rosterId: number
  players: Array<{ playerId: string; position: string }>
}

export interface SeasonProjectionEntry {
  pts: number
  gp: number
}

export interface ProjectedMaxPointsFor {
  /** rosterId → projected season-end Max PF. */
  projected: Record<number, number>
  /** rosterId → projected ceiling for a single remaining week. */
  perWeek: Record<number, number>
  /** Ratio applied to projected weeks, blended from the league's own results. */
  calibration: number
  remainingWeeks: number
}

export interface ProjectionInput {
  teams: RosterForProjection[]
  seasonProjections: Record<string, SeasonProjectionEntry>
  rosterPositions: string[] | undefined
  /** rosterId → Max PF banked so far, including any week still in progress. */
  realizedMaxPointsFor: Record<number, number>
  /**
   * rosterId → Max PF over *finished* weeks only, and how many there were.
   *
   * Calibration has to ignore the week in progress. Mid-slate, most teams have played
   * a fraction of their games, so realized-over-projected reads far below one and
   * would drag every projection down with it.
   */
  realizedCompletedWeeks: Record<number, number>
  completedWeeks: number
  weeksPlayed: number
  lastRegularWeek: number
}

export function computeProjectedMaxPointsFor({
  teams,
  seasonProjections,
  rosterPositions,
  realizedMaxPointsFor,
  realizedCompletedWeeks,
  completedWeeks,
  weeksPlayed,
  lastRegularWeek,
}: ProjectionInput): ProjectedMaxPointsFor {
  const slots = parseScoringSlots(rosterPositions)
  const remainingWeeks = Math.max(0, lastRegularWeek - weeksPlayed)

  // A season projection covers a whole year; one week of it is that divided by the
  // games the player is projected to appear in.
  const perGame: Record<string, number> = {}
  for (const [playerId, entry] of Object.entries(seasonProjections)) {
    if (entry.gp > 0) perGame[playerId] = entry.pts / entry.gp
  }

  const perWeek: Record<number, number> = {}
  for (const team of teams) {
    const positionOf = new Map(team.players.map((p) => [p.playerId, p.position]))
    const rosterMeans: Record<string, number> = {}
    for (const player of team.players) {
      rosterMeans[player.playerId] = perGame[player.playerId] ?? 0
    }
    perWeek[team.rosterId] = optimalLineupPoints(rosterMeans, slots, (id) => positionOf.get(id))
  }

  // Calibrate on the league's own season where there is enough of it, since roster
  // quality and scoring settings both shift the ratio.
  const realizedTotal = Object.values(realizedCompletedWeeks).reduce((sum, v) => sum + v, 0)
  const projectedSoFar = Object.values(perWeek).reduce((sum, v) => sum + v, 0) * completedWeeks
  const observed = projectedSoFar > 0 ? realizedTotal / projectedSoFar : DEFAULT_CEILING_CALIBRATION
  const confidence = Math.min(1, completedWeeks / CALIBRATION_CONFIDENCE_WEEKS)
  const calibration =
    completedWeeks > 0
      ? confidence * observed + (1 - confidence) * DEFAULT_CEILING_CALIBRATION
      : DEFAULT_CEILING_CALIBRATION

  const projected: Record<number, number> = {}
  for (const team of teams) {
    const realized = realizedMaxPointsFor[team.rosterId] ?? 0
    projected[team.rosterId] = realized + remainingWeeks * perWeek[team.rosterId] * calibration
  }

  return { projected, perWeek, calibration, remainingWeeks }
}
