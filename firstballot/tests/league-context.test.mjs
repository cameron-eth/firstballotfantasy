import test from 'node:test'
import assert from 'node:assert/strict'
import { isSuperflexFormat, resolveLeagueContext } from '../lib/league-metrics/context.ts'
import { buildPowerRankings, ktcValue, playerValue } from '../lib/sleeper-sdk/values.ts'
import { loadTradeInventory } from '../lib/sleeper-sdk/trade-inventory.ts'

const ONE_QB = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN']
const SUPER_FLEX = [...ONE_QB.slice(0, 7), 'SUPER_FLEX', 'BN']
const SLEEPER_SF_NAME = [...ONE_QB.slice(0, 7), 'QB/RB/WR/TE', 'BN']
const TWO_QB = ['QB', 'QB', ...ONE_QB.slice(1)]

test('one rule decides the format', () => {
  assert.equal(isSuperflexFormat(ONE_QB), false)
  assert.equal(isSuperflexFormat(SUPER_FLEX), true)
  assert.equal(isSuperflexFormat(SLEEPER_SF_NAME), true)
  assert.equal(isSuperflexFormat(TWO_QB), true)
})

test('a league without slots gets the default lineup, the same one power rankings value', () => {
  assert.equal(resolveLeagueContext({ roster_positions: [] }).superflex, true)
  assert.equal(resolveLeagueContext(null).superflex, true)
  assert.equal(buildPowerRankings([], []).superflex, true)
})

test('power rankings and the trade inventory agree with the rule on every format', async () => {
  const realFetch = globalThis.fetch
  try {
    for (const slots of [ONE_QB, SUPER_FLEX, SLEEPER_SF_NAME, TWO_QB]) {
      globalThis.fetch = async (url) => {
        const path = String(url).split('/league/1')[1]
        const body = {
          '': { season: '2026', roster_positions: slots, settings: { type: 0 } },
          '/rosters': [{ roster_id: 1 }],
          '/traded_picks': [],
          '/drafts': [],
        }[path]
        return new Response(JSON.stringify(body))
      }
      const expected = isSuperflexFormat(slots)
      assert.equal(buildPowerRankings([], slots).superflex, expected, slots.join(','))
      assert.equal((await loadTradeInventory('1')).superflex, expected, slots.join(','))
    }
  } finally {
    globalThis.fetch = realFetch
  }
})

test('values follow the format, with no superflex value standing in for a missing 1QB one', () => {
  const qb = { playerId: '1', playerName: 'QB', position: 'QB', ktcValueSf: 9000, ktcValue1qb: 6000 }
  assert.equal(ktcValue(qb, { superflex: true }), 9000)
  assert.equal(ktcValue(qb, { superflex: false }), 6000)
  const sfOnly = { ...qb, ktcValue1qb: undefined, rank: 10 }
  assert.equal(ktcValue(sfOnly, { superflex: false }), undefined)
  // Falls back to the consensus rank, never to the superflex price.
  assert.notEqual(playerValue(sfOnly, { superflex: false }), 9000)
})
