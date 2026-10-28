// Golden-metric fixtures: recorded HTTP responses replayed through the production code.
// The same key function is used to record (scripts/capture-league-fixture.mjs) and replay,
// so a request the code adds or changes fails loudly instead of silently missing data.
import { readFileSync } from 'node:fs'
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
export function installReplay(fixture, transform = (_key, body) => body) {
  const requests = fixture.requests
  // App code often catches fetch errors (e.g. KTC chunks are "non-fatal"), so a missing
  // response must also be recorded here for the test to assert on.
  const misses = []
  globalThis.fetch = async (input) => {
    const key = fixtureKey(input)
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
