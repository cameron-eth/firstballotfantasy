import test from 'node:test'
import assert from 'node:assert/strict'
import { boardsToProspects, yearsToSave } from '../lib/draftboard-classes.ts'
const prospects = [{ id: 1, draft_year: 2027 }, { id: 2, draft_year: 2028 }, { id: 3, draft_year: 2029 }]
test('mixed boards preserve player order and save later classes before replacing the legacy board', () => {
  const boards = [{ draft_year: 2027, prospect_ids: [2, 1, 3] }]
  assert.deepEqual(boardsToProspects(boards, prospects).map((p) => p.id), [2, 1, 3])
  assert.deepEqual(yearsToSave(boards, prospects, [2027, 2028, 2029], 2027), [2028, 2029, 2027])
})
test('separate class boards only save the selected class, including an empty board', () => {
  const boards = [{ draft_year: 2027, prospect_ids: [1] }, { draft_year: 2028, prospect_ids: [] }]
  assert.deepEqual(yearsToSave(boards, prospects, [2027, 2028, 2029], 2028), [2028])
  assert.deepEqual(boardsToProspects(boards, prospects).map((p) => p.id), [1])
})
test('map board mapping preserves saved rank while excluding missing and duplicate prospects', () => {
  const boards = [{ draft_year: 2029, prospect_ids: [3, 999, 2, 3] }, { draft_year: 2027, prospect_ids: [1, 2] }]
  assert.deepEqual(boardsToProspects(boards, prospects).map((p) => p.id), [3, 2, 1])
  assert.deepEqual(boards[0].prospect_ids, [3, 999, 2, 3])
})
