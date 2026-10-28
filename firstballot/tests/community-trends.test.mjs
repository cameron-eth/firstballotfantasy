import test from 'node:test'
import assert from 'node:assert/strict'
import { communityTrends, trailingDays } from '../lib/community/trends.ts'

const cand = (id) => ({ key: `prospect:${id}`, name: `P${id}`, position: 'WR', team: 'U', image: null, kind: 'prospect', year: 2027 })
const vote = (day, a, b, winner) => ({ version: 1, day, pool: 'dynasty', pair: [`prospect:${a}`, `prospect:${b}`], winner: `prospect:${winner}` })
const pool = [cand(1), cand(2), cand(3)]

test('trailing days end today, oldest first', () => {
  assert.deepEqual(trailingDays('2026-10-28', 3), ['2026-10-26', '2026-10-27', '2026-10-28'])
})

test('a prospect that starts winning moves up and shows a rising spark', () => {
  const ballots = []
  for (let i = 0; i < 6; i++) ballots.push(vote('2026-10-21', 1, 2, 1), vote('2026-10-21', 1, 3, 1))
  for (let i = 0; i < 12; i++) ballots.push(vote('2026-10-27', 3, 1, 3), vote('2026-10-27', 3, 2, 3))
  const out = communityTrends(pool, ballots, '2026-10-27', 7)
  assert.equal(out['prospect:3'].rank, 1)
  assert.equal(out['prospect:1'].rank, 2)
  assert.equal(out['prospect:1'].rankDelta, -1)
  assert.equal(out['prospect:3'].rankDelta, 2)
  const spark = out['prospect:3'].spark
  assert.equal(spark.length, 7)
  assert.ok(spark[6] > spark[0])
})

test('prospects with no ballots are left out and ballots from other pools are ignored', () => {
  const out = communityTrends(pool, [{ ...vote('2026-10-27', 1, 2, 1), pool: 'nfl' }], '2026-10-27')
  assert.deepEqual(out, {})
})
