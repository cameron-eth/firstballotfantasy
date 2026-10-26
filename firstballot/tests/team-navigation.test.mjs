import test from 'node:test'
import assert from 'node:assert/strict'
import { teamWorkspaceUrl, accountTeamCache } from '../lib/team-navigation.ts'
test('activated team destination is explicit and adapts to desktop-only builder', () => {
  assert.equal(teamWorkspaceUrl('123'), '/league-buddy?tab=builder&leagueId=123')
  assert.equal(teamWorkspaceUrl('123', false), '/league-buddy?tab=roster&leagueId=123')
  assert.equal(accountTeamCache(['active-teams', 'alice', '123'], 'alice'), true)
  assert.equal(accountTeamCache(['teams', 'bob'], 'alice'), false)
  assert.equal(accountTeamCache(['billing', 'alice'], 'alice'), false)
})
