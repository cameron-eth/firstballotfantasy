import test from 'node:test'
import assert from 'node:assert/strict'
import {validateScenarios,plannedPositionCount} from '../lib/team-scenarios.ts'
const scenario=()=>({id:'plan-1',name:'Rebuild',notes:'',outgoing:['1'],targets:[{id:'prospect:7',name:'Prospect',position:'QB',team:'College',image:null,kind:'draft',year:2029}]})
test('planned roster counts remove outgoing players and add targets without changing source roster',()=>{
 const players=[{playerId:'1',position:'QB'},{playerId:'2',position:'QB'}]
 assert.equal(plannedPositionCount('QB',players,scenario()),2)
 assert.equal(plannedPositionCount('WR',players,scenario()),0)
 assert.equal(players.length,2)
})
test('scenario payload rejects unsafe paths, invalid images, duplicates and excessive collections',()=>{
 assert.equal(validateScenarios([scenario()]),true)
 assert.equal(validateScenarios([{...scenario(),id:'../other'}]),false)
 assert.equal(validateScenarios([scenario(),scenario()]),false)
 assert.equal(validateScenarios([{...scenario(),targets:[{...scenario().targets[0],image:'javascript:alert(1)'}]}]),false)
 assert.equal(validateScenarios([{...scenario(),targets:[...scenario().targets,...scenario().targets]}]),false)
 assert.equal(validateScenarios(Array.from({length:13},(_,i)=>({...scenario(),id:String(i)}))),false)
 assert.equal(validateScenarios(null),false)
})
