import test from 'node:test'
import assert from 'node:assert/strict'
import {currentSeasonStats} from '../lib/current-season-stats.ts'
const stat=(points,games,extra={})=>({seasonId:2026,statSourceId:0,statSplitTypeId:0,scoringPeriodId:0,appliedTotal:points,stats:{210:games},...extra})
const player=(id,pos,stats)=>({id,defaultPositionId:pos,fullName:String(id),stats})
test('actual current-season points and played games only; projections and old rows excluded',()=>{
 const rows=currentSeasonStats([player(1,2,[stat(1000,18,{statSourceId:1}),stat(200,17,{seasonId:2025}),stat(138,5)])],2026)
 assert.equal(rows['1'].ppg,27.6);assert.equal(rows['1'].games,5)
})
test('rank uses FPPG rather than totals and ties share competition rank',()=>{
 const rows=currentSeasonStats([player(1,2,[stat(100,10)]),player(2,2,[stat(60,3)]),player(3,2,[stat(40,2)]),player(4,3,[stat(1,1)])],2026)
 assert.equal(rows['1'].rank,3);assert.equal(rows['2'].rank,1);assert.equal(rows['3'].rank,1);assert.equal(rows['4'].rank,1)
})
test('missing or zero games never yield invented zero FPPG/rank; played zero is valid',()=>{
 const rows=currentSeasonStats([player(1,2,[stat(0,0)]),player(2,2,[stat(0,1)]),player(3,2,[stat(10,1,{scoringPeriodId:1})])],2026)
 assert.equal(rows['1'],undefined);assert.equal(rows['2'].ppg,0);assert.equal(rows['3'],undefined)
})
