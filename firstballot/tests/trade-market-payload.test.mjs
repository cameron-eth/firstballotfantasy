// PR-16 (audit R3-2): the Trade Market sends only the players and rankings its trades
// reference, and the page's numbers are identical to the full payload's.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { trimForTrades, referencedPlayerIds } from '../lib/trade-market/payload.ts'
import { processPlayerForTrade } from '../lib/trade-utils.ts'
import { computeTradeAnalytics } from '../components/trade-market/analytics.ts'

const player = (first, last, position = 'WR') => ({ first_name: first, last_name: last, full_name: `${first} ${last}`, position, team: 'DAL' })
const allPlayers = {
  1: player('Ja\'Marr', 'Chase'),
  2: player('A.J.', 'Brown'),
  3: player('Bijan', 'Robinson', 'RB'),
  4: player('Unrelated', 'Player'),
}
const rank = (name, value) => ({ rank: 10, name, tier_name: 'Elite (Tier 1)', ktc_value_sf: value })
const rankings = {
  "Ja'Marr Chase": rank("Ja'Marr Chase", 9000),
  'jamarr chase': rank("Ja'Marr Chase", 9000),
  'AJ Brown': rank('AJ Brown', 6000), // stored without periods: matched via a name variation
  'aj brown': rank('AJ Brown', 6000),
  'bijan robinson': rank('Bijan Robinson', 8500),
  'Unrelated Player': rank('Unrelated Player', 100),
}
const trades = [
  { transaction_id: 't1', type: 'trade', status: 'complete', created: 1, roster_ids: [1, 2], adds: { 1: 1, 3: 2 }, drops: { 1: 2, 3: 1 }, draft_picks: [] },
  { transaction_id: 't2', type: 'trade', status: 'complete', created: 2, roster_ids: [1, 2], adds: { 2: 2 }, drops: { 2: 1 }, draft_picks: [] },
]
const teamMeta = (_l, rosterId) => ({ rosterId, teamName: `T${rosterId}`, ownerName: `O${rosterId}` })
const analyse = (players, ranks) => {
  const cache = new Map([...referencedPlayerIds(trades)].map((id) => [id, processPlayerForTrade(id, players, ranks)]))
  return JSON.stringify([computeTradeAnalytics(trades, players, teamMeta, cache), [...cache]])
}

test('only traded players and their rankings are sent', () => {
  const trimmed = trimForTrades(trades, allPlayers, rankings)
  assert.deepEqual(Object.keys(trimmed.allPlayers).sort(), ['1', '2', '3'])
  assert.ok(!('Unrelated Player' in trimmed.dynastyRankings))
  assert.ok('AJ Brown' in trimmed.dynastyRankings, 'a ranking matched by a name variation is kept')
})

test('the analytics are identical on the trimmed payload', () => {
  const trimmed = trimForTrades(trades, allPlayers, rankings)
  assert.equal(analyse(trimmed.allPlayers, trimmed.dynastyRankings), analyse(allPlayers, rankings))
})

test('the route requires sign-in', () => {
  const policy = readFileSync(new URL('../lib/platform/policy.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(policy, /'\/api\/trade-market'/)
})
