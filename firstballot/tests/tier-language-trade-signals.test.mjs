import test from 'node:test'
import assert from 'node:assert/strict'
import { describeTier, isCold, isHot, plainTierName, HOT_DELTA } from '../lib/player-signals.ts'
import { buildDynastyTiers } from '../lib/dynasty-tiers.ts'
import { tradeSignals } from '../lib/trade-signals.ts'

test('good and bad players get plain-English labels, the middle gets none', () => {
  assert.equal(describeTier({ tierNumber: 1, position: 'WR', positionRank: 3 }).label, 'Elite WR1')
  assert.equal(describeTier({ tierNumber: 2, position: 'RB', positionRank: 15 }).label, 'Star RB2')
  assert.equal(describeTier({ tierNumber: 3, position: 'TE', positionRank: 30 }).label, 'Strong TE3')
  assert.equal(describeTier({ tierNumber: 1, position: 'QB' }).label, 'Elite QB')
  assert.equal(describeTier({ tierNumber: 7, position: 'WR' }).label, 'Fringe WR')
  assert.equal(describeTier({ tierNumber: 8, position: 'RB' }).label, 'Waiver-level RB')
  for (const n of [4, 5, 6]) assert.equal(describeTier({ tierNumber: n, position: 'WR' }).label, null)
})

test('fire needs a 500-point KTC gain over 30 days', () => {
  assert.equal(HOT_DELTA, 500)
  assert.equal(isHot(500), true)
  assert.equal(isHot(499), false)
  assert.equal(isHot(null), false)
  assert.equal(isCold(-500), true)
  assert.equal(isCold(-499), false)
  assert.equal(isCold(500), false)
})

test('published tiers carry position rank and 30-day change', () => {
  const base = { age: 25, experience: 3, draftSelection: 20, draftYear: 2023, ppgRank: 5, games: 10, adp: 20 }
  const tiers = buildDynastyTiers(
    [
      { id: 'a', name: 'A', position: 'WR', valueSf: 9000, value1qb: 9000, change30Sf: 600, change301qb: -50, ...base },
      { id: 'b', name: 'B', position: 'WR', valueSf: 5000, value1qb: 5000, ...base },
      { id: 'c', name: 'C', position: 'RB', valueSf: 4000, value1qb: 4000, ...base },
    ],
    'sf'
  )
  assert.equal(tiers.a.positionRank, 1)
  assert.equal(tiers.b.positionRank, 2)
  assert.equal(tiers.c.positionRank, 1)
  assert.equal(tiers.a.delta30, 600)
  assert.equal(tiers.b.delta30, null)
})

let n = 0
const player = (position, tierNumber, tierScore, age = 25, extra = {}) => ({
  playerId: `p${++n}`,
  playerName: `${position}${n}`,
  position,
  team: 'XXX',
  age,
  tierNumber,
  tierScore,
  tierPositionRank: 5,
  ktcValueSf: tierScore * 100,
  ktcValue1qb: tierScore * 100,
  ...extra,
})
const team = (rosterId, wins, losses, players) => ({
  rosterId,
  teamName: `Team ${rosterId}`,
  wins,
  losses,
  ties: 0,
  players,
})
const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN']

test('older productive player on a non-competing team is flagged with buyers', () => {
  const old = player('RB', 3, 66, 29)
  const mine = team(1, 1, 11, [player('QB', 4, 55), old, player('RB', 4, 52, 23), player('WR', 4, 54), player('WR', 4, 53), player('TE', 4, 52)])
  const strong = (id, w) => team(id, w, 14 - w, [
    player('QB', 1, 90), player('RB', 1, 85), player('RB', 1, 84), player('WR', 1, 88), player('WR', 1, 87), player('TE', 1, 83), player('WR', 1, 82, 25),
  ])
  const needy = team(3, 11, 3, [player('QB', 1, 90), player('RB', 8, 5), player('RB', 8, 4), player('WR', 1, 88), player('WR', 1, 87), player('TE', 1, 83), player('WR', 1, 82)])
  const out = tradeSignals(mine, [mine, strong(2, 10), needy, strong(4, 9), team(5, 3, 11, [player('QB', 6, 30, 22), player('RB', 6, 30, 22), player('WR', 6, 30, 22)])], slots)
  const signal = out.find((s) => s.playerId === old.playerId)
  assert.ok(signal, 'aging back is flagged')
  assert.equal(signal.kind, 'aging')
  assert.ok(signal.reasons.some((r) => r.includes('29-year-old RB')))
  assert.ok(signal.partners.some((p) => p.teamName === 'Team 3'))
})

test('a contender is not told to dump its older starters', () => {
  const old = player('RB', 2, 74, 30)
  const mine = team(1, 11, 2, [player('QB', 1, 90), old, player('RB', 1, 85), player('WR', 1, 88), player('WR', 1, 87), player('TE', 1, 83), player('WR', 1, 82)])
  const weak = (id) => team(id, 3, 10, [player('QB', 6, 30, 22), player('RB', 6, 30, 22), player('WR', 6, 30, 22), player('TE', 6, 30, 22)])
  const out = tradeSignals(mine, [mine, weak(2), weak(3), weak(4)], slots)
  assert.equal(out.some((s) => s.kind === 'aging'), false)
})

test('benched starter-quality depth is surplus only when a partner fits both sides', () => {
  const spare = player('WR', 3, 63)
  const mine = team(1, 6, 6, [player('QB', 4, 55), player('RB', 4, 52), player('RB', 8, 5), player('WR', 2, 75), player('WR', 2, 74), player('WR', 3, 64), spare, player('TE', 4, 52)])
  const fits = team(2, 6, 6, [player('QB', 4, 55), player('RB', 4, 52), player('RB', 4, 52), player('RB', 3, 63), player('RB', 3, 62), player('WR', 8, 5), player('WR', 8, 4), player('TE', 4, 52)])
  const nofit = team(3, 6, 6, [player('QB', 4, 55), player('RB', 4, 52), player('RB', 4, 51), player('WR', 2, 75), player('WR', 2, 74), player('TE', 4, 52)])
  const matched = tradeSignals(mine, [mine, fits, nofit], slots).find((s) => s.playerId === spare.playerId)
  assert.ok(matched)
  assert.equal(matched.kind, 'surplus')
  assert.deepEqual(matched.partners.map((p) => p.teamName), ['Team 2'])
  assert.equal(tradeSignals(mine, [mine, nofit], slots).some((s) => s.playerId === spare.playerId), false)
})

test('tier tag text drops the numeric suffix', () => {
  assert.equal(plainTierName('Flex / upside (Tier 5)'), 'Flex / upside')
  assert.equal(plainTierName('Elite'), 'Elite')
})
