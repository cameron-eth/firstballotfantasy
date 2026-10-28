// PR-10 (audit R2-6): snapshot keys come from constants and every TypeScript write goes
// through lib/platform/snapshots.ts, so bumping DYNASTY_TIER_VERSION moves every reader
// with the writer and every write leaves an ingestion_runs row.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { DRAFT_CAPITAL_KEY, DYNASTY_TIER_VERSION, TIER_KEY } from '../lib/dynasty-tiers.ts'

const root = new URL('..', import.meta.url).pathname
const sources = (dir) =>
  readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(root, dir, name)
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sources(relative(root, path))
    return /\.(ts|tsx)$/.test(name) ? [relative(root, path)] : []
  })
const files = ['app', 'lib', 'components'].flatMap(sources)
const read = (file) => readFileSync(join(root, file), 'utf8')

test('the tier key follows the tier version', () => {
  assert.equal(TIER_KEY, `dynasty:tiers:v${DYNASTY_TIER_VERSION}`)
  assert.equal(DRAFT_CAPITAL_KEY, 'nfl:draft-capital:v1')
})

test('no file spells out a versioned tier or draft-capital key', () => {
  const offenders = files.filter(
    (file) => file !== 'lib/dynasty-tiers.ts' && /dynasty:tiers:v\d|nfl:draft-capital:v\d/.test(read(file))
  )
  assert.deepEqual(offenders, [])
})

test('every tier reader uses TIER_KEY', () => {
  for (const file of [
    'app/api/rankings/route.ts',
    'app/api/trade-market/route.ts',
    'app/api/data-health/route.ts',
    'app/api/dynasty-tiers/route.ts',
  ])
    assert.match(read(file), /\bTIER_KEY\b/, file)
})

test('snapshot rows are written only by lib/platform/snapshots.ts', () => {
  const writers = files.filter((file) =>
    /from\(['"]data_snapshots['"]\)\s*\.(upsert|insert|update)\(/.test(read(file))
  )
  assert.deepEqual(writers, ['lib/platform/snapshots.ts'])
})

test('the college job logs its snapshot write like writeSnapshot does', () => {
  const script = read('scripts/refresh-college-prospects.py')
  assert.match(script, /"data_snapshots\?on_conflict=key"/)
  assert.match(script, /"ingestion_runs", "POST"/)
})

test('every snapshot read or write takes its key from lib/platform/snapshot-keys', () => {
  // A key written as a string or template literal at the call site is the drift PR-10 removed.
  const literal = /\b(snapshot|writeSnapshot|readSnapshot|latestSnapshot)\(\s*[`'"]/
  const offenders = files.filter((file) => file !== 'lib/platform/snapshots.ts' && literal.test(read(file)))
  assert.deepEqual(offenders, [])
  const keyLiterals = files.filter(
    (file) =>
      file !== 'lib/platform/snapshot-keys.ts' &&
      /['`](espn:ppr:|sleeper:projections:|sleeper:rosters:|prospects:%)/.test(read(file))
  )
  assert.deepEqual(keyLiterals, [])
})

