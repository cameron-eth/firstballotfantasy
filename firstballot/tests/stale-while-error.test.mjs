// PR-12 (audit R2-5): during a provider outage the snapshot cache serves the last good copy,
// flagged stale and bounded in age, instead of failing; with the flag off nothing changes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshotFrom, snapshotMetadata } from '../lib/platform/snapshot-core.ts'

const HOUR = 3600 * 1000
function store(existing) {
  const rows = new Map(existing ? [[existing.key, existing]] : [])
  const logs = []
  return {
    logs,
    read: async (key) => ({ data: rows.get(key) ?? null, error: null }),
    write: async (record) => (rows.set(record.key, record), { error: null }),
    log: async (row) => (logs.push(row), { error: null }),
  }
}
const expired = (hoursAgo) => ({
  key: 'espn:ppr:2026', source: 'ESPN', payload: { a: 1 }, fetched_at: new Date(Date.now() - (hoursAgo + 1) * HOUR).toISOString(),
  source_observed_at: null, expires_at: new Date(Date.now() - hoursAgo * HOUR).toISOString(), quality: 'unverified',
  content_hash: 'x', season: 2026, week: null,
})
const outage = async () => {
  throw new Error('ESPN_UNAVAILABLE')
}
const valid = (p) => p && typeof p === 'object'
const read = (s, opts) => snapshotFrom(s, 'espn:ppr:2026', 'ESPN', 900, outage, valid, opts)

test('a simulated ESPN outage serves the last good copy, labelled stale', async () => {
  const s = store(expired(2))
  const result = await read(s, { staleAllowed: true, maxStaleSeconds: 24 * 3600 })
  assert.deepEqual(result.payload, { a: 1 })
  assert.equal(snapshotMetadata(result).stale, true)
  assert.equal(s.logs.at(-1).error_code, 'SOURCE_FAILED_SERVED_STALE')
})

test('with the flag off the outage still fails, as before', async () => {
  await assert.rejects(read(store(expired(2)), { staleAllowed: false, maxStaleSeconds: 24 * 3600 }), {
    code: 'FRESH_DATA_UNAVAILABLE',
  })
})

test('a copy older than the stale bound is not served', async () => {
  await assert.rejects(read(store(expired(30)), { staleAllowed: true, maxStaleSeconds: 24 * 3600 }), {
    code: 'FRESH_DATA_UNAVAILABLE',
  })
})

test('a fresh load is never marked stale', async () => {
  const s = store(expired(2))
  const result = await snapshotFrom(s, 'espn:ppr:2026', 'ESPN', 900, async () => ({ payload: { b: 2 } }), valid, {
    staleAllowed: true,
    maxStaleSeconds: 24 * 3600,
  })
  assert.equal(snapshotMetadata(result).stale, false)
  assert.equal(s.logs.at(-1).status, 'success')
})
