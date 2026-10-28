import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lastDraftedClass, nextDraftClass, upcomingDraftClasses } from '../lib/draft-years.ts'

const at = (iso) => new Date(iso)

test('a class stays upcoming through April and is drafted from May', () => {
  assert.equal(nextDraftClass(at('2026-10-28T12:00:00Z')), 2027)
  assert.equal(nextDraftClass(at('2026-12-31T23:59:59Z')), 2027)
  // The old Math.max(2027, year + 1) jumped to 2028 here and hid the 2027 class before its draft.
  assert.equal(nextDraftClass(at('2027-01-01T00:00:00Z')), 2027)
  assert.equal(nextDraftClass(at('2027-04-30T23:59:59Z')), 2027)
  assert.equal(nextDraftClass(at('2027-05-01T00:00:00Z')), 2028)
})

test('the last drafted class is the one before the next', () => {
  assert.equal(lastDraftedClass(at('2026-10-28T12:00:00Z')), 2026)
  assert.equal(lastDraftedClass(at('2027-03-01T00:00:00Z')), 2026)
  assert.equal(lastDraftedClass(at('2027-06-01T00:00:00Z')), 2027)
})

test('upcoming classes run nearest first', () => {
  assert.deepEqual(upcomingDraftClasses(3, at('2026-10-28T12:00:00Z')), [2027, 2028, 2029])
  assert.deepEqual(upcomingDraftClasses(3, at('2027-05-02T00:00:00Z')), [2028, 2029, 2030])
})

test('the college stats job uses the same rule', () => {
  const dates = ['2026-10-28', '2027-01-01', '2027-04-30', '2027-05-01']
  const out = execFileSync(
    'python3',
    [
      '-c',
      `import sys, datetime; sys.path.insert(0, 'scripts')
import importlib.util
spec = importlib.util.spec_from_file_location('r', 'scripts/refresh-college-prospects.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(','.join(str(m.next_draft_class(datetime.date.fromisoformat(d))) for d in ${JSON.stringify(dates)}))`,
    ],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  ).trim()
  assert.equal(out, dates.map((d) => nextDraftClass(at(`${d}T12:00:00Z`))).join(','))
})
