export type Candidate = {
  key: string
  name: string
  position: string
  team: string
  image: string | null
  kind: 'prospect' | 'nfl'
  year?: number
}
export type Ballot = {
  version: 1
  day: string
  pool: 'dynasty' | 'nfl'
  pair: [string, string]
  winner: string
}
export type CommunityRating = Candidate & {
  score: number
  comparisons: number
  wins: number
  rank: number | null
}
/** Ballots for one pair of players: `a` sorts before `b`; `winsA` of `n` went to `a`. */
export type PairTally = { a: string; b: string; n: number; winsA: number }
/** One pool's tally for one pair on one day, as stored in community_ballot_tallies. */
export type DailyTally = PairTally & { pool: Ballot['pool']; day: string }

/** Per-day pair tallies from ballots; the same rows saveBallot adds to (PR-17). */
export function dailyTallies(ballots: Ballot[]): DailyTally[] {
  const rows = new Map<string, DailyTally>()
  for (const vote of ballots) {
    const [a, b] = [...vote.pair].sort()
    if (a === b || !vote.pair.includes(vote.winner)) continue
    const id = `${vote.pool}|${vote.day}|${a}|${b}`
    const row = rows.get(id) ?? { pool: vote.pool, day: vote.day, a, b, n: 0, winsA: 0 }
    row.n++
    row.winsA += Number(vote.winner === a)
    rows.set(id, row)
  }
  return [...rows.values()]
}

/** Sum tallies across days into one row per pair. */
export function pairTallies(rows: PairTally[]): PairTally[] {
  const pairs = new Map<string, PairTally>()
  for (const row of rows) {
    const id = `${row.a}|${row.b}`
    const pair = pairs.get(id) ?? { a: row.a, b: row.b, n: 0, winsA: 0 }
    pair.n += row.n
    pair.winsA += row.winsA
    pairs.set(id, pair)
  }
  return [...pairs.values()]
}

/** Regularized Bradley–Terry fit over ballots; see communityRatingsFromTallies. */
export function communityRatings(candidates: Candidate[], ballots: Ballot[]): CommunityRating[] {
  return communityRatingsFromTallies(candidates, dailyTallies(ballots))
}

/** Regularized Bradley–Terry fit: simultaneous updates, independent of ballot order.
 * Neutral prior prevents a single win from producing an extreme rating. It reads only
 * per-pair tallies, so ratings from stored tallies equal ratings from every ballot.
 */
export function communityRatingsFromTallies(
  candidates: Candidate[],
  tallies: PairTally[]
): CommunityRating[] {
  const keys = new Set(candidates.map((p) => p.key))
  const skills = new Map(candidates.map((p) => [p.key, 0]))
  const count = new Map<string, number>(),
    wins = new Map<string, number>()
  // Sorted, so the floating-point sums run in the same order whichever way tallies arrive.
  const pairs = pairTallies(tallies)
    .filter((edge) => keys.has(edge.a) && keys.has(edge.b))
    .sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
  for (const edge of pairs) {
    count.set(edge.a, (count.get(edge.a) ?? 0) + edge.n)
    count.set(edge.b, (count.get(edge.b) ?? 0) + edge.n)
    wins.set(edge.a, (wins.get(edge.a) ?? 0) + edge.winsA)
    wins.set(edge.b, (wins.get(edge.b) ?? 0) + edge.n - edge.winsA)
  }
  for (let i = 0; i < 150; i++) {
    const gradient = new Map([...skills].map(([key, value]) => [key, -2 * value]))
    for (const edge of pairs) {
      const probability = 1 / (1 + Math.exp(skills.get(edge.b)! - skills.get(edge.a)!))
      const residual = edge.winsA - edge.n * probability
      gradient.set(edge.a, gradient.get(edge.a)! + residual)
      gradient.set(edge.b, gradient.get(edge.b)! - residual)
    }
    for (const [key, g] of gradient)
      skills.set(key, skills.get(key)! + (0.5 * g) / (2 + (count.get(key) ?? 0) * 0.5))
  }
  const rows = candidates
    .map((p) => ({
      ...p,
      score: Math.round(1500 + (400 * skills.get(p.key)!) / Math.LN10),
      comparisons: count.get(p.key) ?? 0,
      wins: wins.get(p.key) ?? 0,
      rank: null as number | null,
    }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
  let rank = 0
  return rows.map((p) => ({ ...p, rank: p.comparisons >= 5 ? ++rank : null }))
}
/** Rotate opponents across the entire same-position pool, including cross-class bridges. */
export function dailyPair(
  candidates: Candidate[],
  seed: number,
  pool: 'dynasty' | 'nfl'
): [Candidate, Candidate] | null {
  const anchors = candidates.filter((p) => p.kind === (pool === 'dynasty' ? 'prospect' : 'nfl'))
  if (!anchors.length) return null
  const first = anchors[seed % anchors.length]
  const eligible = candidates.filter(
    (p) =>
      p.key !== first.key &&
      (seed % 5 === 0 || p.position === first.position) &&
      (pool === 'dynasty' || p.kind === 'nfl')
  )
  const peers =
    pool === 'dynasty' && seed % 4 !== 0 ? eligible.filter((p) => p.kind === 'prospect') : eligible
  const options = peers.length
    ? peers
    : eligible.length
      ? eligible
      : candidates.filter((p) => p.key !== first.key && (pool === 'dynasty' || p.kind === 'nfl'))
  if (!options.length) return null
  const second = options[Math.floor(seed / anchors.length) % options.length]
  return seed % 2 ? [second, first] : [first, second]
}
