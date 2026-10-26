import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDynastyTiers, scoreDynastyPlayer, DYNASTY_TIERS } from '../lib/dynasty-tiers.ts'

const player = (overrides = {}) => ({
  id: '100', name: 'Example', position: 'WR', age: 26, experience: 4,
  draftSelection: 12, draftYear: 2022, ppgRank: 4, games: 7, adp: 12,
  valueSf: 9000, value1qb: 8500, ...overrides,
})

test('published tiers cover all scores without overlapping boundaries', () => {
  for (let i = 0; i < DYNASTY_TIERS.length - 1; i++)
    assert.ok(DYNASTY_TIERS[i].minimum > DYNASTY_TIERS[i + 1].minimum)
  assert.equal(DYNASTY_TIERS.at(-1).minimum, 0)
  assert.equal(scoreDynastyPlayer(player(), 'sf').tier.number, 1)
  assert.equal(scoreDynastyPlayer(player({ valueSf: 20, ppgRank: 80, adp: 260, age: 35, draftSelection: 250 }), 'sf').tier.number, 8)
})

test('missing factors do not count as zero; small-game production is excluded', () => {
  const missing = scoreDynastyPlayer(player({ ppgRank: null, games: 0, adp: null, draftSelection: null, age: null }), 'sf')
  assert.equal(missing.score, 90)
  assert.equal(missing.factors.production, null)
  assert.equal(scoreDynastyPlayer(player({ ppgRank: 1, games: 1 }), 'sf').factors.production, null)
})

test('format-specific market values and age/draft factors alter order deterministically', () => {
  const first = player({ id: '1', valueSf: 9000, value1qb: 2000 })
  const second = player({ id: '2', valueSf: 2000, value1qb: 9000 })
  assert.equal(buildDynastyTiers([first, second], 'sf')['1'].rank, 1)
  assert.equal(buildDynastyTiers([first, second], 'one_qb')['2'].rank, 1)
  assert.ok(scoreDynastyPlayer(player({ age: 25, draftSelection: 5 }), 'sf').score >
    scoreDynastyPlayer(player({ age: 35, draftSelection: 200 }), 'sf').score)
})
