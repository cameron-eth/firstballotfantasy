import test from 'node:test'
import assert from 'node:assert/strict'
import {communityRatings,dailyPair} from '../lib/community/rating.ts'
const players=[{key:'prospect:a',name:'A',kind:'prospect',position:'WR'},{key:'prospect:b',name:'B',kind:'prospect',position:'WR'},{key:'nfl:c',name:'C',kind:'nfl',position:'WR'},{key:'nfl:d',name:'D',kind:'nfl',position:'QB'}]
const vote=(a,b,winner)=>({version:1,day:'2026-10-25',pool:'dynasty',pair:[a,b],winner})
test('neutral community prior has no fabricated ranks',()=>{
 assert.ok(communityRatings(players,[]).every(p=>p.score===1500&&p.rank===null&&p.comparisons===0))
})
test('repeat preferences change scores; computation is independent of ingestion order',()=>{
 const votes=[...Array.from({length:8},()=>vote('prospect:a','prospect:b','prospect:a')),vote('prospect:a','nfl:c','nfl:c')]
 const ratings=communityRatings(players,votes)
 assert.ok(ratings.find(p=>p.key==='prospect:a').score>ratings.find(p=>p.key==='prospect:b').score)
 assert.equal(ratings.find(p=>p.key==='nfl:c').rank,null)
 assert.deepEqual(ratings,communityRatings(players,[...votes].reverse()))
})
test('ballots always have distinct candidates and dynasty rotations connect pros with prospects',()=>{
 let mixed=false,crossPosition=false
 for(let seed=0;seed<100;seed++){
  const pair=dailyPair(players,seed,'dynasty');assert.notEqual(pair[0].key,pair[1].key)
  assert.ok(pair.some(p=>p.kind==='prospect'))
  mixed ||= pair.some(p=>p.kind==='nfl');crossPosition ||= pair[0].position!==pair[1].position
  assert.ok(dailyPair(players,seed,'nfl').every(p=>p.kind==='nfl'))
 }
 assert.ok(mixed);assert.ok(crossPosition)
})
