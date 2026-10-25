import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tradeHeat,tradeOperation,lineupOperation,ownsRoster,tradePlayersStillOwned,sameLineup} from '../lib/sleeper-sdk/actions.ts'
const rosters=[{roster_id:1,owner_id:'a',players:['one','two']},{roster_id:2,owner_id:'b',co_owners:['c'],players:['three']}]
test('heat counts distinct requesting managers, not repeated offers or outgoing assets',()=>{
 const trades=[{creator:'b',adds:{one:2,three:1},drops:{one:1,three:2}},{creator:'b',adds:{one:2},drops:{one:1}},{creator:'c',adds:{one:2},drops:{one:1}}]
 assert.deepEqual(tradeHeat(trades,rosters),{one:2})
})
test('unknown creators and self transfers do not inflate heat',()=>{
 assert.deepEqual(tradeHeat([{creator:'a',adds:{one:1},drops:{one:1}},{creator:'unknown',adds:{two:2},drops:{two:1}}],rosters),{})
})
test('trade payload maps outgoing assets to receiving roster correctly',()=>{
 const op=tradeOperation('123',1,2,['one','two'],['three'])
 assert.deepEqual(op.variables.v_adds,[2,2,1]);assert.deepEqual(op.variables.v_drops,[1,1,2])
 assert.throws(()=>tradeOperation('123',1,1,['one'],['two']))
 assert.throws(()=>tradeOperation('123',1,2,['one'],['one']))
})
test('ownership includes co-owners but rejects unrelated users and moved players',()=>{
 assert.equal(ownsRoster(rosters[1],'c'),true);assert.equal(ownsRoster(rosters[1],'a'),false)
 assert.equal(tradePlayersStillOwned(rosters[0],rosters[1],['one'],['three']),true)
 assert.equal(tradePlayersStillOwned(rosters[0],rosters[1],['three'],['one']),false)
})
test('lineup review must match current slot order and reject missing snapshots',()=>{
 assert.equal(sameLineup(['one','two'],['one','two']),true)
 assert.equal(sameLineup(['one','two'],['two','one']),false)
 assert.equal(sameLineup(undefined,undefined),false)
})
test('lineup operation rejects injection, invalid week and duplicate starters',()=>{
 assert.throws(()=>lineupOperation('12"',1,7,['one']))
 assert.throws(()=>lineupOperation('123',1,19,['one']))
 assert.throws(()=>lineupOperation('123',1,7,['one','one']))
 const op=lineupOperation('123',1,7,['one','DEN'])
 assert.match(op.query,/leg: 7/);assert.match(op.query,/"DEN"/)
})
