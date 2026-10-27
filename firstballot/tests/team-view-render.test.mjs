import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
globalThis.WebSocket ??= class {}
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test'
process.env.SUPABASE_URL ??= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test'
const { RosterSection } = await import('../components/league-buddy/RosterSection.tsx')
const { AuthProvider } = await import('../lib/auth.tsx')
const { HeatBadge, TierBadge } = await import('../components/league-buddy/ui/Badge.tsx')

const player = (id, position, extra = {}) => ({
  playerId: id, playerName: `Player ${id}`, position, team: 'DAL', age: 25, rank: 10, tier: 'Elite (Tier 1)',
  tierNumber: 1, tierEmphasis: 'strong', tierScore: 88, tierRank: 3, tierPositionRank: 4, ktcValueSf: 8000,
  ktcDelta30: 700, status: 'Active', experience: 3, ...extra,
})
const team = {
  rosterId: 1, teamName: 'Mine', wins: 5, losses: 3, ties: 0, grade: 'B+',
  starters: ['a', 'b'], players: [player('a', 'WR'), player('b', 'RB', { tierNumber: 7, ktcDelta30: -600 }), player('c', 'QB', { tierNumber: 5 })],
}

test('badges follow the card rules', () => {
  assert.match(renderToStaticMarkup(React.createElement(TierBadge, { tierNumber: 1, position: 'WR', positionRank: 4 })), /Elite WR1/)
  assert.equal(renderToStaticMarkup(React.createElement(TierBadge, { tierNumber: 5, position: 'WR' })), '')
  assert.match(renderToStaticMarkup(React.createElement(HeatBadge, { delta30: 700 })), /🔥/)
  assert.match(renderToStaticMarkup(React.createElement(HeatBadge, { delta30: -600 })), /❄️/)
  assert.equal(renderToStaticMarkup(React.createElement(HeatBadge, { delta30: 100 })), '')
})

test('My Team renders the hero, starters rail and roster rows', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(RosterSection, {
        leagueId: '1', isDynasty: true, selectedTeam: team, sortedTeams: [team], teams: [team],
      })
    )
  )
  assert.match(html, /Team snapshot/)
  assert.match(html, /Starting lineup/)
  assert.match(html, /Player a/)
  assert.match(html, /Elite WR1/)
  assert.match(html, /Scout your next class/)
})
