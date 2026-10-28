import {
  communityRatingsFromTallies,
  dailyTallies,
  type Ballot,
  type Candidate,
  type DailyTally,
} from './rating'

export type CommunityTrend = {
  /** Current community rank among prospects (null until five comparisons). */
  rank: number | null
  score: number
  comparisons: number
  /** Rank places gained over the window (positive = moving up); null when either end is unranked. */
  rankDelta: number | null
  /** Score at the end of each of the last days, oldest first. */
  spark: number[]
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

/** The last `days` calendar days ending at `today`, oldest first. */
export function trailingDays(today: string, days: number) {
  const end = Date.parse(`${today}T00:00:00Z`)
  return Array.from({ length: days }, (_, i) => isoDay(new Date(end - (days - 1 - i) * 86400000)))
}

/**
 * Community rank history for prospects, replayed from the stored ballots: the rating as of the
 * end of each day uses only ballots cast on or before that day. No separate history is stored,
 * so it can never disagree with the ballots themselves.
 */
export function communityTrends(
  candidates: Candidate[],
  ballots: Ballot[],
  today: string,
  days = 7
): Record<string, CommunityTrend> {
  return communityTrendsFromTallies(candidates, dailyTallies(ballots), today, days)
}

/** communityTrends from stored per-day tallies (PR-17): the same days, the same fit. */
export function communityTrendsFromTallies(
  candidates: Candidate[],
  tallies: DailyTally[],
  today: string,
  days = 7
): Record<string, CommunityTrend> {
  const prospects = tallies.filter((t) => t.pool === 'dynasty')
  const snapshots = trailingDays(today, days).map((day) => {
    const rated = communityRatingsFromTallies(
      candidates,
      prospects.filter((t) => t.day <= day)
    ).filter((p) => p.kind === 'prospect')
    let rank = 0
    return new Map(
      rated.map((p) => [
        p.key,
        { score: p.score, comparisons: p.comparisons, rank: p.comparisons >= 5 ? ++rank : null },
      ])
    )
  })
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const result: Record<string, CommunityTrend> = {}
  for (const [key, now] of last) {
    if (now.comparisons === 0) continue
    const before = first.get(key)
    result[key] = {
      rank: now.rank,
      score: now.score,
      comparisons: now.comparisons,
      rankDelta: now.rank !== null && before?.rank != null ? before.rank - now.rank : null,
      spark: snapshots.map((snapshot) => snapshot.get(key)?.score ?? 1500),
    }
  }
  return result
}
