// Server/CI only. Writes the KTC archive to ktc_player_values one day at a time, oldest
// first, and marks each day complete only after the database holds every row for it
// (PR-11, audit R2-2). The tier build publishes only from a day with that marker, so an
// interrupted run can never publish tiers from a partly written day.
//
// A day already marked complete is skipped, so a daily run writes only the new day (and
// any day a previous run left unfinished) instead of re-sending the whole archive.
// Nothing is ever deleted.
import fs from 'node:fs'

const started = performance.now()
const archive = JSON.parse(fs.readFileSync(new URL('../data/ktc-history.json', import.meta.url), 'utf8'))
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw Error('Supabase server configuration required')

/** ingestion_runs dataset that marks one KTC day as completely written (read by the tier build). */
const dayMarker = (date) => `ktc:day:${date}`
const headers = { apikey: key, authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const rest = (path, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } })

// Group the archive by day, oldest first, so the newest day is always written last.
const byDate = new Map()
for (const [id, p] of Object.entries(archive.players))
  for (const h of p.history) {
    const row = {
      ktc_player_id: Number(id), player_name: p.name, position: p.position, team: p.team,
      scraped_date: h[0], value_sf: h[1], value_1qb: h[2], rank_sf: h[3], rank_1qb: h[4],
    }
    byDate.set(h[0], [...(byDate.get(h[0]) ?? []), row])
  }
const dates = [...byDate.keys()].sort()

const markersResponse = await rest(
  'ingestion_runs?select=dataset,row_count&status=eq.success&dataset=like.ktc:day:*&limit=10000'
)
if (!markersResponse.ok) throw Error(`Could not read day markers (${markersResponse.status})`)
const marked = new Map((await markersResponse.json()).map((m) => [m.dataset, m.row_count]))

async function countDay(date) {
  const response = await rest(`ktc_player_values?select=ktc_player_id&scraped_date=eq.${date}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  })
  const total = Number(response.headers.get('content-range')?.split('/')[1])
  if (!Number.isFinite(total)) throw Error(`Could not count KTC rows for ${date}`)
  return total
}

let written = 0
let verified = 0
for (const date of dates) {
  const rows = byDate.get(date)
  if ((marked.get(dayMarker(date)) ?? -1) >= rows.length) continue
  if ((await countDay(date)) < rows.length) {
    for (let i = 0; i < rows.length; i += 500) {
      const response = await rest('ktc_player_values?on_conflict=ktc_player_id,scraped_date', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 500)),
      })
      if (!response.ok) throw Error(`KTC import failed for ${date} (${response.status}): ${await response.text()}`)
    }
    written += rows.length
  }
  const stored = await countDay(date)
  if (stored < rows.length) throw Error(`KTC day ${date} incomplete: ${stored}/${rows.length} rows`)
  const marker = await rest('ingestion_runs', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      dataset: dayMarker(date), status: 'success', completed_at: new Date().toISOString(),
      row_count: rows.length, source: 'script:sync-ktc-values', details: { date, stored },
    }),
  })
  if (!marker.ok) throw Error(`Could not mark KTC day ${date} complete (${marker.status})`)
  verified += 1
}

const seconds = ((performance.now() - started) / 1000).toFixed(1)
const summary = `KTC sync: ${dates.length} days in the archive, ${verified} newly verified, ${written} rows written, ${seconds} s.`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
