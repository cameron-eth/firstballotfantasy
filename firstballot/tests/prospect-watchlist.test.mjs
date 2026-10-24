import { test } from 'node:test'
import assert from 'node:assert/strict'
import { curated2029Prospects, missingCurated2029 } from '../lib/curated-prospects.ts'
import { fetchAllProspects } from '../lib/players.ts'

test('2029 fallback adds only missing roster-verified players', () => {
  assert.equal(curated2029Prospects.length, 10)
  assert.deepEqual(
    missingCurated2029([{ name: 'Jesse Legree', draft_year: 2029 }]).map((player) => player.name),
    ['Chris Henry Jr.', 'Legend Glasker', 'Legend Bey', 'Brock Boyd', 'Savion Hiter', 'Dia Bell', 'Derrek Cooper', 'Brady Smigiel', 'Jaeden Ricketts']
  )
})

test('prospect board keeps class rank and displays ungraded players', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [{
      ...curated2029Prospects[0],
      espn_id: null,
      overall_grade: null,
      grade_tier: null,
      tier: null,
      college_stats: null,
      college_production_score: null,
      physical_measurables_score: null,
    }],
  })
  try {
    const players = await fetchAllProspects()
    assert.equal(players.WR.length, 1)
    assert.equal(players.WR[0].positionRank, 'WR1')
    assert.equal(players.WR[0].tier, 'Ungraded')
    assert.equal(players.WR[0].grade, null)
    assert.ok(players.WR[0].headshotUrl)
  } finally {
    globalThis.fetch = previousFetch
  }
})
