// PR-17 (audit R3-3): community ratings and trends read per-day pair tallies instead of
// every ballot; the fit over tallies equals the fit over the ballots themselves.
import test from 'node:test'
import assert from 'node:assert/strict'
import { communityRatings, communityRatingsFromTallies, dailyTallies } from '../lib/community/rating.ts'
import { communityTrends, communityTrendsFromTallies } from '../lib/community/trends.ts'

let seed = 11
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
const candidates = Array.from({ length: 30 }, (_, i) => ({
  key: `prospect:${i}`, name: `P${i}`, position: 'WR', team: 'X', image: null, kind: 'prospect',
}))
const ballots = Array.from({ length: 600 }, () => {
  const a = candidates[Math.floor(rnd() * 30)].key
  const b = candidates[Math.floor(rnd() * 30)].key
  return { version: 1, day: `2026-10-${String(15 + Math.floor(rnd() * 14)).padStart(2, '0')}`, pool: rnd() < 0.8 ? 'dynasty' : 'nfl', pair: [a, b], winner: rnd() < 0.5 ? a : b }
})
// A ballot for a player no longer in the pool still counts as a vote but not in the fit.
ballots.push({ version: 1, day: '2026-10-20', pool: 'dynasty', pair: ['prospect:0', 'prospect:gone'], winner: 'prospect:gone' })

test('ratings from stored tallies equal ratings from every ballot, in any row order', () => {
  const dynasty = ballots.filter((b) => b.pool === 'dynasty')
  const tallies = dailyTallies(ballots).filter((t) => t.pool === 'dynasty')
  assert.deepEqual(communityRatingsFromTallies(candidates, [...tallies].reverse()), communityRatings(candidates, dynasty))
  assert.equal(tallies.reduce((s, t) => s + t.n, 0), dynasty.filter((b) => b.pair[0] !== b.pair[1]).length)
})

test('7-day trends from tallies equal trends replayed from ballots', () => {
  assert.deepEqual(
    communityTrendsFromTallies(candidates, dailyTallies(ballots), '2026-10-28'),
    communityTrends(candidates, ballots, '2026-10-28')
  )
})

test('a tally row is one pool, day and ordered pair', () => {
  const rows = dailyTallies([
    { version: 1, day: '2026-10-28', pool: 'dynasty', pair: ['b', 'a'], winner: 'b' },
    { version: 1, day: '2026-10-28', pool: 'dynasty', pair: ['a', 'b'], winner: 'a' },
    { version: 1, day: '2026-10-28', pool: 'nfl', pair: ['a', 'b'], winner: 'a' },
  ])
  assert.deepEqual(rows, [
    { pool: 'dynasty', day: '2026-10-28', a: 'a', b: 'b', n: 2, winsA: 1 },
    { pool: 'nfl', day: '2026-10-28', a: 'a', b: 'b', n: 1, winsA: 1 },
  ])
})
