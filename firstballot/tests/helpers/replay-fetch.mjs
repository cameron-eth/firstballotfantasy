// Golden-metric fixtures: recorded HTTP responses replayed through the production code.
// The same key function is used to record (scripts/capture-league-fixture.mjs) and replay,
// so a request the code adds or changes fails loudly instead of silently missing data.
import { readFileSync } from 'node:fs'
import { matchKtcToSleeper } from '../../lib/ktc-identity.ts'
import { gunzipSync } from 'node:zlib'

/** A recorded league from tests/fixtures/leagues/<name>.json.gz. */
export function loadFixture(name) {
  const file = new URL(`../fixtures/leagues/${name}.json.gz`, import.meta.url)
  return JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'))
}

/** Stable lookup key for a request URL: relative app routes keep their path, `_v` cache
 * busters are dropped, and ESPN's calendar-year `season` param is ignored. */
export function fixtureKey(input) {
  const raw = typeof input === 'string' ? input : input.url
  const url = new URL(raw, 'https://app.local')
  url.searchParams.delete('_v')
  if (url.hostname === 'site.api.espn.com') url.searchParams.delete('season')
  url.searchParams.sort()
  const origin = url.origin === 'https://app.local' ? '' : url.origin
  return `${origin}${url.pathname}${url.search}`
}

/** Browser storage the dashboard code touches (league cache); a plain in-memory shim. */
export function installStorage() {
  const make = () => {
    const map = new Map()
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => void map.set(k, String(v)),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
    }
  }
  globalThis.localStorage ??= make()
  globalThis.sessionStorage ??= make()
}

/**
 * Replace global fetch with the fixture. `transform(key, body)` lets a test derive a
 * variant league (2QB, preseason) from a recorded one without recording it again.
 */
/**
 * Fixtures recorded before PR-19 hold `/api/ktc-values?names=` responses. The dashboard
 * now asks by Sleeper id, so answer `?sleeperIds=` from those recordings, resolving each
 * recorded KTC row to a Sleeper id with the production matcher (lib/ktc-identity), exactly
 * as the tier publish does.
 */
function ktcBySleeperIds(requests) {
  const players = requests['https://api.sleeper.app/v1/players/nfl']?.body ?? {}
  const rows = []
  let latestDate = null
  for (const [key, { body }] of Object.entries(requests)) {
    if (!key.startsWith('/api/ktc-values?names=')) continue
    latestDate = body.latestDate ?? latestDate
    for (const row of body.data ?? []) rows.push({ ...row, history: body.historyMap?.[row.player_name] })
  }
  const bySleeper = new Map(matchKtcToSleeper(rows, players).map(({ id, row }) => [id, row]))
  return (ids) => {
    const history = {}
    const latest = {}
    for (const id of ids) {
      const row = bySleeper.get(id)
      if (!row) continue
      if (row.history) history[id] = row.history
      latest[id] = { value_sf: row.value_sf, value_1qb: row.value_1qb }
    }
    return { latestDate, history, latest, source: 'supabase' }
  }
}

export function installReplay(fixture, transform = (_key, body) => body) {
  const requests = fixture.requests
  const answerSleeperIds = ktcBySleeperIds(requests)
  // App code often catches fetch errors (e.g. KTC chunks are "non-fatal"), so a missing
  // response must also be recorded here for the test to assert on.
  const misses = []
  globalThis.fetch = async (input) => {
    const key = fixtureKey(input)
    if (key.startsWith('/api/ktc-values?sleeperIds=')) {
      const ids = new URLSearchParams(key.split('?')[1]).get('sleeperIds').split(',')
      const value = transform(key, answerSleeperIds(ids))
      return {
        ok: true,
        status: 200,
        json: async () => structuredClone(value),
        text: async () => JSON.stringify(value),
      }
    }
    if (!(key in requests)) {
      misses.push(key)
      throw new Error(`Fixture ${fixture.name} has no response for ${key}`)
    }
    const { status, body } = requests[key]
    const value = transform(key, structuredClone(body))
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => structuredClone(value),
      text: async () => JSON.stringify(value),
    }
  }
  return misses
}

/** Deterministic Math.random for the playoff simulation (mulberry32). */
export function seedRandom(seed = 42) {
  let a = seed >>> 0
  const original = Math.random
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => {
    Math.random = original
  }
}
