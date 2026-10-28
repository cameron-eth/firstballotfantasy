import type { ProjectionMap } from './useProjections'

/**
 * Projected points per game: a season total divided by the games the player is projected
 * to play. Players with no projected games are left out. The dashboard, start/sit and the
 * projected Max PF all read this one map (G1, inventory #8).
 */
export function perGameProjections(season: ProjectionMap): Record<string, number> {
  const perGame: Record<string, number> = {}
  for (const [playerId, entry] of Object.entries(season)) {
    if (entry.gp > 0) perGame[playerId] = entry.pts / entry.gp
  }
  return perGame
}

/** This week's projected points per player. */
export function weekPoints(week: ProjectionMap): Record<string, number> {
  return Object.fromEntries(Object.entries(week).map(([playerId, entry]) => [playerId, entry.pts]))
}

/**
 * This week's projection for the lineup a team has set: the sum over its starters, with
 * empty slots ('0') skipped and unprojected players counting 0. The Overview rank and
 * My Team's lineup projection both use it (G1, inventory #9).
 */
export function startersProjection(
  starters: readonly string[] | undefined,
  points: Record<string, number>
): number {
  return (starters ?? [])
    .filter((id) => id && id !== '0')
    .reduce((sum, id) => sum + (points[id] ?? 0), 0)
}
