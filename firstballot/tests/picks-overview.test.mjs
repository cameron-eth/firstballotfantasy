import assert from 'node:assert/strict'
import test from 'node:test'
import { leagueCapital, pickLabel, picksByYear } from '../lib/picks-overview.ts'

const pick = (season, round, roster_id, owner_id = roster_id) => ({
  id: `${season}:${round}:${roster_id}`,
  season,
  round,
  roster_id,
  owner_id,
})

const picks = [
  pick('2027', 1, 1),
  pick('2027', 2, 1, 2), // 1 traded its 2nd to 2
  pick('2027', 1, 2, 1), // 1 acquired 2's 1st
  pick('2027', 2, 2),
  pick('2028', 1, 1),
  pick('2028', 1, 2),
]

test('a roster sees its own and acquired picks, and what it traded away', () => {
  const [y2027, y2028] = picksByYear(picks, 1)
  assert.equal(y2027.season, '2027')
  assert.deepEqual(
    y2027.owned.map((p) => p.id),
    ['2027:1:1', '2027:1:2']
  )
  assert.deepEqual(
    y2027.tradedAway.map((p) => p.id),
    ['2027:2:1']
  )
  assert.deepEqual(
    y2028.owned.map((p) => p.id),
    ['2028:1:1']
  )
})

test('league capital counts firsts per season and ranks by firsts', () => {
  const [top, second] = leagueCapital(picks, [1, 2])
  assert.equal(top.rosterId, 1)
  assert.equal(top.firsts, 3)
  assert.deepEqual(top.bySeason['2027'], { total: 2, firsts: 2 })
  assert.equal(second.total, 3)
  assert.equal(second.firsts, 1)
})

test('pick labels use the slot when the draft order is known', () => {
  assert.equal(pickLabel(pick('2027', 2, 4), { 4: 3 }), '2.03')
  assert.equal(pickLabel(pick('2028', 1, 4), {}), '2028 R1')
})
