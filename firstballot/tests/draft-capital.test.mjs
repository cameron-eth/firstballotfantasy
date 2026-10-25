import test from 'node:test'
import assert from 'node:assert/strict'
import {draftCapital} from '../lib/sleeper-sdk/draft-capital.ts'
test('draft capital transfers original picks to their latest holder without double counting',()=>{
 const picks=[{season:'2027',round:1,roster_id:1,owner_id:2,previous_owner_id:1},{season:'2027',round:2,roster_id:2,owner_id:1,previous_owner_id:2}]
 const result=draftCapital([1,2],1,[2027,2028],2,picks)
 assert.deepEqual(result[0],{year:2027,total:2,byRound:[{round:1,count:0},{round:2,count:2}]})
 assert.equal(result[1].total,2)
 assert.equal(draftCapital([1,2],2,[2027],2,picks)[0].total,2)
})
