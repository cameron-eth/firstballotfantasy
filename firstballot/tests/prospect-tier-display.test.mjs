import test from 'node:test'
import assert from 'node:assert/strict'
import { toBoardPlayer, tierStyleFor } from '../components/scouting/board-player.ts'

const prospect = (extra) => ({ id: 1, name: 'A', position: 'WR', school: 'U', rank: 1, draft_year: 2029, ...extra })

test('an ungraded prospect is Ungraded, not Walk-On', () => {
  const player = toBoardPlayer(prospect({ overall_grade: null, grade_tier: null }))
  assert.equal(player.tier, 'Ungraded')
  assert.match(tierStyleFor(player.tier).text, /slate/)
})

test('a graded prospect keeps its normalized tier', () => {
  assert.equal(toBoardPlayer(prospect({ overall_grade: 72, grade_tier: 'Rotational' })).tier, 'Contributer')
  assert.equal(toBoardPlayer(prospect({ overall_grade: 72, grade_tier: null })).tier, 'Depth')
})

// PR-20 (D3): one tier function for every prospect screen.
test('prospectTier: no grade is Ungraded even with a stored label', async () => {
  const { prospectTier } = await import('../lib/scouting-grade-tier.ts')
  assert.equal(prospectTier({ overall_grade: null, grade_tier: 'Elite' }), 'Ungraded')
  assert.equal(prospectTier({ overall_grade: '', grade_tier: null }), 'Ungraded')
})

test('prospectTier: stored labels map into the display vocabulary; cutoffs fill a missing label', async () => {
  const { prospectTier, PROSPECT_TIER_ORDER } = await import('../lib/scouting-grade-tier.ts')
  assert.equal(prospectTier({ overall_grade: 71, grade_tier: 'Rotational' }), 'Contributer')
  assert.equal(prospectTier({ overall_grade: 62, grade_tier: 'Longshot' }), 'Walk-On')
  assert.equal(prospectTier({ overall_grade: 96, grade_tier: 'Elite' }), 'Elite')
  assert.equal(prospectTier({ overall_grade: '91.5', grade_tier: null }), 'Elite')
  for (const label of ['Elite', 'Blue Chip', 'Starter', 'Rotational', 'Depth', 'Longshot', null])
    assert.ok(PROSPECT_TIER_ORDER.includes(prospectTier({ overall_grade: 80, grade_tier: label })))
})
