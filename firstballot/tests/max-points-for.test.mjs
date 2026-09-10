import test from 'node:test'
import assert from 'node:assert/strict'

const { computeMaxPointsFor, optimalLineupPoints, parseScoringSlots } = await import(
  '../components/league-buddy/draft-order/maxPointsFor.ts'
)

const POSITIONS = {
  qb1: 'QB',
  qb2: 'QB',
  rb1: 'RB',
  rb2: 'RB',
  rb3: 'RB',
  wr1: 'WR',
  wr2: 'WR',
  wr3: 'WR',
  te1: 'TE',
  te2: 'TE',
  k1: 'K',
  def1: 'DEF',
}
const positionOf = (id) => POSITIONS[id]

test('parseScoringSlots keeps scoring slots and drops bench/IR/taxi', () => {
  const slots = parseScoringSlots(['QB', 'RB', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'IR', 'TAXI'])
  assert.equal(slots.length, 5)
  assert.deepEqual(slots[2], ['RB', 'WR', 'TE'])
  // K and DEF score real points; dropping them would understate Max PF.
  assert.deepEqual(slots[3], ['K'])
  assert.deepEqual(slots[4], ['DEF'])
})

test('optimal lineup ignores who was actually started', () => {
  // Two RBs, one slot: the 30-point back has to be the one counted.
  const points = optimalLineupPoints({ rb1: 30, rb2: 4 }, [['RB']], positionOf)
  assert.equal(points, 30)
})

test('flex takes the best leftover, not a dedicated-slot starter', () => {
  const slots = parseScoringSlots(['RB', 'WR', 'FLEX'])
  // RB 20 / WR 18 fill their own slots; the flex should take rb2 (15), not wr2 (9).
  const points = optimalLineupPoints({ rb1: 20, rb2: 15, wr1: 18, wr2: 9 }, slots, positionOf)
  assert.equal(points, 53)
})

test('superflex seats a second QB when that beats the best flex-eligible skill player', () => {
  const slots = parseScoringSlots(['QB', 'RB', 'SUPER_FLEX'])
  const points = optimalLineupPoints({ qb1: 25, qb2: 22, rb1: 12, rb2: 8 }, slots, positionOf)
  assert.equal(points, 59) // 25 + 12 + 22, not 25 + 12 + 8
})

test('overlapping non-nested flex slots still resolve to the true maximum', () => {
  // REC_FLEX{WR,TE} and WRRB_FLEX{RB,WR} overlap without nesting, so a one-pass
  // "best available per slot" fill goes wrong: REC_FLEX grabs wr1 (20), leaving
  // WRRB_FLEX only rb1 (2) for 22. The real maximum seats te1 in REC_FLEX and moves
  // wr1 to WRRB_FLEX for 38. Only a fill that can re-seat an earlier pick finds it.
  const slots = parseScoringSlots(['REC_FLEX', 'WRRB_FLEX'])
  const points = optimalLineupPoints({ wr1: 20, te1: 18, rb1: 2 }, slots, positionOf)
  assert.equal(points, 38)
})

test('a slot with only negative options is still filled, with the least bad player', () => {
  const points = optimalLineupPoints({ def1: -3 }, [['DEF']], positionOf)
  assert.equal(points, -3)
})

test('unplayed weeks are skipped so they cannot drag a ceiling down', () => {
  const rosterPositions = ['QB', 'RB', 'BN']
  const played = [{ rosterId: 1, playersPoints: { qb1: 20, rb1: 10, rb2: 4 }, actualPoints: 24 }]
  const notPlayed = [{ rosterId: 1, playersPoints: { qb1: 0, rb1: 0 }, actualPoints: 0 }]

  const totals = computeMaxPointsFor([played, notPlayed], rosterPositions, positionOf)
  assert.equal(totals[1].weeksCounted, 1)
  assert.equal(totals[1].maxPointsFor, 30)
  assert.equal(totals[1].actualPointsFor, 24)
  assert.equal(totals[1].pointsLeftOnBench, 6)
})

test('lineup efficiency is bounded even when Sleeper reports more than we can reconstruct', () => {
  const week = [{ rosterId: 1, playersPoints: { qb1: 10 }, actualPoints: 12 }]
  const totals = computeMaxPointsFor([week], ['QB'], positionOf)
  assert.equal(totals[1].pointsLeftOnBench, 0)
  assert.equal(totals[1].lineupEfficiency, 1)
})
