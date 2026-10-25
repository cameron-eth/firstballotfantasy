import test from 'node:test'
import assert from 'node:assert/strict'
import { activeDismissals, DISMISSAL_TTL } from '../components/league-buddy/trades/useTradeDismissals.ts'
import { suggestedTeamTrades } from '../lib/sleeper-sdk/trade-opportunities.ts'
test('dismissals expire at 24 hours and reject malformed or future timestamps', () => {
 const now = 2 * DISMISSAL_TTL
 assert.deepEqual(activeDismissals({ recent: now - 1, boundary: now - DISMISSAL_TTL, old: 0, future: now + 1, bad: '123' }, now), { recent: now - 1 })
 assert.deepEqual(activeDismissals(null, now), {})
 assert.deepEqual(activeDismissals([], now), {})
})
test('dismissing an offer allows replacement candidates rather than leaving a vacant slot', () => {
 const p=(id,position)=>({playerId:id,playerName:id,position,ktcValueSf:3000})
 const mine={rosterId:1,players:[p('a','WR'),p('b','WR'),p('c','WR'),p('d','RB')]}
 const other={rosterId:2,players:[p('e','RB'),p('f','RB'),p('g','RB'),p('h','WR')]}
 const original=suggestedTeamTrades(mine,[mine,other],true)
 const key=`${original[0].give.playerId}:${original[0].target.playerId}:2`
 const next=suggestedTeamTrades(mine,[mine,other],true,[key])
 assert.equal(next.length,original.length)
 assert.ok(next.every(s=>`${s.give.playerId}:${s.target.playerId}:2`!==key))
})
