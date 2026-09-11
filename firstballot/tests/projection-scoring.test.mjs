import test from 'node:test'
import assert from 'node:assert/strict'

const { scoreFromStats, analyzeCoverage, lineupNeedsKickerOrDefense } = await import(
  '../lib/projections/scoring.ts'
)

const PPR = {
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -1,
  rush_yd: 0.1,
  rush_td: 6,
  rec: 1,
  rec_yd: 0.1,
  rec_td: 6,
  fum_lost: -2,
}

test('points are the dot product of stats and scoring settings', () => {
  // 300 pass yds (12) + 2 pass TD (8) + 1 int (-1) + 20 rush yds (2) = 21
  const stats = { pass_yd: 300, pass_td: 2, pass_int: 1, rush_yd: 20 }
  assert.equal(scoreFromStats(stats, PPR), 21)
})

test("Sleeper's precomputed totals are never added on top of the components", () => {
  // pts_ppr riding along must not double the player; only rec + rec_yd count.
  const stats = { rec: 8, rec_yd: 100, pts_ppr: 18, pts_half_ppr: 14, pts_std: 10, gp: 1 }
  assert.equal(scoreFromStats(stats, { ...PPR, pts_ppr: 1 }), 18)
})

test('a stat the league does not score contributes nothing', () => {
  const stats = { rec: 5, rec_tgt: 12, pass_sack: 3 }
  assert.equal(scoreFromStats(stats, PPR), 5)
})

test('TE premium applies when the league scores it and the feed projects it', () => {
  const stats = { rec: 6, rec_yd: 70, bonus_rec_te: 6 }
  const tePremium = { ...PPR, bonus_rec_te: 0.5 }
  assert.equal(scoreFromStats(stats, tePremium), 6 + 7 + 3)
})

test('missing or empty stat lines score zero rather than throwing', () => {
  assert.equal(scoreFromStats(undefined, PPR), 0)
  assert.equal(scoreFromStats({}, PPR), 0)
})

test('non-finite stat values are skipped', () => {
  const stats = { rec: Number.NaN, rec_yd: 50 }
  assert.equal(scoreFromStats(stats, PPR), 5)
})

test('coverage flags scoring rules the feed never projects', () => {
  const scoring = { rec: 1, pts_allow_0: 10, fgm_50p: 2, pass_int: 0 }
  const projected = ['rec', 'rec_yd', 'pass_int']
  const { unmatchedKeys, exact } = analyzeCoverage(scoring, projected)
  // pass_int is unmatched too, but it pays zero, so it can never change a total.
  assert.deepEqual(unmatchedKeys, ['fgm_50p', 'pts_allow_0'])
  assert.equal(exact, false)
})

test('coverage is exact when every paying rule is projected', () => {
  const { exact } = analyzeCoverage({ rec: 1, rec_yd: 0.1 }, ['rec', 'rec_yd', 'rush_yd'])
  assert.equal(exact, true)
})

test('only lineups that can start a K or DEF are affected by the gaps', () => {
  assert.equal(lineupNeedsKickerOrDefense(['QB', 'RB', 'WR', 'FLEX', 'SUPER_FLEX', 'BN']), false)
  assert.equal(lineupNeedsKickerOrDefense(['QB', 'RB', 'K', 'BN']), true)
  assert.equal(lineupNeedsKickerOrDefense(['QB', 'DEF']), true)
  assert.equal(lineupNeedsKickerOrDefense(undefined), false)
})
