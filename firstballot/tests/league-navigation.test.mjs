import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveLeagueSection, withLeagueId } from '../components/league-buddy/navigation.ts'

test('league deep links open the requested workspace section', () => {
  assert.equal(resolveLeagueSection('roster'), 'roster')
  assert.equal(resolveLeagueSection('league'), 'league')
  assert.equal(resolveLeagueSection('matchup'), 'league')
  assert.equal(resolveLeagueSection(null), 'overview')
})

test('quick links retain their tab when league context is added', () => {
  assert.equal(withLeagueId('/scouting-portal?tab=draftboard', '123'), '/scouting-portal?tab=draftboard&leagueId=123')
  assert.equal(withLeagueId('/scouting-portal', null), '/scouting-portal')
})
