import test from 'node:test'
import assert from 'node:assert/strict'

const { resolveSeasonWindow } = await import(
  '../components/league-buddy/draft-order/seasonWindow.ts'
)

const LIVE_2026 = { season: '2026', week: 5, display_week: 5, season_type: 'regular' }
const LEAGUE_2026 = { season: '2026', status: 'in_season', settings: { playoff_week_start: 15 } }

test('the week being played is counted, not skipped', () => {
  const { weeks, liveWeek, season } = resolveSeasonWindow(LIVE_2026, LEAGUE_2026)
  assert.deepEqual(weeks, [1, 2, 3, 4, 5])
  assert.equal(liveWeek, 5)
  assert.equal(season, '2026')
})

test('week 1 in progress totals week 1 alone', () => {
  const { weeks, liveWeek } = resolveSeasonWindow({ ...LIVE_2026, week: 1 }, LEAGUE_2026)
  assert.deepEqual(weeks, [1])
  assert.equal(liveWeek, 1)
})

test('playoff weeks never count toward draft order', () => {
  const { weeks } = resolveSeasonWindow({ ...LIVE_2026, week: 17, season_type: 'post' }, LEAGUE_2026)
  assert.deepEqual(weeks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
})

test("a past-season league uses its own regular season, not the live NFL week", () => {
  // The 2025 league paired with the live 2026 week 5 must not total five weeks of a
  // season that finished — league ids change every year and the two are unrelated.
  const league2025 = { season: '2025', status: 'complete', settings: { playoff_week_start: 15 } }
  const { weeks, liveWeek, season } = resolveSeasonWindow(LIVE_2026, league2025)
  assert.equal(weeks.length, 14)
  assert.equal(liveWeek, null, 'nothing is live in a finished season')
  assert.equal(season, '2025')
})

test('a completed league in the current season totals its full regular season', () => {
  const complete = { season: '2026', status: 'complete', settings: { playoff_week_start: 15 } }
  const { weeks, liveWeek } = resolveSeasonWindow(LIVE_2026, complete)
  assert.equal(weeks.length, 14)
  assert.equal(liveWeek, null)
})

test('pre-season and off-season have nothing to total', () => {
  for (const seasonType of ['pre', 'off']) {
    const state = { season: '2026', week: 1, season_type: seasonType }
    const league = { season: '2026', status: 'pre_draft', settings: { playoff_week_start: 15 } }
    assert.deepEqual(resolveSeasonWindow(state, league).weeks, [], seasonType)
  }
})

test('a league with no playoff_week_start falls back to an 18-week regular season', () => {
  const league = { season: '2026', status: 'in_season' }
  const { weeks } = resolveSeasonWindow({ ...LIVE_2026, week: 20 }, league)
  assert.equal(weeks.length, 18)
})

test('missing state or league still yields a usable window', () => {
  assert.deepEqual(resolveSeasonWindow(null, LEAGUE_2026).weeks, [])
  const { weeks } = resolveSeasonWindow(LIVE_2026, null)
  assert.deepEqual(weeks, [1, 2, 3, 4, 5])
})
