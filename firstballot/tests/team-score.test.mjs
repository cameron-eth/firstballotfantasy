import test from 'node:test'
import assert from 'node:assert/strict'
import { qualityWeighted, teamScores, teamValueScore } from '../lib/team-score.ts'

const p = (value, ppg = 0, position = 'WR') => ({
  playerId: `${value}-${ppg}-${Math.random()}`, playerName: 'x', position, ktcValueSf: value,
  fantasy_ppg: ppg, games_played: ppg ? 8 : 0, rank: 999,
})
const team = (rosterId, players) => ({ rosterId, players })

test('a few stars beat a pile of decent players on value', () => {
  const stars = [p(9000), p(9000), p(9000), p(9000), ...Array.from({ length: 8 }, () => p(500))]
  const pile = Array.from({ length: 24 }, () => p(4000))
  // Plain sums say the pile wins (96,000 vs 40,000); the quality score says the stars do.
  assert.ok(teamValueScore(stars) > teamValueScore(pile))
})

test('adding bench junk barely moves a team', () => {
  const base = [p(8000), p(7000), p(6000), p(5000), p(4000), p(3000), p(2000), p(1500), p(1000)]
  const junk = Array.from({ length: 15 }, () => p(300))
  const gain = teamValueScore([...base, ...junk]) - teamValueScore(base)
  assert.ok(gain / teamValueScore(base) < 0.01, `junk added ${gain}`)
})

test('production rewards stars over an even spread with similar total points', () => {
  // Same nine lineup spots, similar raw points (84 vs 81): the team with stars scores higher.
  const stars = qualityWeighted([22, 20, 18, 4, 4, 4, 4, 4, 4], 25)
  const even = qualityWeighted(Array.from({ length: 9 }, () => 9), 25)
  assert.ok(stars > even)
})

test('composite blends value and production and ranks quality first', () => {
  const quality = team(1, [p(9000, 22), p(8500, 20), p(8000, 18), ...Array.from({ length: 6 }, () => p(400, 3))])
  const quantity = team(2, Array.from({ length: 24 }, () => p(3000, 9)))
  const scores = teamScores([quality, quantity])
  assert.ok(scores.get(1).composite > scores.get(2).composite)
  assert.ok(scores.get(1).composite <= 100 && scores.get(2).composite >= 0)
})
