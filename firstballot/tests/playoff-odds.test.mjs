import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculatePlayoffOdds,
  playoffOddsSeed,
} from '../components/league-buddy/utils/playoffOdds.ts'

const team = (rosterId, wins, losses, pointsFor) => ({
  rosterId,
  teamName: `Team ${rosterId}`,
  wins,
  losses,
  ties: 0,
  pointsFor,
})
const league = [
  team(1, 6, 1, 900),
  team(2, 5, 2, 870),
  team(3, 4, 3, 820),
  team(4, 3, 4, 790),
  team(5, 2, 5, 760),
  team(6, 1, 6, 700),
]
const schedule = { 8: { 1: 2, 2: 1, 3: 4, 4: 3, 5: 6, 6: 5 } }

test('the same league state always gives the same odds', () => {
  const a = calculatePlayoffOdds(league, 7, 14, 4, schedule)
  const b = calculatePlayoffOdds(league, 7, 14, 4, schedule)
  assert.deepEqual(a, b)
})

test('the seed changes when the league state changes', () => {
  const moved = league.map((t) => (t.rosterId === 6 ? { ...t, wins: 2, losses: 5 } : t))
  assert.notEqual(playoffOddsSeed(league, 7, 14, 4), playoffOddsSeed(moved, 7, 14, 4))
})

test('before any game is decided there are no odds, not 100%/0% in roster order', () => {
  const preseason = league.map((t) => ({ ...t, wins: 0, losses: 0, pointsFor: 0 }))
  assert.deepEqual(calculatePlayoffOdds(preseason, 0, 14, 4), [])
})

test('odds are probabilities that fill every playoff spot', () => {
  const odds = calculatePlayoffOdds(league, 7, 14, 4, schedule)
  const total = odds.reduce((sum, o) => sum + o.playoffProbability, 0)
  assert.ok(odds.every((o) => o.playoffProbability >= 0 && o.playoffProbability <= 100))
  assert.ok(Math.abs(total - 400) < 1e-9, `spots × 100 = 400, got ${total}`)
  assert.ok(Number.isFinite(total))
})

test('a finished season returns final standings unchanged', () => {
  const odds = calculatePlayoffOdds(league, 15, 14, 4)
  assert.deepEqual(
    odds.map((o) => o.playoffProbability),
    [100, 100, 100, 100, 0, 0]
  )
})
