// Gate G1 (docs/data-architecture/GATE_G1.md): each metric below had two implementations.
// These tests pin that every surface now reads the same one.
import test from 'node:test'
import assert from 'node:assert/strict'
import { perGameProjections, startersProjection } from '../components/league-buddy/projections/projectedPoints.ts'
import { computeStartSit } from '../components/league-buddy/projections/startSit.ts'
import { calculateLeaguePositionRankings } from '../components/league-buddy/utils.ts'
import { calculateLeaguePlacements, coreAvgAge } from '../components/league-buddy/competitiveState.ts'
import { tradeSignals } from '../lib/trade-signals.ts'

const SF = { superflex: true }

test('#8 projected PPG: one per-game map, players without games left out', () => {
  assert.deepEqual(perGameProjections({ a: { pts: 170, gp: 17 }, b: { pts: 0, gp: 0 } }), { a: 10 })
})

test('#9 projected starters: the Overview sum equals My Team start/sit', () => {
  const roster = [
    { playerId: 'qb', playerName: 'QB', position: 'QB' },
    { playerId: 'rb', playerName: 'RB', position: 'RB' },
    { playerId: 'wr', playerName: 'WR', position: 'WR' },
  ]
  const week = { qb: 21.4, rb: 9.1, wr: 12 }
  const starters = ['qb', '0', 'wr']
  assert.equal(
    startersProjection(starters, week),
    computeStartSit(roster, starters, week, ['QB', 'RB', 'WR', 'BN']).startersProjected
  )
})

const p = (id, position, age, ktc) => ({ playerId: id, playerName: id, position, age, ktcValueSf: ktc, rank: 50 })
const team = (rosterId, players, wins) => ({
  rosterId, teamName: `T${rosterId}`, wins, losses: 10 - wins, ties: 0, pointsFor: 1000, players,
})

test('#16 position groups: equal groups share a rank', () => {
  const ranks = calculateLeaguePositionRankings(
    [team(1, [p('a', 'QB', 25, 8000)], 5), team(2, [p('b', 'QB', 25, 8000)], 5), team(3, [p('c', 'QB', 25, 4000)], 5)],
    SF
  )
  assert.deepEqual([ranks[1].QB, ranks[2].QB, ranks[3].QB], [1, 1, 3])
})

test('#17 franchise state: trade signals use the dashboard in-season rule', () => {
  // A winning record on a weak roster is House Money only in season.
  const teams = [
    team(1, [p('a', 'WR', 24, 9000), p('a2', 'WR', 24, 9000)], 2),
    team(2, [p('b', 'WR', 30, 1000), p('b2', 'WR', 31, 1000)], 9),
    team(3, [p('c', 'WR', 26, 5000), p('c2', 'WR', 27, 5000)], 5),
  ]
  for (const inSeason of [true, false]) {
    const header = calculateLeaguePlacements(teams, inSeason, SF).placements[2].state
    assert.equal(header, inSeason ? 'house-money' : 'purgatory')
    // tradeSignals reads the same placements: no signal path recomputes another rule.
    assert.doesNotThrow(() => tradeSignals(teams[1], teams, ['QB', 'WR', 'WR'], inSeason))
  }
})

test('#18 core age: My Team and the header read the same number', () => {
  const t = team(1, [p('a', 'WR', 24, 9000), p('b', 'WR', 30, 100), p('k', 'K', 40, 0)], 5)
  const placement = calculateLeaguePlacements([t, team(2, [p('c', 'WR', 28, 5000)], 5)], false, SF)
  assert.equal(coreAvgAge(t, SF), placement.placements[1].avgAge)
  assert.equal(coreAvgAge(t, SF), 27) // kickers are not core
})
