// PR-15 (audit R3-1): the server route computes league metrics with lib/league-metrics/compute
// and calls the app's own API by absolute URL. Run that path on every recorded league and
// require exactly the golden values the dashboard's client path produces.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installReplay, installStorage, loadFixture } from './helpers/replay-fetch.mjs'
import { computeLeagueMetrics } from './helpers/league-metrics-harness.mjs'
import { leagueInputHash, loadLeagueInputs } from '../lib/league-metrics/compute.ts'
import { clearPlayersMemo } from '../components/league-buddy/useLeagueData.ts'

installStorage()
// Replay keys drop this origin, as they drop the browser's.
const SERVER_ORIGIN = 'https://app.local'

for (const name of ['sf-dynasty', '1qb-dynasty', 'redraft-1qb']) {
  test(`server path matches the golden metrics: ${name}`, async () => {
    const fixture = loadFixture(name)
    const misses = installReplay(fixture)
    const server = await computeLeagueMetrics(fixture.leagueId, SERVER_ORIGIN)
    assert.deepEqual(misses, [])
    const golden = JSON.parse(readFileSync(new URL(`./golden/${name}.json`, import.meta.url), 'utf8'))
    assert.deepEqual(JSON.parse(JSON.stringify(server)), golden)
  })
}

test('the input hash is stable for the same league state', async () => {
  const fixture = loadFixture('sf-dynasty')
  installReplay(fixture)
  clearPlayersMemo()
  const first = leagueInputHash(await loadLeagueInputs(fixture.leagueId, SERVER_ORIGIN))
  installReplay(fixture, (key, body) =>
    key.endsWith('/rosters') ? body.map((r, i) => (i === 0 ? { ...r, settings: { ...r.settings, wins: 99 } } : r)) : body
  )
  clearPlayersMemo()
  const changed = leagueInputHash(await loadLeagueInputs(fixture.leagueId, SERVER_ORIGIN))
  installReplay(fixture)
  clearPlayersMemo()
  const again = leagueInputHash(await loadLeagueInputs(fixture.leagueId, SERVER_ORIGIN))
  assert.equal(first, again)
  assert.notEqual(first, changed)
})
