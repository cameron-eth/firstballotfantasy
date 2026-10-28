// PR-18 (audit R3-4): dashboard loaders share Sleeper reads in the browser; each caller
// gets its own copy, failures aren't cached, and the server never shares between requests.
import test from 'node:test'
import assert from 'node:assert/strict'
import { clearSharedSleeperReads, sharedSleeperJson } from '../lib/sleeper-shared.ts'

function stubFetch(responses) {
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    const next = responses.shift() ?? { ok: true, body: { league_id: '1' } }
    return new Response(JSON.stringify(next.body), { status: next.ok ? 200 : 503 })
  }
  return calls
}

test('in the browser, reads of one URL share a request and return separate copies', async () => {
  globalThis.window = {}
  clearSharedSleeperReads()
  const calls = stubFetch([{ ok: true, body: { roster_positions: ['QB'] } }])
  const [a, b] = await Promise.all([sharedSleeperJson('https://x/league/1'), sharedSleeperJson('https://x/league/1')])
  assert.equal(calls.length, 1)
  a.roster_positions.push('RB')
  assert.deepEqual(b.roster_positions, ['QB'], 'one caller cannot change another\'s data')
  delete globalThis.window
})

test('a failed read is not shared, so the next caller retries', async () => {
  globalThis.window = {}
  clearSharedSleeperReads()
  const calls = stubFetch([{ ok: false, body: null }, { ok: true, body: { ok: 1 } }])
  await assert.rejects(sharedSleeperJson('https://x/state'))
  assert.deepEqual(await sharedSleeperJson('https://x/state'), { ok: 1 })
  assert.equal(calls.length, 2)
  delete globalThis.window
})

test('on the server every call fetches', async () => {
  clearSharedSleeperReads()
  const calls = stubFetch([])
  await sharedSleeperJson('https://x/league/2')
  await sharedSleeperJson('https://x/league/2')
  assert.equal(calls.length, 2)
})
