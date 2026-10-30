// PR-11 (audit R2-2): the KTC sync writes one day at a time, oldest first, and marks a day
// complete only once every row is stored. Runs the real script against an in-memory
// stand-in for the two PostgREST tables it touches.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { KTC_DAY_MARKER_PREFIX } from '../lib/dynasty-tiers.ts'

const archive = JSON.parse(readFileSync(new URL('../data/ktc-history.json', import.meta.url), 'utf8'))
const lastDate = archive.dates.at(-1)

/** One database; each run gets its own fetch (and failure mode) against the same rows. */
const newState = () => ({ values: new Map(), runs: [] })
function fakeDatabase(state, { failOn } = {}) {
  const { values, runs } = state
  const posted = []
  const fetch = async (input, init = {}) => {
    const u = new URL(input)
    const table = u.pathname.split('/').pop()
    if (table === 'ingestion_runs' && (init.method ?? 'GET') === 'GET')
      return Response.json(runs.filter((r) => r.dataset.startsWith('ktc:day:')))
    if (table === 'ingestion_runs') {
      runs.push(JSON.parse(init.body))
      return new Response(null, { status: 201 })
    }
    if (init.method === 'HEAD') {
      const date = u.searchParams.get('scraped_date').slice(3)
      const total = [...values.values()].filter((r) => r.scraped_date === date).length
      return new Response(null, { headers: { 'content-range': `0-0/${total}` } })
    }
    const rows = JSON.parse(init.body)
    if (failOn && rows[0].scraped_date === failOn) {
      // A dropped connection after part of the day landed.
      for (const r of rows.slice(0, 100)) values.set(`${r.ktc_player_id}:${r.scraped_date}`, r)
      return new Response('connection reset', { status: 503 })
    }
    posted.push(rows[0].scraped_date)
    for (const r of rows) values.set(`${r.ktc_player_id}:${r.scraped_date}`, r)
    return new Response(null, { status: 201 })
  }
  return { fetch, runs, posted }
}

let run = 0
async function sync(db) {
  process.env.SUPABASE_URL = 'https://db.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
  const real = globalThis.fetch
  globalThis.fetch = db.fetch
  try {
    await import(`../scripts/sync-ktc-values.mjs?run=${run++}`)
  } finally {
    globalThis.fetch = real
  }
}

test('an interrupted sync never marks the partly written day complete', async () => {
  const state = newState()
  const db = fakeDatabase(state, { failOn: lastDate })
  await assert.rejects(sync(db), /KTC import failed/)
  const marked = db.runs.map((r) => r.dataset)
  assert.ok(marked.includes(`${KTC_DAY_MARKER_PREFIX}${archive.dates.at(-2)}`))
  assert.ok(!marked.includes(`${KTC_DAY_MARKER_PREFIX}${lastDate}`), 'partial day was marked')
  // Days are written oldest first, so only the newest day can be the partial one.
  assert.deepEqual(db.posted, [...db.posted].sort())

  // The next run writes only the unfinished day and then marks it.
  const next = fakeDatabase(state)
  await sync(next)
  assert.deepEqual(next.posted, [lastDate])
  assert.ok(state.runs.some((r) => r.dataset === `${KTC_DAY_MARKER_PREFIX}${lastDate}`))
})

test('a day already stored in full is marked without being re-sent (first run on existing data)', async () => {
  const state = newState()
  await sync(fakeDatabase(state))
  // Drop the markers but keep the rows: the sync re-verifies counts and sends nothing.
  state.runs.length = 0
  const again = fakeDatabase(state)
  await sync(again)
  assert.deepEqual(again.posted, [])
  assert.equal(state.runs.length, archive.dates.length)
})

test('the tier build reads the same marker the sync writes', () => {
  const script = readFileSync(new URL('../scripts/sync-ktc-values.mjs', import.meta.url), 'utf8')
  assert.match(script, new RegExp('`' + KTC_DAY_MARKER_PREFIX + '\\$\\{date\\}`'))
  const route = readFileSync(new URL('../lib/platform/ktc-days.ts', import.meta.url), 'utf8')
  assert.match(route, /KTC_DAY_MARKER_PREFIX/)
})
