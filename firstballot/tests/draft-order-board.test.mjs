import test from 'node:test'
import assert from 'node:assert/strict'

const { buildDraftOrder, alternateMetric, formatGap, formatRecord } = await import(
  '../components/league-buddy/draft-order/draftOrderBoard.ts'
)

const team = (rosterId, teamName, wins, losses, pointsFor) => ({
  rosterId,
  teamName,
  wins,
  losses,
  ties: 0,
  pointsFor,
})

// Worst record is roster 3; worst realized Max PF is roster 1; worst projection is 3.
const TEAMS = [team(1, 'Alpha', 1, 3, 300), team(2, 'Bravo', 3, 1, 500), team(3, 'Charlie', 0, 4, 250)]
const MAX_PF = {
  1: { rosterId: 1, maxPointsFor: 400, actualPointsFor: 300, pointsLeftOnBench: 100, lineupEfficiency: 0.75, weeksCounted: 4 },
  2: { rosterId: 2, maxPointsFor: 600, actualPointsFor: 500, pointsLeftOnBench: 100, lineupEfficiency: 0.83, weeksCounted: 4 },
  3: { rosterId: 3, maxPointsFor: 500, actualPointsFor: 250, pointsLeftOnBench: 250, lineupEfficiency: 0.5, weeksCounted: 4 },
}
const PROJECTED = { 1: 1200, 2: 1500, 3: 1000 }

test('record orders worst-first, so the worst team holds the 1.01', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'record')
  assert.deepEqual(rows.map((r) => r.teamName), ['Charlie', 'Alpha', 'Bravo'])
  assert.equal(rows[0].label, '1.01')
  assert.equal(rows[2].label, '1.03')
})

test('Max PF can hand the 1.01 to a different team than record does', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'maxpf')
  // Charlie has the worst record but Alpha has the lowest ceiling.
  assert.equal(rows[0].teamName, 'Alpha')
  assert.equal(rows[0].maxPointsFor, 400)
})

test('the projected board ranks on projected season-end Max PF', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'projected')
  assert.deepEqual(rows.map((r) => r.teamName), ['Charlie', 'Alpha', 'Bravo'])
  assert.equal(rows[0].projectedMaxPointsFor, 1000)
})

test('the comparison column pairs record against Max PF, and projected against today', () => {
  assert.equal(alternateMetric('record'), 'maxpf')
  assert.equal(alternateMetric('maxpf'), 'record')
  // The point of the projected view is "where it stands now" vs "where it finishes".
  assert.equal(alternateMetric('projected'), 'maxpf')
})

test('the comparison column reports the pick under that other metric', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'projected')
  const charlie = rows.find((r) => r.teamName === 'Charlie')
  // Charlie projects 1.01 but sits 1.02 on today's Max PF.
  assert.equal(charlie.label, '1.01')
  assert.equal(charlie.altLabel, '1.02')
})

test('record ties break on points scored, so the lower scorer drafts earlier', () => {
  const tied = [team(1, 'Low', 2, 2, 100), team(2, 'High', 2, 2, 900)]
  const maxPf = {
    1: { rosterId: 1, maxPointsFor: 0, actualPointsFor: 100, pointsLeftOnBench: 0, lineupEfficiency: 0, weeksCounted: 4 },
    2: { rosterId: 2, maxPointsFor: 0, actualPointsFor: 900, pointsLeftOnBench: 0, lineupEfficiency: 0, weeksCounted: 4 },
  }
  const rows = buildDraftOrder(tied, maxPf, {}, 'record')
  assert.equal(rows[0].teamName, 'Low')
})

test('the leader holds the pick and everyone else trails it', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'maxpf')
  assert.equal(formatGap(rows[0], 'maxpf'), 'holds 1.01')
  assert.equal(formatGap(rows[1], 'maxpf'), '+100.0 pts')
  assert.equal(rows[0].raceShare, 1)
})

test('record gaps are phrased in wins, not win percentage', () => {
  const rows = buildDraftOrder(TEAMS, MAX_PF, PROJECTED, 'record')
  assert.equal(formatGap(rows[1], 'record'), '+1 win')
})

test('records render with ties only when there are ties', () => {
  assert.equal(formatRecord(3, 1, 0), '3-1')
  assert.equal(formatRecord(3, 1, 1), '3-1-1')
})
