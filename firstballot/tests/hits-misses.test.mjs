import test from 'node:test'
import assert from 'node:assert/strict'
import { bandSummary, surprises, toHitPoints } from '../lib/hits-misses.ts'

const player = (id, grade, extra = {}) => ({ id, name: `P${id}`, position: 'WR', draft_year: 2021, espn_id: id, overall_grade: grade, ...extra })
const outcome = (bars, actual, expected = 100) => ({ bars, actual, expected, label: 'x', early: false, adp: 10, adpCount: 9, window: null })

test('only graded players with a rated outcome are plotted', () => {
  const points = toHitPoints(
    [player(1, 92), player(2, null), player(3, 80)],
    { '1:2021': outcome(5, 180), '2:2021': outcome(3, 100), '3:2021': { ...outcome(null, 0), bars: null } }
  )
  assert.deepEqual(points.map((p) => p.id), [1])
  assert.equal(points[0].ratio, 1.8)
})

test('band summary reports hit and miss rates per grade band', () => {
  const points = [
    { id: 1, grade: 95, bars: 5 }, { id: 2, grade: 91, bars: 1 },
    { id: 3, grade: 84, bars: 3 }, { id: 4, grade: 65, bars: 4 },
  ]
  const [top, mid, , low] = bandSummary(points)
  assert.equal(top.n, 2)
  assert.equal(top.hitRate, 0.5)
  assert.equal(top.missRate, 0.5)
  assert.equal(mid.hitRate, 0)
  assert.equal(low.hitRate, 1)
})

test('surprises are low-grade hits and high-grade misses', () => {
  const points = [
    { id: 1, grade: 95, bars: 1, ratio: 0.3 }, { id: 2, grade: 90, bars: 5, ratio: 2 },
    { id: 3, grade: 70, bars: 5, ratio: 1.9 }, { id: 4, grade: 65, bars: 2, ratio: 0.6 },
  ]
  const { hits, misses } = surprises(points)
  assert.deepEqual(hits.map((p) => p.id), [3])
  assert.deepEqual(misses.map((p) => p.id), [1])
})
