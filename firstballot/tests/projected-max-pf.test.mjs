import test from 'node:test'
import assert from 'node:assert/strict'

const { computeProjectedMaxPointsFor, DEFAULT_CEILING_CALIBRATION } = await import(
  '../components/league-buddy/draft-order/projectedMaxPointsFor.ts'
)

const SLOTS = ['QB', 'RB', 'BN', 'BN']

/** Defaults for the fields a given test isn't exercising. */
const call = (overrides) =>
  computeProjectedMaxPointsFor({
    teams: TEAMS,
    seasonProjections: SEASON,
    rosterPositions: SLOTS,
    lastRegularWeek: 14,
    ...overrides,
  })
const TEAMS = [
  {
    rosterId: 1,
    players: [
      { playerId: 'qb1', position: 'QB' },
      { playerId: 'rb1', position: 'RB' },
      { playerId: 'rb2', position: 'RB' },
    ],
  },
  {
    rosterId: 2,
    players: [
      { playerId: 'qb2', position: 'QB' },
      { playerId: 'rb3', position: 'RB' },
    ],
  },
]
// Season totals over 10 games: per-week means are a tenth of these.
const SEASON = {
  qb1: { pts: 200, gp: 10 }, // 20/wk
  rb1: { pts: 100, gp: 10 }, // 10/wk
  rb2: { pts: 50, gp: 10 }, // 5/wk  (bench, RB1 is better)
  qb2: { pts: 150, gp: 10 }, // 15/wk
  rb3: { pts: 60, gp: 10 }, // 6/wk
}

test('per-week ceiling is the best lineup out of season per-game means', () => {
  const { perWeek } = call({ realizedMaxPointsFor: {}, realizedCompletedWeeks: {}, completedWeeks: 0, weeksPlayed: 0 })
  assert.equal(perWeek[1], 30) // 20 + 10, rb2 benched
  assert.equal(perWeek[2], 21) // 15 + 6
})

test('with no weeks played the projection uses the measured default calibration', () => {
  const r = call({ realizedMaxPointsFor: {}, realizedCompletedWeeks: {}, completedWeeks: 0, weeksPlayed: 0 })
  assert.equal(r.calibration, DEFAULT_CEILING_CALIBRATION)
  assert.equal(r.remainingWeeks, 14)
  assert.equal(r.projected[1], 14 * 30 * DEFAULT_CEILING_CALIBRATION)
})

test('banked results are added to the projected remainder, not replaced by it', () => {
  const realized = { 1: 300, 2: 200 }
  const r = call({ realizedMaxPointsFor: realized, realizedCompletedWeeks: realized, completedWeeks: 10, weeksPlayed: 10 })
  assert.equal(r.remainingWeeks, 4)
  assert.equal(r.projected[1], 300 + 4 * 30 * r.calibration)
  assert.equal(r.projected[2], 200 + 4 * 21 * r.calibration)
})

test("the league's own realized-to-projected ratio takes over as weeks accumulate", () => {
  // Both teams have run exactly 20% hot against their projected ceiling.
  const realized = { 1: 6 * 30 * 1.2, 2: 6 * 21 * 1.2 }
  const { calibration } = call({ realizedMaxPointsFor: realized, realizedCompletedWeeks: realized, completedWeeks: 6, weeksPlayed: 6 })
  assert.ok(Math.abs(calibration - 1.2) < 1e-9, `expected ~1.2, got ${calibration}`)
})

test('one hot week barely moves the calibration off the default', () => {
  const realized = { 1: 30 * 2.0, 2: 21 * 2.0 } // doubled, in a single week
  const { calibration } = call({ realizedMaxPointsFor: realized, realizedCompletedWeeks: realized, completedWeeks: 1, weeksPlayed: 1 })
  // 1/6 confidence in a 2.0 observation: 0.167*2.0 + 0.833*1.05 ≈ 1.21, not 2.0.
  assert.ok(calibration < 1.25, `expected the default to dominate, got ${calibration}`)
  assert.ok(calibration > DEFAULT_CEILING_CALIBRATION)
})

test('a finished season projects nothing further', () => {
  const realized = { 1: 420, 2: 300 }
  const r = call({ realizedMaxPointsFor: realized, realizedCompletedWeeks: realized, completedWeeks: 14, weeksPlayed: 14 })
  assert.equal(r.remainingWeeks, 0)
  assert.equal(r.projected[1], 420)
  assert.equal(r.projected[2], 300)
})

test('a player with no projected games contributes nothing rather than dividing by zero', () => {
  const season = { ...SEASON, rb1: { pts: 100, gp: 0 } }
  const { perWeek } = call({ seasonProjections: season, realizedMaxPointsFor: {}, realizedCompletedWeeks: {}, completedWeeks: 0, weeksPlayed: 0 })
  assert.equal(perWeek[1], 25) // qb1 20 + rb2 5, since rb1 has no usable rate
})
