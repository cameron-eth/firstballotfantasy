import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBallotRound } from '../lib/community/rounds.ts'
test('daily ballot remains round zero; contribution rounds are bounded', () => {
  assert.equal(parseBallotRound(null), 0)
  assert.equal(parseBallotRound('0'), 0)
  assert.equal(parseBallotRound('19'), 19)
  for (const raw of ['20', '-1', '1.5', 'Infinity', '', '1e1', '1junk']) assert.equal(parseBallotRound(raw), null)
})
