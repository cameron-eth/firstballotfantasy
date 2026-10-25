import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProjection } from '../lib/projections/normalize.ts'

test('filler and bye rows remain unknown rather than zero forecasts', () => {
  assert.equal(normalizeProjection({ player_id: '1', stats: { adp: 200 } }, null), null)
  assert.equal(normalizeProjection({ player_id: '1', game_id: null, stats: {} }, null), null)
})
test('published zero is retained and league rules override preset PPR', () => {
  assert.equal(normalizeProjection({ player_id: '1', stats: { pts_ppr: 0, gp: 1 } }, null).pts, 0)
  const row = { player_id: '1', opponent: 'BUF', stats: { pts_ppr: 12, rec: 4, rec_yd: 80, gp: 1 } }
  assert.deepEqual(normalizeProjection(row, { rec: 0.5, rec_yd: 0.1 }), { pts: 10, gp: 1, opponent: 'BUF' })
})
test('invalid published values are not returned as forecasts', () => {
  assert.equal(normalizeProjection({ player_id: '1', stats: { pts_ppr: NaN } }, null), null)
})
