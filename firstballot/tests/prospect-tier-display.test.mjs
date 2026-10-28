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
