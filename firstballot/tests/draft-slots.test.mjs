import test from 'node:test'
import assert from 'node:assert/strict'
import { basisReady, defaultDraftSlotBasis, draftSlots } from '../lib/league-metrics/draft-slots.ts'
import { buildDraftOrder } from '../components/league-buddy/draft-order/draftOrderBoard.ts'

const team = (rosterId, wins, pointsFor) => ({
  rosterId, teamName: `T${rosterId}`, wins, losses: 8 - wins, ties: 0, pointsFor, pointsAgainst: 0, players: [],
})
const TEAMS = [team(1, 6, 900), team(2, 2, 700), team(3, 4, 800), team(4, 4, 750)]
const entry = (rosterId, maxPointsFor) => ({ rosterId, maxPointsFor, actualPointsFor: 0 })
const inputs = (over = {}) => ({
  maxPointsFor: { 1: entry(1, 1000), 2: entry(2, 950), 3: entry(3, 800), 4: entry(4, 900) },
  // Projected order differs from record on purpose: team 3 projects worst.
  projectedMaxPointsFor: { 1: 1800, 2: 1750, 3: 1500, 4: 1700 },
  projectedPerWeek: { 1: 120, 2: 115, 3: 100, 4: 110 },
  weeksCounted: 8,
  remainingWeeks: 6,
  loading: false,
  ...over,
})

test('projected Max PF is the default once every team is projected', () => {
  const d = inputs()
  assert.equal(defaultDraftSlotBasis(TEAMS, d), 'projected')
  const slots = draftSlots(TEAMS, d)
  assert.deepEqual(slots.slotByRoster, { 3: 1, 4: 2, 2: 3, 1: 4 })
  // Same basis, same slots as the board.
  assert.deepEqual(
    buildDraftOrder(TEAMS, d.maxPointsFor, d.projectedMaxPointsFor, 'projected').map((r) => r.rosterId),
    slots.rows.map((r) => r.rosterId)
  )
})

test('a team without player projections falls back to record, which used to be unreachable', () => {
  // Without projections the projected total is just Max PF so far, still > 0 for everyone.
  const d = inputs({ projectedPerWeek: { 1: 120, 2: 0, 3: 100, 4: 110 } })
  assert.equal(basisReady('projected', TEAMS, d), false)
  const slots = draftSlots(TEAMS, d)
  assert.equal(slots.basis, 'record')
  assert.deepEqual(slots.slotByRoster, { 2: 1, 4: 2, 3: 3, 1: 4 })
})

test('after the regular season the projection is the final Max PF', () => {
  const d = inputs({ remainingWeeks: 0, projectedPerWeek: {} })
  assert.equal(defaultDraftSlotBasis(TEAMS, d), 'projected')
})

test('nothing is ready while loading, and Max PF needs a scored week', () => {
  assert.deepEqual(draftSlots(TEAMS, inputs({ loading: true })).slotByRoster, {})
  assert.equal(basisReady('maxpf', TEAMS, inputs({ weeksCounted: 0 })), false)
  assert.equal(basisReady('record', TEAMS, inputs({ weeksCounted: 0 })), true)
})
