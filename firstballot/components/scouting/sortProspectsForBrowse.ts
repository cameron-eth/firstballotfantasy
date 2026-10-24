import type { Prospect } from './types'

/** Place evaluated profiles before source-only watchlist rows within each class. */
export function sortProspectsForBrowse(prospects: Prospect[]): Prospect[] {
  return [...prospects].sort((a, b) =>
    (b.draft_year ?? 0) - (a.draft_year ?? 0) ||
    (b.overall_grade ?? -1) - (a.overall_grade ?? -1) ||
    (a.overall_rank ?? 9999) - (b.overall_rank ?? 9999)
  )
}
