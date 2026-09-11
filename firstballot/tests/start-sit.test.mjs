import test from 'node:test'
import assert from 'node:assert/strict'

const { computeStartSit } = await import('../components/league-buddy/projections/startSit.ts')

const ROSTER = [
  { playerId: 'qb1', playerName: 'Ace Arm', position: 'QB' },
  { playerId: 'qb2', playerName: 'Backup Arm', position: 'QB' },
  { playerId: 'rb1', playerName: 'Lead Back', position: 'RB' },
  { playerId: 'rb2', playerName: 'Handcuff', position: 'RB' },
  { playerId: 'wr1', playerName: 'Alpha Wideout', position: 'WR' },
  { playerId: 'wr2', playerName: 'Depth Wideout', position: 'WR' },
]
const SLOTS = ['QB', 'RB', 'WR', 'BN', 'BN', 'BN']

test('a bench player outscoring a starter surfaces as a swap', () => {
  const proj = { qb1: 20, qb2: 5, rb1: 6, rb2: 14, wr1: 12, wr2: 3 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1'], proj, SLOTS)

  assert.equal(r.startersProjected, 38) // 20 + 6 + 12
  assert.equal(r.optimalProjected, 46) // 20 + 14 + 12
  assert.equal(r.pointsLeft, 8)
  assert.equal(r.swaps.length, 1)
  assert.equal(r.swaps[0].start.playerId, 'rb2')
  assert.equal(r.swaps[0].sit.playerId, 'rb1')
  assert.equal(r.swaps[0].gain, 8)
})

test('an already-optimal lineup produces no swaps', () => {
  const proj = { qb1: 20, qb2: 5, rb1: 14, rb2: 6, wr1: 12, wr2: 3 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1'], proj, SLOTS)
  assert.equal(r.pointsLeft, 0)
  assert.deepEqual(r.swaps, [])
  assert.equal(r.noLineupSet, false)
})

test('swap gains sum to the total points left regardless of pairing', () => {
  const proj = { qb1: 8, qb2: 22, rb1: 4, rb2: 17, wr1: 12, wr2: 3 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1'], proj, SLOTS)
  const summed = r.swaps.reduce((total, s) => total + s.gain, 0)
  assert.equal(Math.round(summed * 100) / 100, r.pointsLeft)
})

test('an unset lineup reports the best available instead of advice', () => {
  const proj = { qb1: 20, rb1: 14, wr1: 12 }
  const r = computeStartSit(ROSTER, [], proj, SLOTS)
  assert.equal(r.noLineupSet, true)
  assert.deepEqual(r.swaps, [])
  assert.equal(r.optimalProjected, 46)
})

test("Sleeper's empty-slot marker is not treated as a started player", () => {
  const proj = { qb1: 20, rb1: 14, wr1: 12 }
  const r = computeStartSit(ROSTER, ['0', '0', '0'], proj, SLOTS)
  assert.equal(r.noLineupSet, true)
})

test('a stale starter no longer projected cannot push points-left negative', () => {
  const proj = { qb1: 20, rb1: 14, wr1: 12 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1', 'ghost'], proj, SLOTS)
  assert.ok(r.pointsLeft >= 0)
})

test('flex lets a second back into the lineup when it scores more', () => {
  const proj = { qb1: 20, qb2: 1, rb1: 14, rb2: 13, wr1: 12, wr2: 2 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1'], proj, ['QB', 'RB', 'WR', 'FLEX', 'BN'])
  // The flex should seat rb2 (13), the best player not already starting.
  assert.equal(r.optimalProjected, 59)
  assert.equal(r.swaps.length, 1)
  assert.equal(r.swaps[0].start.playerId, 'rb2')
  // Nobody comes out — the flex was empty, so this is an add, not a swap.
  assert.equal(r.swaps[0].sit, null)
  assert.equal(r.swaps[0].gain, 13)
})

test('an empty slot still counts toward the total points left', () => {
  const proj = { qb1: 20, qb2: 1, rb1: 14, rb2: 13, wr1: 12, wr2: 2 }
  const r = computeStartSit(ROSTER, ['qb1', 'rb1', 'wr1'], proj, ['QB', 'RB', 'WR', 'FLEX', 'BN'])
  const summed = r.swaps.reduce((total, s) => total + s.gain, 0)
  assert.equal(Math.round(summed * 100) / 100, r.pointsLeft)
  assert.equal(r.pointsLeft, 13)
})
