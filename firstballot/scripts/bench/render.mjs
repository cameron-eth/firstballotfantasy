// Render benchmark for the league dashboard (PR-14, gate G-PR for performance PRs).
// Mounts the real LeagueBuddy in jsdom on a recorded fixture league and records React
// Profiler commits and render time for a fixed interaction script. Run:
//   node --import tsx --import ./tests/helpers/register.mjs --require ./scripts/bench/register-render.cjs scripts/bench/render.mjs
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost/league-buddy?tab=overview', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Element', 'getComputedStyle', 'MutationObserver', 'SVGElement'])
  globalThis[key] ??= dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// Desktop: the Team Builder mounts (hidden) as it does for desktop visitors.
dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
globalThis.matchMedia = dom.window.matchMedia
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
dom.window.ResizeObserver = globalThis.ResizeObserver
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} }
globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(performance.now()), 16)
globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id)
dom.window.scrollTo = () => {}
dom.window.HTMLElement.prototype.scrollIntoView = () => {}
globalThis.WebSocket ??= class {}
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test'

const { installReplay, installStorage, loadFixture } = await import('../../tests/helpers/replay-fetch.mjs')
installStorage()
const fixture = loadFixture('sf-dynasty')
// BENCH_SERVER_METRICS=1 turns NEXT_PUBLIC_SERVER_LEAGUE_METRICS on (PR-15b) and answers
// /api/league/{id}/metrics with the server computation for this fixture, already cached.
const serverMetrics = process.env.BENCH_SERVER_METRICS === '1'
let metricsBody = null
if (serverMetrics) {
  process.env.NEXT_PUBLIC_SERVER_LEAGUE_METRICS = '1'
  installReplay(fixture)
  const { leagueMetrics, loadLeagueInputs } = await import('../../lib/league-metrics/compute.ts')
  const inputs = await loadLeagueInputs(fixture.leagueId)
  metricsBody = JSON.stringify({ version: 1, inputHash: 'bench', computedAt: '', metrics: leagueMetrics(inputs) })
  const { clearPlayersMemo } = await import('../../components/league-buddy/leagueDataBundle.ts')
  const { clearPlayoffOddsCache } = await import('../../components/league-buddy/utils/playoffOdds.ts')
  clearPlayersMemo()
  clearPlayoffOddsCache()
}
const misses = installReplay(fixture)
// Count every request the dashboard makes, by URL without its cache-busting query.
const requests = []
{
  const replay = globalThis.fetch
  globalThis.fetch = (input, init) => {
    requests.push(String(input).replace(/([?&])_v=\d+/, '$1').replace(/[?&]$/, ''))
    return replay(input, init)
  }
}
if (metricsBody) {
  const replay = globalThis.fetch
  globalThis.fetch = (input, init) =>
    String(input).startsWith(`/api/league/${fixture.leagueId}/metrics`)
      ? Promise.resolve(new Response(metricsBody, { headers: { 'Content-Type': 'application/json' } }))
      : replay(input, init)
}

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { act } = React
const { AuthProvider } = await import('../../lib/auth.tsx')
const { default: LeagueBuddy } = await import('../../components/LeagueBuddy.tsx')

const commits = []
const onRender = (_id, phase, actualDuration) => commits.push({ phase, actualDuration })
const root = createRoot(document.getElementById('app'))
await act(async () => {
  root.render(
    React.createElement(
      React.Profiler,
      { id: 'dashboard', onRender },
      React.createElement(AuthProvider, null, React.createElement(LeagueBuddy, { leagueId: fixture.leagueId, user: null }))
    )
  )
})

// Load: let every request (league, KTC, draft order, projections, trade inventory) settle.
const settle = async (ms = 50, rounds = 40) => {
  for (let i = 0; i < rounds; i++) await act(async () => new Promise((r) => setTimeout(r, ms)))
}
await settle()
const loaded = commits.length
const loadRequests = requests.length

const measure = async (label, step) => {
  const start = commits.length
  await step()
  await settle(20, 10)
  const slice = commits.slice(start)
  return { label, commits: slice.length, ms: slice.reduce((s, c) => s + c.actualDuration, 0) }
}
const click = (label) => {
  const button = [...document.querySelectorAll('[aria-label="League sections"] button, [aria-label="League sections"] a')].find(
    (b) => b.textContent.trim().startsWith(label)
  )
  if (!button) throw Error(`No section tab "${label}"`)
  return act(async () => button.click())
}

const rows = [
  { label: 'initial load (to settled)', commits: loaded, ms: commits.reduce((s, c) => s + c.actualDuration, 0) },
  await measure('window focus (dismissals refresh)', () => act(async () => window.dispatchEvent(new window.Event('focus')))),
  await measure('switch to My Team', () => click('My Team')),
  await measure('switch to Standings', () => click('Standings')),
  await measure('switch to Overview', () => click('Overview')),
  await measure('window focus again', () => act(async () => window.dispatchEvent(new window.Event('focus')))),
]
console.log(`Node ${process.version} · fixture sf-dynasty · server metrics ${serverMetrics ? 'on' : 'off'} · replay misses ${misses.length}`)
if (process.env.BENCH_DEBUG) console.log(misses)
const byUrl = {}
for (const url of requests.slice(0, loadRequests)) byUrl[url] = (byUrl[url] ?? 0) + 1
const duplicates = Object.entries(byUrl).filter(([, n]) => n > 1)
console.log(`initial-load requests: ${loadRequests} (${Object.keys(byUrl).length} distinct)`)
if (process.env.BENCH_REQUESTS) for (const [url, n] of duplicates.sort((a, b) => b[1] - a[1])) console.log(`  ${n}× ${url.slice(0, 110)}`)
console.log('| Interaction | Commits | Render ms |')
console.log('|---|---|---|')
for (const r of rows) console.log(`| ${r.label} | ${r.commits} | ${r.ms.toFixed(1)} |`)
await act(async () => root.unmount())
process.exit(0)
