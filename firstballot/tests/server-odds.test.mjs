// PR-15b: with NEXT_PUBLIC_SERVER_LEAGUE_METRICS on, the dashboard reads playoff odds from
// the server snapshot, but only when it was computed from the records the dashboard shows.
import test from 'node:test'
import assert from 'node:assert/strict'
import { installReplay, installStorage, loadFixture } from './helpers/replay-fetch.mjs'
import { leagueMetrics, loadLeagueInputs } from '../lib/league-metrics/compute.ts'
import { serverPlayoffOdds } from '../lib/league-metrics/server-odds.ts'
import { calculatePlayoffOdds, clearPlayoffOddsCache } from '../components/league-buddy/utils/playoffOdds.ts'
import { clearPlayersMemo } from '../components/league-buddy/leagueDataBundle.ts'

installStorage()

async function league() {
  const fixture = loadFixture('sf-dynasty')
  installReplay(fixture)
  clearPlayersMemo()
  clearPlayoffOddsCache()
  const inputs = await loadLeagueInputs(fixture.leagueId, 'https://app.local')
  return { inputs, server: { metrics: JSON.parse(JSON.stringify(leagueMetrics(inputs))), inputHash: 'x', computedAt: 'x' } }
}

test('server odds match the client simulation, row for row', async () => {
  const { inputs, server } = await league()
  const { teams, settings } = inputs
  const client = calculatePlayoffOdds(teams, settings.completed, settings.end, settings.spots, settings.schedule)
  const fromServer = serverPlayoffOdds(teams, server)
  assert.deepEqual(
    fromServer.map((o) => [o.rosterId, o.rank, o.playoffProbability]),
    client.map((o) => [o.rosterId, o.rank, Number(o.playoffProbability.toFixed(2))])
  )
})

test('a snapshot from different records is not used', async () => {
  const { inputs, server } = await league()
  const moved = inputs.teams.map((t, i) => (i === 0 ? { ...t, wins: t.wins + 1 } : t))
  assert.equal(serverPlayoffOdds(moved, server), null)
  assert.equal(serverPlayoffOdds(inputs.teams, undefined), null)
  assert.equal(serverPlayoffOdds(inputs.teams.slice(1), server), null)
})
