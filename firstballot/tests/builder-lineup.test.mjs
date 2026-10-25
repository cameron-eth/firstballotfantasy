import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSlotLineup} from '../components/league-buddy/builder/slotLineup.ts'
import {validateScenarios} from '../lib/team-scenarios.ts'
const player=(id,position,ppg)=>({id:`nfl:${id}`,position,ppg})
test('league slots seat best unique starters and share only unused backups',()=>{
 const slots=buildSlotLineup(['QB','RB','RB','WR','WR','WR','SUPER_FLEX','BN'],[player('q1','QB',25),player('q2','QB',20),player('q3','QB',10),player('r1','RB',18),player('r2','RB',15),player('r3','RB',9),player('w1','WR',22),player('w2','WR',17),player('w3','WR',14),player('w4','WR',8)])
 assert.deepEqual(slots.map(s=>s.label),['QB1','RB1','RB2','WR1','WR2','WR3','SF1'])
 assert.equal(slots[0].starter.id,'nfl:q1');assert.equal(slots[6].starter.id,'nfl:q2')
 const ids=slots.map(s=>s.starter.id);assert.equal(new Set(ids).size,7)
 assert.ok(slots[1].backups.some(p=>p.id==='nfl:r3'));assert.ok(slots[2].backups.some(p=>p.id==='nfl:r3'))
 assert.ok(slots.every(s=>s.backups.every(p=>!ids.includes(p.id))))
})
test('manual rookie placement removes it from all backup stacks and reoptimizes others',()=>{
 const rookie={id:'prospect:1',position:'WR'}
 const slots=buildSlotLineup(['WR','WR','FLEX'],[player('a','WR',20),player('b','WR',15),player('c','WR',10),rookie],{WR1:rookie.id})
 assert.equal(slots[0].starter.id,rookie.id)
 assert.ok(slots.every(s=>!s.backups.some(p=>p.id===rookie.id)))
 assert.equal(slots[1].starter.id,'nfl:a')
})
test('overlapping flex slots use shared optimal matcher; no guessed default slots',()=>{
 const slots=buildSlotLineup(['WRRB_FLEX','REC_FLEX'],[player('w','WR',30),player('r','RB',20),player('t','TE',10)])
 assert.equal(slots.reduce((sum,s)=>sum+s.starter.ppg,0),50)
 assert.deepEqual(buildSlotLineup([],[]),[])
})
test('saved per-year lineup assignments are validated',()=>{
 const scenario={id:'one',name:'Plan',notes:'',outgoing:[],targets:[],lineups:{2027:{WR1:'prospect:1'}}}
 assert.equal(validateScenarios([scenario]),true)
 assert.equal(validateScenarios([{...scenario,lineups:{2027:{WR1:'bad'}}}]),false)
})
test('multi-position players remain unique across WR and defensive slots',()=>{
 const dual={...player('dual','DB',16),positions:['WR','DB']}
 const slots=buildSlotLineup(['WR','DB','FLEX'],[dual,player('wr','WR',12),player('rb','RB',10)])
 assert.equal(new Set(slots.map(s=>s.starter.id)).size,3)
 assert.equal(slots[1].starter.id,dual.id)
})
