import test from 'node:test'
import assert from 'node:assert/strict'
import { assessDraftCapital } from '../lib/team-timeline.ts'
import { validateScenarios } from '../lib/team-scenarios.ts'
import { packageOpportunities, valueOpportunities } from '../lib/sleeper-sdk/trade-opportunities.ts'

const target = (id, year) => ({ id: `prospect:${id}`, name: `P${id}`, position: 'WR', team: 'U', image: null, kind: 'draft', year })
const picks = [
  { id: '2027:1:2', season: '2027', round: 1, roster_id: 2, owner_id: 1 },
  { id: '2027:2:1', season: '2027', round: 2, roster_id: 1, owner_id: 1 },
]
const prospects = [{ id: 1, overall_rank: 1 }, { id: 2, overall_rank: 15 }]

test('a manual pairing spends that pick and automatic allocation works around it', () => {
  // Auto would give the early 1st (slot 2) to prospect 1; the user pins prospect 1 to the 2nd.
  const fits = assessDraftCapital(
    [target(1, 2027), target(2, 2027)], prospects, picks, { 1: 4, 2: 2 }, 10, [2027],
    { '2027:2:1': 'prospect:1' }
  )
  const one = fits.find((f) => f.targetId === 'prospect:1')
  const two = fits.find((f) => f.targetId === 'prospect:2')
  assert.equal(one.pick.id, '2027:2:1')
  assert.equal(one.status, 'trade-up')
  assert.equal(two.pick.id, '2027:1:2')
  assert.equal(new Set(fits.map((f) => f.pick.id)).size, 2)
})

test('a pairing for a pick the user does not own, or a wrong year, is ignored', () => {
  const fits = assessDraftCapital(
    [target(1, 2027)], prospects, picks, { 1: 4, 2: 2 }, 10, [2027],
    { '2027:3:9': 'prospect:1', '2028:1:2': 'prospect:1' }
  )
  assert.equal(fits[0].pick.id, '2027:1:2')
})

test('pick assignments are validated', () => {
  const base = { id: 'p', name: 'Plan', notes: '', targets: [target(1, 2027)], outgoing: [] }
  assert.equal(validateScenarios([{ ...base, pickAssignments: { '2027:1:2': 'prospect:1' } }]), true)
  assert.equal(validateScenarios([{ ...base, pickAssignments: { bad: 'prospect:1' } }]), false)
  assert.equal(validateScenarios([{ ...base, pickAssignments: { '2027:1:2': 'nfl:1' } }]), false)
})

const player = (id, position, value, team = 'X') => ({
  playerId: id, playerName: id, position, team, ktcValueSf: value, ktcValue1qb: value,
})
const roster = (rosterId, players) => ({ rosterId, teamName: `T${rosterId}`, players })

test('package ideas match the combined value and skip far-off players', () => {
  const mine = roster(1, [player('a', 'WR', 3000), player('b', 'RB', 2000), player('c', 'QB', 6000)])
  const other = roster(2, [player('near', 'WR', 5100), player('far', 'WR', 9000), player('tiny', 'WR', 800)])
  const ideas = packageOpportunities([mine.players[0], mine.players[1]], mine, [mine, other], true)
  assert.deepEqual(ideas.map((i) => i.target.playerId), ['near'])
})

test('value ideas return nothing when there is no value to spend', () => {
  const mine = roster(1, [])
  assert.deepEqual(valueOpportunities({ value: 0, positions: [] }, mine, [mine], true), [])
})
