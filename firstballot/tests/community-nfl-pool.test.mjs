import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { nflCandidates, NFL_POOL_SIZE } from '../lib/community/nfl-pool.ts'

test('the NFL pool is the top skill players by published rank, keyed by Sleeper id', () => {
  const tiers = {
    players: { sf: { 10: { rank: 3 }, 11: { rank: 1 }, 12: { rank: 2 }, 13: { rank: 4 } } },
    identity: {
      10: { name: 'Third', position: 'WR', team: 'DAL', espnId: '100' },
      11: { name: 'First', position: 'QB', team: 'WAS' },
      12: { name: 'Kicker', position: 'K', team: 'BAL' },
      13: { name: 'Free agent', position: 'RB' },
    },
  }
  assert.deepEqual(nflCandidates(tiers), [
    { key: 'nfl:11', name: 'First', position: 'QB', team: 'WAS', image: null, kind: 'nfl' },
    {
      key: 'nfl:10',
      name: 'Third',
      position: 'WR',
      team: 'DAL',
      image: 'https://a.espncdn.com/i/headshots/nfl/players/full/100.png',
      kind: 'nfl',
    },
    { key: 'nfl:13', name: 'Free agent', position: 'RB', team: 'NFL', image: null, kind: 'nfl' },
  ])
})

test('the pool is capped and never reads the writerless dynasty_player_tiers table', async () => {
  const sf = {}
  const identity = {}
  for (let i = 0; i < 300; i++) {
    sf[i] = { rank: i + 1 }
    identity[i] = { name: `P${i}`, position: 'RB' }
  }
  assert.equal(nflCandidates({ players: { sf }, identity }).length, NFL_POOL_SIZE)
  const store = await readFile(new URL('../lib/community/store.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(store, /dynasty_player_tiers/)
})
