/**
 * League standings order (PR-7, audit R1-4). Five pages used to sort teams five ways
 * (wins only, ties ignored, ties counted, integer or decimal points), so the header rank,
 * the odds table and the draft "record" order could disagree whenever records tied.
 *
 * Order: win percentage with ties as half a win, then points for (Sleeper's tiebreaker),
 * then roster id so equal teams always land in the same order.
 */

export interface StandingsRecord {
  rosterId: number
  wins: number
  losses: number
  ties?: number
  pointsFor: number
}

export function winPct(team: StandingsRecord): number {
  const ties = team.ties ?? 0
  const games = team.wins + team.losses + ties
  return games > 0 ? (team.wins + ties / 2) / games : 0
}

/** Best team first. */
export function compareStandings(a: StandingsRecord, b: StandingsRecord): number {
  return winPct(b) - winPct(a) || b.pointsFor - a.pointsFor || a.rosterId - b.rosterId
}

export function standingsOrder<T extends StandingsRecord>(teams: readonly T[]): T[] {
  return [...teams].sort(compareStandings)
}

/**
 * Sleeper stores season points as an integer plus hundredths in a separate field
 * (`fpts` 1234, `fpts_decimal` 56 → 1234.56).
 */
export function sleeperPoints(whole: number | undefined, hundredths: number | undefined): number {
  return (whole ?? 0) + (hundredths ?? 0) / 100
}
