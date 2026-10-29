// PR-20b: find ESPN athlete ids for prospects that have none, for owner review.
//
// Read-only. Searches ESPN by name (plus common name variants), then checks each candidate's
// position, college and (for drafted classes) draft year against our row. Writes
// docs/data-architecture/PR20B_ESPN_LOOKUP.md and a JSON file next to it; nothing is written to
// the database. The migration applies only rows marked `confirmed` after review.
//
// Run from firstballot/: node --import tsx scripts/prospects/lookup-espn-ids.mjs
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

globalThis.WebSocket ??= class {}

/** Stale 2026 duplicates removed by the same migration; they need no id. */
export const STALE_DUPLICATE_IDS = [1005, 1000, 998, 923, 929, 917, 926, 908, 930]

/** Names ESPN lists differently from our rows. */
const ALIASES = {
  'Ken Walker III': ['Kenneth Walker III'],
  'Nathaniel Dell': ['Tank Dell'],
  'Devon Achane': ["De'Von Achane"],
  'Isaih Pacheco': ['Isiah Pacheco'],
  'Josh Palmer': ['Joshua Palmer'],
  'DJ Chark': ['DJ Chark Jr.', 'D.J. Chark'],
}

const SUFFIX = /\s+(jr\.?|sr\.?|ii|iii|iv)$/i
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')

export function nameVariants(name) {
  const base = name.replace(SUFFIX, '')
  return [...new Set([name, base, ...(ALIASES[name] ?? [])])]
}

/** College names match when one contains the other ("Miami" / "Miami (FL)"). */
export function sameCollege(a, b) {
  const x = norm(a)
  const y = norm(b)
  return Boolean(x && y && (x.includes(y) || y.includes(x)))
}

/**
 * confirmed: exactly one candidate, and its position, college and draft year (when known)
 * all agree. review: candidates exist but something differs or is unknown. none: no candidate.
 */
export function classify(row, candidates) {
  const checked = candidates.map((c) => ({
    ...c,
    checks: {
      position: c.position === row.position,
      college: sameCollege(c.college, row.school),
      draft: c.draftYear == null || row.draft_year == null || c.draftYear === row.draft_year,
    },
  }))
  const good = checked.filter((c) => c.checks.position && c.checks.college && c.checks.draft)
  if (good.length === 1) return { status: 'confirmed', pick: good[0], checked }
  return { status: checked.length ? 'review' : 'none', pick: null, checked }
}

async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  return r.ok ? r.json() : null
}

async function search(name) {
  const q = encodeURIComponent(name)
  const d = await json(
    `https://site.web.api.espn.com/apis/search/v2?query=${q}&limit=10&type=player&sport=football`
  )
  return (d?.results ?? [])
    .flatMap((x) => x.contents ?? [])
    .map((c) => ({ id: /a:(\d+)/.exec(c.uid ?? '')?.[1], league: /l:(\d+)/.exec(c.uid ?? '')?.[1] }))
    .filter((c) => c.id && (c.league === '28' || c.league === '23'))
}

async function details({ id, league }) {
  const sport = league === '28' ? 'nfl' : 'college-football'
  const [v3, core] = await Promise.all([
    json(`https://site.web.api.espn.com/apis/common/v3/sports/football/${sport}/athletes/${id}`),
    league === '28'
      ? json(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/${id}`)
      : null,
  ])
  const a = v3?.athlete ?? {}
  return {
    espnId: id,
    league: sport,
    name: a.displayName ?? null,
    position: a.position?.abbreviation ?? null,
    college: a.college?.name ?? (sport === 'college-football' ? a.team?.location : null) ?? null,
    draftYear: core?.draft?.year ?? null,
  }
}

async function main() {
  const env = Object.fromEntries(
    fs
      .readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
      })
  )
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: rows, error } = await sb
    .from('dynasty_prospects')
    .select('id,name,position,school,draft_year')
    .is('espn_id', null)
    .order('draft_year')
  if (error) throw error

  const results = []
  for (const row of rows.filter((r) => !STALE_DUPLICATE_IDS.includes(r.id))) {
    const hits = new Map()
    for (const variant of nameVariants(row.name))
      for (const hit of await search(variant)) hits.set(hit.id, hit)
    const candidates = []
    for (const hit of hits.values()) {
      const d = await details(hit)
      if (nameVariants(row.name).some((v) => norm(v.replace(SUFFIX, '')) === norm(String(d.name).replace(SUFFIX, ''))))
        candidates.push(d)
    }
    results.push({ row, ...classify(row, candidates) })
  }

  const out = new URL('../../../docs/data-architecture/', import.meta.url)
  fs.writeFileSync(new URL('PR20B_ESPN_LOOKUP.json', out), JSON.stringify(results, null, 2) + '\n')
  const mark = (ok) => (ok ? '' : ' ✗')
  const cell = (c) =>
    `${c.espnId} ${c.name} · ${c.position ?? '?'}${mark(c.checks.position)} · ${c.college ?? '?'}${mark(c.checks.college)}${c.draftYear ? ` · ${c.draftYear}${mark(c.checks.draft)}` : ''}`
  const lines = [
    '# PR-20b: ESPN id lookup for review',
    '',
    `Generated by \`scripts/prospects/lookup-espn-ids.mjs\` on ${new Date().toISOString().slice(0, 10)}. Read-only; the migration writes only **confirmed** rows the owner approves.`,
    '',
    '- **confirmed**: one ESPN player whose position, college and draft year all match.',
    '- **review**: candidates exist, but a check fails or is unknown (transfer, school "TBD", namesake).',
    '- **none**: ESPN search found nobody by that name.',
    '',
    `| Status | Class | Prospect | Position · school | ESPN candidate(s) |`,
    `|---|---|---|---|---|`,
    ...results.map(
      (r) =>
        `| ${r.status} | ${r.row.draft_year} | ${r.row.name} (#${r.row.id}) | ${r.row.position} · ${r.row.school} | ${r.checked.map(cell).join('<br>') || '—'} |`
    ),
    '',
    `Totals: ${['confirmed', 'review', 'none'].map((s) => `${results.filter((r) => r.status === s).length} ${s}`).join(', ')}.`,
    '',
  ]
  fs.writeFileSync(new URL('PR20B_ESPN_LOOKUP.md', out), lines.join('\n'))
  console.log(lines.at(-2))
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
