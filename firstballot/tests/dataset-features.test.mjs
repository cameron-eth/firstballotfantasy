import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  affectedFeatures,
  COMMUNITY_TALLIES_KEY,
  featuresFor,
  runDatasetFor,
  READ_THROUGH_MAX_IDLE_MS,
  runSummary,
  settleStatus,
  staleSince,
} from '../lib/platform/dataset-features.ts'

const root = new URL('..', import.meta.url).pathname

test('every dataset the freshness job monitors names the features it feeds', () => {
  const monitored = [
    'espn:ppr:2026',
    'espn:ppr:2018',
    'sleeper:projections:2026:season',
    'sleeper:projections:2026:8',
    'ktc:player-values',
    'dynasty:tiers:v1',
    'nfl:draft-capital:v1',
    'identities:v1',
    'history-outcomes:2026',
    'prospects:2027',
    COMMUNITY_TALLIES_KEY,
  ]
  for (const key of monitored) assert.ok(featuresFor(key).length, `${key} maps to no feature`)
  assert.deepEqual(featuresFor('dynasty:tiers:v1'), ['tiers', 'tradeMarket'])
  assert.deepEqual(featuresFor('unknown:key'), [])
})

test('each dataset points at the ingestion_runs rows that log its refresh', () => {
  assert.equal(runDatasetFor('espn:ppr:2026'), 'espn:ppr:2026')
  assert.equal(runDatasetFor('ktc:player-values'), 'job:ktc-history')
  assert.equal(runDatasetFor('prospects:2027'), 'job:college-prospects')
  assert.equal(runDatasetFor('identities:v1'), 'job:history-outcomes')
  assert.equal(runDatasetFor(COMMUNITY_TALLIES_KEY), null)
})

test('the job report and the map agree on job dataset names', async () => {
  const workflows = await Promise.all(
    ['ktc-history.yml', 'college-prospects.yml', 'history-outcomes.yml'].map((f) =>
      readFile(join(root, '../.github/workflows', f), 'utf8').catch(() => '')
    )
  )
  const jobs = workflows.join('\n').match(/dataset: (job:[a-z-]+)/g) ?? []
  for (const job of ['job:ktc-history', 'job:college-prospects', 'job:history-outcomes'])
    assert.ok(jobs.includes(`dataset: ${job}`), `no workflow reports ${job}`)
})

test('run summary reports the latest run, a current error, and the last failure', () => {
  const run = (status, at, error_code = null) => ({
    dataset: 'job:ktc-history',
    status,
    started_at: at,
    completed_at: at,
    error_code,
    run_url: null,
  })
  const healthy = runSummary([
    run('success', '2026-10-29'),
    run('failed', '2026-10-28', 'job_failure'),
  ])
  assert.equal(healthy.lastError, null)
  assert.equal(healthy.lastFailureAt, '2026-10-28')
  assert.equal(healthy.lastRun.status, 'success')
  assert.equal(runSummary([run('failed', '2026-10-29', 'job_failure')]).lastError, 'job_failure')
  assert.deepEqual(runSummary([]), { lastRun: null, lastError: null, lastFailureAt: null })
})

test('stale since is the end of the freshness budget, only when expired', () => {
  assert.equal(staleSince('expired', '2026-10-28T00:00:00Z'), '2026-10-28T00:00:00Z')
  assert.equal(staleSince('current', '2026-10-28T00:00:00Z'), null)
  assert.equal(staleSince('expired', null), null)
})

test('affected features list the expired datasets behind them', () => {
  const affected = affectedFeatures([
    { key: 'ktc:player-values', status: 'expired' },
    { key: 'dynasty:tiers:v1', status: 'current' },
    { key: COMMUNITY_TALLIES_KEY, status: 'expired' },
  ])
  const byId = Object.fromEntries(affected.map((f) => [f.id, f.datasets]))
  assert.deepEqual(byId.tradeMarket, ['ktc:player-values'])
  assert.deepEqual(byId.community, [COMMUNITY_TALLIES_KEY])
  assert.equal(byId.tiers, undefined)
})

test('a lapsed read-through snapshot is idle, not expired, until its refresh fails or it sits a day', () => {
  const now = Date.parse('2026-10-30T04:00:00Z')
  const lapsed = {
    key: 'espn:ppr:2026',
    status: 'expired',
    expires_at: '2026-10-30T03:41:00Z',
    source_observed_at: null,
  }
  assert.deepEqual(settleStatus(lapsed, 'success', now), {
    status: 'source-time-unknown',
    idleSince: '2026-10-30T03:41:00Z',
  })
  assert.equal(
    settleStatus(
      { ...lapsed, key: 'sleeper:projections:2026:8', source_observed_at: 'x' },
      'success',
      now
    ).status,
    'current'
  )
  // The latest refresh failed: the next read won't fix it.
  assert.equal(settleStatus(lapsed, 'failed', now).status, 'expired')
  // No refresh on record.
  assert.equal(settleStatus(lapsed, null, now).status, 'expired')
  // Idle for more than the declared 24 h stale bound.
  assert.equal(settleStatus(lapsed, 'success', now + READ_THROUGH_MAX_IDLE_MS).status, 'expired')
  // Not a read-through dataset: KTC is refreshed by its job, so expiry is staleness.
  assert.equal(
    settleStatus({ ...lapsed, key: 'ktc:player-values' }, 'success', now).status,
    'expired'
  )
  // Within its cache time nothing changes.
  assert.deepEqual(settleStatus({ ...lapsed, status: 'current' }, 'success', now), {
    status: 'current',
    idleSince: null,
  })
})
