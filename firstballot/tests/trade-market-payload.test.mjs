// PR-16 (audit R3-2) and PR-19 (R4-1): the Trade Market sends only the players and
// rankings its trades reference, both keyed by Sleeper id, so the page's numbers come
// from the same entries the full payload would give it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { trimForTrades, referencedPlayerIds } from '../lib/trade-market/payload.ts'
import { processPlayerForTrade } from '../lib/trade-utils.ts'
import { computeTradeAnalytics } from '../components/trade-market/analytics.ts'

const player = (first, last, position = 'WR') => ({ first_name: first, last_name: last, full_name: `${first} ${last}`, position, team: 'DAL' })
const allPlayers = {
  1: player("Ja'Marr", 'Chase'),
  2: player('Malik', 'Washington'),
  3: player('Bijan', 'Robinson', 'RB'),
  4: player('Malik', 'Washington'), // same name, different player
}
const rank = (value) => ({ rank: 10, tier_name: 'Elite (Tier 1)', ktc_value_sf: value })
const rankings = { 1: rank(9000), 2: rank(3000), 3: rank(8500), 4: rank(100) }
const trades = [
  { transaction_id: 't1', type: 'trade', status: 'complete', created: 1, roster_ids: [1, 2], adds: { 1: 1, 3: 2 }, drops: { 1: 2, 3: 1 }, draft_picks: [] },
  { transaction_id: 't2', type: 'trade', status: 'complete', created: 2, roster_ids: [1, 2], adds: { 2: 2 }, drops: { 2: 1 }, draft_picks: [] },
]
const teamMeta = (_l, rosterId) => ({ rosterId, teamName: `T${rosterId}`, ownerName: `O${rosterId}` })
const analyse = (players, ranks) => {
  const cache = new Map([...referencedPlayerIds(trades)].map((id) => [id, processPlayerForTrade(id, players, ranks)]))
  return JSON.stringify([computeTradeAnalytics(trades, players, teamMeta, cache), [...cache]])
}

test('only traded players and their rankings are sent, by id', () => {
  const trimmed = trimForTrades(trades, allPlayers, rankings)
  assert.deepEqual(Object.keys(trimmed.allPlayers).sort(), ['1', '2', '3'])
  assert.deepEqual(Object.keys(trimmed.dynastyRankings).sort(), ['1', '2', '3'])
})

test('two players with the same name keep their own values', () => {
  assert.equal(processPlayerForTrade('2', allPlayers, rankings).value, processPlayerForTrade('2', allPlayers, { 2: rank(3000) }).value)
  assert.notEqual(processPlayerForTrade('2', allPlayers, rankings).value, processPlayerForTrade('4', allPlayers, rankings).value)
})

test('the analytics are identical on the trimmed payload', () => {
  const trimmed = trimForTrades(trades, allPlayers, rankings)
  assert.equal(analyse(trimmed.allPlayers, trimmed.dynastyRankings), analyse(allPlayers, rankings))
})

test('the route requires sign-in and builds rankings by Sleeper id', () => {
  const policy = readFileSync(new URL('../lib/platform/policy.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(policy, /'\/api\/trade-market'/)
  const route = readFileSync(new URL('../app/api/trade-market/route.ts', import.meta.url), 'utf8')
  assert.match(route, /rankingsBySleeper/)
  assert.doesNotMatch(route, /normalizeName|player_name\b.*ktcMap/)
})
