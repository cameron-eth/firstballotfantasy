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
/** Regularized Bradley–Terry fit: simultaneous updates, independent of ballot order.
 * Neutral prior prevents a single win from producing an extreme rating.
 */
export function communityRatings(candidates: Candidate[], ballots: Ballot[]): CommunityRating[] {
  const keys = new Set(candidates.map((p) => p.key))
  const skills = new Map(candidates.map((p) => [p.key, 0]))
  const count = new Map<string, number>(),
    wins = new Map<string, number>()
  const pairs = new Map<string, { a: string; b: string; n: number; wins: number }>()
  for (const vote of ballots) {
    const [a, b] = [...vote.pair].sort()
    if (a === b || !keys.has(a) || !keys.has(b) || !vote.pair.includes(vote.winner)) continue
    const id = `${a}|${b}`,
      edge = pairs.get(id) ?? { a, b, n: 0, wins: 0 }
    edge.n++
    edge.wins += Number(vote.winner === a)
    pairs.set(id, edge)
    count.set(a, (count.get(a) ?? 0) + 1)
    count.set(b, (count.get(b) ?? 0) + 1)
    wins.set(vote.winner, (wins.get(vote.winner) ?? 0) + 1)
  }
  for (let i = 0; i < 150; i++) {
    const gradient = new Map([...skills].map(([key, value]) => [key, -2 * value]))
    for (const edge of pairs.values()) {
      const probability = 1 / (1 + Math.exp(skills.get(edge.b)! - skills.get(edge.a)!))
      const residual = edge.wins - edge.n * probability
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
