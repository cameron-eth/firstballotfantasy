/**
 * NFL draft-class years, derived from the date instead of hard-coded (PR-4).
 *
 * The draft is held in late April, so a class stays "upcoming" through April of its year
 * and becomes the last completed class from May 1 (UTC). scripts/refresh-college-prospects.py
 * implements the same rule for the college stats job; tests/draft-years.test.mjs pins both.
 */

/** First month (0-based, UTC) after the draft: May. */
const FIRST_MONTH_AFTER_DRAFT = 4

/** The next class to be drafted: 2027 from May 2026 through April 2027. */
export function nextDraftClass(now: Date = new Date()): number {
  const year = now.getUTCFullYear()
  return now.getUTCMonth() < FIRST_MONTH_AFTER_DRAFT ? year : year + 1
}

/** The most recent class already drafted: 2026 from May 2026 through April 2027. */
export function lastDraftedClass(now: Date = new Date()): number {
  return nextDraftClass(now) - 1
}

/** The next `count` classes still in college, nearest first. */
export function upcomingDraftClasses(count: number, now: Date = new Date()): number[] {
  const first = nextDraftClass(now)
  return Array.from({ length: count }, (_, i) => first + i)
}
