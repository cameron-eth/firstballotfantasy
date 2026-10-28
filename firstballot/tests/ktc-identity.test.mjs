// PR-19 (audit R4-1): KTC is matched to Sleeper once, by name + position with a team
// tiebreak, and the dashboard reads KTC by Sleeper id, never by display name.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { matchKtcToSleeper, sleeperTeam } from '../lib/ktc-identity.ts'

const sleeper = {
  12547: { full_name: 'Kyle Williams', position: 'WR', team: 'NE' },
  2001: { full_name: 'Kyle Williams', position: 'WR', team: null }, // retired namesake
  4046: { full_name: 'Patrick Mahomes', position: 'QB', team: 'KC' },
  7000: { full_name: 'Marvin Harrison Jr.', position: 'WR', team: 'ARI' },
  8000: { full_name: 'Malik Washington', position: 'WR', team: 'MIA' },
  8001: { full_name: 'Malik Washington', position: 'WR', team: 'MIA' }, // a true duplicate
}
const row = (player_name, position, team) => ({ player_name, position, team })

test('a shared name is settled by team, using KTC team codes', () => {
  assert.equal(sleeperTeam('NEP'), 'NE')
  assert.equal(sleeperTeam('KCC'), 'KC')
  const matched = matchKtcToSleeper([row('Kyle Williams', 'WR', 'NEP'), row('Patrick Mahomes', 'QB', 'KCC')], sleeper)
  assert.deepEqual(matched.map((m) => m.id).sort(), ['12547', '4046'])
})

test('suffixes are ignored; a match that stays ambiguous is left out, not guessed', () => {
  const matched = matchKtcToSleeper([row('Marvin Harrison', 'WR', 'ARI'), row('Malik Washington', 'WR', 'MIA')], sleeper)
  assert.deepEqual(matched.map((m) => m.id), ['7000'])
})

test('a position mismatch never matches', () => {
  assert.deepEqual(matchKtcToSleeper([row('Patrick Mahomes', 'WR', 'KCC')], sleeper), [])
})

test('the dashboard asks KTC by Sleeper id', () => {
  const source = readFileSync(new URL('../components/league-buddy/ktcMaps.ts', import.meta.url), 'utf8')
  assert.match(source, /ktc-values\?sleeperIds=/)
  assert.doesNotMatch(source, /names=/)
})
