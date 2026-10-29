// PR-20b: the ESPN id lookup confirms a match only when one candidate passes every check.
import test from 'node:test'
import assert from 'node:assert/strict'
import { classify, nameVariants, sameCollege } from '../scripts/prospects/lookup-espn-ids.mjs'

const row = { id: 1, name: 'Ken Walker III', position: 'RB', school: 'Michigan State', draft_year: 2022 }
const walker = { espnId: '4567048', name: 'Kenneth Walker III', position: 'RB', college: 'Michigan State', draftYear: 2022 }

test('name variants include the suffix-free name and known aliases', () => {
  assert.deepEqual(nameVariants('Ken Walker III'), ['Ken Walker III', 'Ken Walker', 'Kenneth Walker III'])
})

test('college names match on containment, never on empty values', () => {
  assert.ok(sameCollege('Miami (FL)', 'Miami'))
  assert.equal(sameCollege('', 'Miami'), false)
  assert.equal(sameCollege('TBD', 'Oklahoma'), false)
})

test('one candidate passing position, college and draft year is confirmed', () => {
  const namesake = { ...walker, espnId: '2971595', position: 'WR', college: 'UCLA', draftYear: null }
  const result = classify(row, [walker, namesake])
  assert.equal(result.status, 'confirmed')
  assert.equal(result.pick.espnId, '4567048')
})

test('a failed check (transfer, wrong draft year) needs review; nobody found is none', () => {
  assert.equal(classify(row, [{ ...walker, college: 'Syracuse' }]).status, 'review')
  assert.equal(classify(row, [{ ...walker, draftYear: 2021 }]).status, 'review')
  assert.equal(classify(row, [walker, { ...walker, espnId: '9' }]).status, 'review')
  assert.equal(classify(row, []).status, 'none')
})
