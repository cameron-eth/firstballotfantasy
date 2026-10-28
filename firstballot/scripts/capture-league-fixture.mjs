// Records a real league's HTTP responses as a golden-metric fixture.
//
//   node --import tsx --import ./tests/helpers/register.mjs \
//     scripts/capture-league-fixture.mjs <sleeperLeagueId> <fixtureName> [appBaseUrl]
//
// It runs the same harness the golden test runs (tests/helpers/league-metrics-harness.mjs)
// against live Sleeper and the deployed app API, recording every response by fixtureKey.
// Then it anonymizes people (team names, owners, avatars, user ids, league id), trims the
// ~17 MB Sleeper players DB to the players the league references, and writes
// tests/fixtures/leagues/<fixtureName>.json.gz (gzipped; JSON compresses ~10x).
import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { fixtureKey, installStorage } from '../tests/helpers/replay-fetch.mjs'

const [leagueId, name, base = 'https://www.firstballotff.com'] = process.argv.slice(2)
if (!leagueId || !name) {
  console.error('usage: capture-league-fixture.mjs <leagueId> <fixtureName> [appBaseUrl]')
  process.exit(1)
}
installStorage()

const realFetch = globalThis.fetch
const requests = {}
globalThis.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : input.url
  const absolute = raw.startsWith('/') ? `${base}${raw}` : raw
  const { next: _next, ...rest } = init ?? {}
  const response = await realFetch(absolute, rest)
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  requests[fixtureKey(raw)] = { status: response.status, body }
  return {
    ok: response.ok,
    status: response.status,
    json: async () => structuredClone(body),
    text: async () => text,
  }
}

const { computeLeagueMetrics } = await import('../tests/helpers/league-metrics-harness.mjs')
await computeLeagueMetrics(leagueId)

// Players the league actually touches: rosters, matchups, transactions, trending.
const referenced = new Set()
const collect = (value) => {
  if (Array.isArray(value)) return value.forEach(collect)
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (['players', 'starters', 'reserve', 'taxi'].includes(k) && Array.isArray(v))
        v.forEach((id) => referenced.add(String(id)))
      else if (['players_points', 'adds', 'drops'].includes(k) && v && typeof v === 'object')
        Object.keys(v).forEach((id) => referenced.add(id))
      else if (k === 'player_id') referenced.add(String(v))
      else collect(v)
    }
  }
}
for (const [key, entry] of Object.entries(requests))
  if (!key.endsWith('/players/nfl')) collect(entry.body)
for (const [key, entry] of Object.entries(requests))
  if (key.endsWith('/players/nfl') && entry.body)
    entry.body = Object.fromEntries(Object.entries(entry.body).filter(([id]) => referenced.has(id)))

// KTC history is ~26 KB per player; the dashboard only derives the first→last trend from
// it (applyKtc), so keep those two points and every computed value stays identical.
for (const [key, entry] of Object.entries(requests))
  if (key.startsWith('/api/ktc-values') && entry.body?.historyMap)
    for (const [player, points] of Object.entries(entry.body.historyMap))
      if (Array.isArray(points) && points.length > 2)
        entry.body.historyMap[player] = [points[0], points[points.length - 1]]

// Anonymize people. Names and avatars are rewritten only in the users response (a global
// replace could hit a player who shares an owner's name); opaque user ids are replaced
// everywhere so rosters and transactions still join to users.
const usersKey = Object.keys(requests).find((k) => k.endsWith(`/league/${leagueId}/users`))
const users = usersKey ? (requests[usersKey].body ?? []) : []
const userIds = users.map((u) => u.user_id)
users.forEach((user, i) => {
  user.display_name = `Team ${i + 1}`
  user.username = `owner${i + 1}`
  if (user.metadata) user.metadata = { team_name: `Team ${i + 1}` }
})
let serialized = JSON.stringify(requests)
userIds.forEach((id, i) => {
  serialized = serialized.split(JSON.stringify(id)).join(JSON.stringify(`user-${i + 1}`))
})
serialized = serialized.split(leagueId).join(`fixture-${name}`)
const scrubbed = JSON.parse(serialized, (key, value) =>
  ['avatar', 'avatar_url', 'league_avatar'].includes(key) ? null : value
)
for (const entry of Object.values(scrubbed)) {
  if (
    entry.body &&
    typeof entry.body === 'object' &&
    'name' in entry.body &&
    'league_id' in entry.body
  )
    entry.body.name = `Fixture ${name}`
}

await mkdir(new URL('../tests/fixtures/leagues/', import.meta.url), { recursive: true })
const file = new URL(`../tests/fixtures/leagues/${name}.json.gz`, import.meta.url)
await writeFile(
  file,
  gzipSync(
    JSON.stringify({
      name,
      leagueId: `fixture-${name}`,
      capturedAt: new Date().toISOString(),
      requests: scrubbed,
    })
  )
)
console.log(
  `${name}: ${Object.keys(scrubbed).length} requests, ${referenced.size} players → ${file.pathname}`
)
