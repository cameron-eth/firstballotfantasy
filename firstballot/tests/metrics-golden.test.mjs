// Golden metrics: every dashboard metric (DATA_INVENTORY §2) for representative leagues,
// computed by the production code from recorded responses and compared with a snapshot.
// A PR that changes a value must update tests/golden/<fixture>.json and list the change
// (docs/data-architecture/PR_SEQUENCE.md, gate G-PR). Regenerate with:
//   UPDATE_GOLDEN=1 npm test -- --test-name-pattern golden
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { installReplay, installStorage, loadFixture } from './helpers/replay-fetch.mjs'
import { computeLeagueMetrics } from './helpers/league-metrics-harness.mjs'

installStorage()

/** Derived leagues, so edge cases don't need their own recordings. */
const VARIANTS = {
  'sf-dynasty': { base: 'sf-dynasty' },
  '1qb-dynasty': { base: '1qb-dynasty' },
  'redraft-1qb': { base: 'redraft-1qb' },
  // A 2QB league with no SUPER_FLEX slot: the competing superflex rules disagree here.
  // `tradeInventory` stays as recorded (it's computed server-side from the real league).
  '2qb-synthetic': {
    base: 'sf-dynasty',
    transform: (key, body) =>
      /\/league\/fixture-sf-dynasty$/.test(key)
        ? {
            ...body,
            roster_positions: body.roster_positions.map((s) => (s === 'SUPER_FLEX' ? 'QB' : s)),
          }
        : body,
  },
  // No games decided and no points scored, as right after a dynasty season rolls over.
  // The NFL week is left as recorded: changing it changes which requests the code makes,
  // which a derived variant can't replay. Zero completed games is what drives P0-2.
  preseason: {
    base: 'sf-dynasty',
    transform: (key, body) => {
      if (key.endsWith('/rosters'))
        return body.map((r) => ({
          ...r,
          settings: {
            ...r.settings,
            wins: 0,
            losses: 0,
            ties: 0,
            fpts: 0,
            fpts_decimal: 0,
            fpts_against: 0,
          },
        }))
      if (key.includes('/matchups/'))
        return body.map((m) => ({
          ...m,
          points: 0,
          custom_points: null,
          players_points: {},
          starters_points: [],
        }))
      return body
    },
  },
}

// Missing inputs (R1-5): one team has no known ages, one has no matchups (so no Max PF),
// and players named A–C have no KTC value. Each must show as missing, not as an extreme.
const SF = loadFixture('sf-dynasty').requests
const NO_AGES = new Set(
  SF['https://api.sleeper.app/v1/league/fixture-sf-dynasty/rosters'].body.find(
    (r) => r.roster_id === 3
  ).players
)
const NO_MAX_PF = 5
const SF_PLAYERS = SF['https://api.sleeper.app/v1/players/nfl'].body
const noKtc = (name) => /^[A-C]/.test(name)
VARIANTS['missing-data'] = {
  base: 'sf-dynasty',
  transform: (key, body) => {
    if (key === 'https://api.sleeper.app/v1/players/nfl')
      return Object.fromEntries(
        Object.entries(body).map(([id, p]) => [id, NO_AGES.has(id) ? { ...p, age: null } : p])
      )
    if (key.includes('/matchups/')) return body.filter((m) => m.roster_id !== NO_MAX_PF)
    if (key.startsWith('/api/ktc-values?sleeperIds=')) {
      // Values arrive by Sleeper id (PR-19); drop them by the player's name.
      const keep = ([id]) => !noKtc(SF_PLAYERS[id]?.full_name ?? '')
      return {
        ...body,
        history: Object.fromEntries(Object.entries(body.history).filter(keep)),
        latest: Object.fromEntries(Object.entries(body.latest).filter(keep)),
      }
    }
    return body
  },
}

const goldenDir = new URL('./golden/', import.meta.url)

for (const [name, { base, transform }] of Object.entries(VARIANTS)) {
  test(`golden metrics: ${name}`, async () => {
    const fixture = loadFixture(base)
    const misses = installReplay(fixture, transform)
    const metrics = await computeLeagueMetrics(fixture.leagueId)
    assert.deepEqual(misses, [], 'the code requested something the fixture did not record')
    // One dynasty value (D1): Overview, My Team and the Outlook rank every team the same.
    for (const [rosterId, team] of Object.entries(metrics.teams))
      assert.equal(
        team.dynastyRank.outlook,
        team.dynastyRank.teamValue,
        `team ${rosterId}: Outlook and dynasty rank disagree`
      )
    // One draft-slot policy (D2): the default slots are the board's slots for that basis.
    const { policy } = metrics.draftOrder
    for (const [rosterId, slot] of Object.entries(policy.slots))
      assert.equal(
        metrics.draftOrder[policy.basis][rosterId],
        `1.${String(slot).padStart(2, '0')}`,
        `team ${rosterId}: default slot differs from the ${policy.basis} board`
      )
    // Same inputs, same outputs: run twice and require identical results.
    installReplay(fixture, transform)
    assert.deepEqual(
      await computeLeagueMetrics(fixture.leagueId),
      metrics,
      'metrics are not deterministic'
    )

    const file = new URL(`${name}.json`, goldenDir)
    const actual = JSON.stringify(metrics, null, 2) + '\n'
    if (process.env.UPDATE_GOLDEN === '1' || !existsSync(file)) {
      mkdirSync(goldenDir, { recursive: true })
      writeFileSync(file, actual)
      return
    }
    assert.deepEqual(JSON.parse(actual), JSON.parse(readFileSync(file, 'utf8')))
  })
}
