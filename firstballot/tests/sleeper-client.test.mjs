// PR-21a (audit R4-3): SleeperClient is the one Sleeper transport. It keeps the per-endpoint
// cache settings of the retired `sleeperApi` wrapper, and uses whatever fetch is installed
// when a request is made (fixture replay installs one after import).
import test from 'node:test'
import assert from 'node:assert/strict'
import { SLEEPER_CACHE, SleeperClient, sleeperClient } from '../lib/sleeper-sdk/client.ts'

function stubFetch(statuses = [200]) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const status = statuses.shift() ?? 200
    return new Response(JSON.stringify({ ok: status }), { status })
  }
  return calls
}

test('the shared client uses a fetch installed after import', async () => {
  const calls = stubFetch()
  await sleeperClient.getNflState()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.sleeper.app/v1/state/nfl')
})

test('cache settings reach fetch unchanged, next to the timeout signal', async () => {
  const calls = stubFetch()
  await sleeperClient.getLeagueRosters('42', SLEEPER_CACHE.rosters)
  const { init } = calls[0]
  assert.equal(init.cache, 'force-cache')
  assert.deepEqual(init.next, { revalidate: 300, tags: ['league'] })
  assert.ok(init.signal instanceof AbortSignal)
  assert.equal('timeoutMs' in init, false)
})

test('trending keeps the old URL (24 h, 10 players)', async () => {
  const calls = stubFetch()
  await sleeperClient.getTrendingPlayers('add', 24, 10, SLEEPER_CACHE.trending)
  assert.equal(
    calls[0].url,
    'https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=10'
  )
})

test('retryable errors are retried; a 404 is not', async () => {
  const client = new SleeperClient({ retries: 3 })
  let calls = stubFetch([503, 200])
  assert.deepEqual(await client.getLeague('1'), { ok: 200 })
  assert.equal(calls.length, 2)

  calls = stubFetch([404])
  await assert.rejects(client.getLeague('1'), { name: 'SleeperApiError', status: 404 })
  assert.equal(calls.length, 1)
})
