import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDraftOrder } from '../components/league-buddy/draft-order/draftOrderBoard.ts'
import { calculateLeaguePlacements } from '../components/league-buddy/competitiveState.ts'
import { leagueTeamValues } from '../lib/league-metrics/team-value.ts'

const SF = { superflex: true }
const player = (id, age, ktc, rank = 20) => ({
  playerId: id, playerName: id, position: 'WR', age, ktcValueSf: ktc, rank,
})
const team = (rosterId, players, wins = 4) => ({
  rosterId, teamName: `T${rosterId}`, wins, losses: 8 - wins, ties: 0, pointsFor: 800, players,
})

test('a team with no Max PF sorts last instead of taking the 1.01', () => {
  const teams = [team(1, []), team(2, []), team(3, [])]
  const maxPf = { 1: { rosterId: 1, maxPointsFor: 900 }, 2: { rosterId: 2, maxPointsFor: 1000 } }
  const rows = buildDraftOrder(teams, maxPf, {}, 'maxpf')
  assert.deepEqual(rows.map((r) => r.rosterId), [1, 2, 3])
  assert.equal(rows[2].maxPointsFor, null)
  assert.equal(rows[2].raceShare, 0)
})

test('a team with no known ages sits at the league median, not the youngest', () => {
  const teams = [
    team(1, [player('a', 24, 5000)]),
    team(2, [player('b', 28, 5000)]),
    team(3, [player('c', 32, 5000)]),
    team(4, [player('d', null, 5000)]),
  ]
  const { placements } = calculateLeaguePlacements(teams, false, SF)
  assert.equal(placements[4].ageKnown, false)
  assert.equal(placements[4].futureScore, placements[2].futureScore)
  assert.ok(placements[4].futureScore < placements[1].futureScore)
})

test('players without KTC are counted as estimated from rank', () => {
  const values = leagueTeamValues([team(1, [player('a', 25, 5000), player('b', 25, undefined)])], SF)
  assert.equal(values.get(1).estimated, 1)
})
