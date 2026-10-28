// PR-13 (audit R2-4): identities and history outcomes prefer the weekly job's snapshot,
// fall back to the bundled files, and never expose a quarantined alias either way.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  chooseSource,
  cleanIdentities,
  isIdentityMap,
  isOutcomeSnapshot,
  joinableEspnId,
} from '../lib/reference-data.ts'

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const quarantine = read('data/identity-quarantine.json')
const outcomes = read('data/history-outcomes.json')
const identities = read('data/nfl-player-identities.json')

test('quarantined aliases never reach the identity map', () => {
  const [sleeperId, conflict] = Object.entries(quarantine.conflicts)[0]
  const map = cleanIdentities({
    ...identities,
    [sleeperId]: { espnId: conflict.espnId, name: 'x' },
    999999: { espnId: 'NA', name: 'y' },
  })
  assert.equal(map[sleeperId], undefined)
  assert.equal(map['999999'], undefined)
  assert.ok(Object.keys(map).length > 6000)
})

test('the bundled outcomes join on unique ESPN ids once NA and conflicts are dropped', () => {
  const keys = outcomes.players.flatMap((p) => {
    const id = joinableEspnId(p)
    return id ? [`${id}:${p.year}`] : []
  })
  assert.equal(new Set(keys).size, keys.length, 'two players share an outcome key')
  assert.ok(!keys.some((k) => k.startsWith('NA:')))
})

test('the snapshot wins when valid; otherwise the bundled file', () => {
  const fresh = { payload: outcomes, fetched_at: '2026-10-29T12:20:00Z' }
  assert.equal(chooseSource(fresh, outcomes, isOutcomeSnapshot).source, 'snapshot')
  assert.equal(chooseSource(null, outcomes, isOutcomeSnapshot).source, 'bundled')
  // A truncated payload is not trusted.
  assert.equal(chooseSource({ payload: { players: [] }, fetched_at: 'x' }, outcomes, isOutcomeSnapshot).source, 'bundled')
  assert.equal(chooseSource({ payload: {}, fetched_at: 'x' }, identities, isIdentityMap).source, 'bundled')
})
