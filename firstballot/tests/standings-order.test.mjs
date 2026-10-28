import test from 'node:test'
import assert from 'node:assert/strict'
import { compareStandings, sleeperPoints, standingsOrder, winPct } from '../lib/league-metrics/standings.ts'
import { recordOrder } from '../components/league-buddy/utils.ts'
import { calculatePlayoffOdds } from '../components/league-buddy/utils/playoffOdds.ts'
import { buildDraftOrder } from '../components/league-buddy/draft-order/draftOrderBoard.ts'

const team = (rosterId, wins, losses, ties, pointsFor) => ({
  rosterId, teamName: `T${rosterId}`, wins, losses, ties, pointsFor, pointsAgainst: 0, players: [],
})

// Every tiebreak in one league: a tie game, equal records split by points, equal integer
// points split only by Sleeper's decimals, and two identical teams split by roster id.
const TIES = [
  team(1, 5, 5, 0, sleeperPoints(1200, 10)),
  team(2, 5, 4, 1, sleeperPoints(1100, 0)), // 5.5 wins beats 5-5 despite fewer points
  team(3, 6, 4, 0, sleeperPoints(1200, 40)),
  team(4, 6, 4, 0, sleeperPoints(1200, 90)), // same integer PF as 3, more decimals
  team(5, 3, 7, 0, sleeperPoints(1000, 0)),
  team(6, 3, 7, 0, sleeperPoints(1000, 0)), // identical to 5
]
const EXPECTED = [4, 3, 2, 1, 5, 6]

test('ties count as half a win and decimals break equal points', () => {
  assert.equal(winPct(TIES[1]), 0.55)
  assert.equal(sleeperPoints(1200, 90), 1200.9)
  assert.deepEqual(standingsOrder(TIES).map((t) => t.rosterId), EXPECTED)
  assert.ok(compareStandings(TIES[4], TIES[5]) < 0, 'identical teams fall back to roster id')
})

test('standings, playoff odds and the draft record order agree on the tie league', () => {
  // Input order must not matter.
  const shuffled = [TIES[5], TIES[2], TIES[0], TIES[4], TIES[3], TIES[1]]
  assert.deepEqual(recordOrder(shuffled).map((t) => t.rosterId), EXPECTED)

  // A finished season takes the final-standings path.
  const odds = calculatePlayoffOdds(shuffled, 14, 14, 3)
  assert.deepEqual(odds.map((o) => o.rosterId), EXPECTED)
  assert.deepEqual(odds.map((o) => o.playoffProbability), [100, 100, 100, 0, 0, 0])

  const draft = buildDraftOrder(shuffled, {}, {}, 'record')
  assert.deepEqual(draft.map((row) => row.rosterId), [...EXPECTED].reverse())
})
