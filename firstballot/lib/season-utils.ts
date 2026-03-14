/**
 * NFL season timing utilities.
 *
 * Off-season: January 1 → July 31  (months 0-6)
 * In-season:  August 1 → December 31 (months 7-11)
 *
 * During off-season we hide matchup / lineup / weekly UI and
 * show a prep-mode view instead.
 */

/** August (0-indexed month 7) marks the start of the NFL season window. */
const SEASON_START_MONTH = 7 // August

/**
 * Returns `true` when the current date falls outside the NFL season window
 * (before August). Components can use this to swap matchup UI for an
 * off-season roster/prep view.
 */
export function isOffSeason(now: Date = new Date()): boolean {
  return now.getMonth() < SEASON_START_MONTH
}

/**
 * Human-readable label for the off-season countdown, e.g. "4 months until
 * the season". Returns `null` during the season.
 */
export function offSeasonCountdown(now: Date = new Date()): string | null {
  if (!isOffSeason(now)) return null
  const monthsLeft = SEASON_START_MONTH - now.getMonth()
  if (monthsLeft <= 1) return 'Season starts next month'
  return `${monthsLeft} months until the season`
}
