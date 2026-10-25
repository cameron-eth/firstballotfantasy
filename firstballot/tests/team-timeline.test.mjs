import test from 'node:test'
import assert from 'node:assert/strict'
import {scenarioAtYear,assessDraftCapital} from '../lib/team-timeline.ts'
import {validateScenarios} from '../lib/team-scenarios.ts'
const target=(id,year)=>({id:`prospect:${id}`,name:`Prospect ${id}`,position:'WR',team:'College',image:null,kind:'draft',year})
const plan={id:'plan',name:'Three year plan',notes:'',targets:[target(1,2027),target(2,2028),{...target(3,2026),id:'nfl:3',kind:'trade',arrivalYear:2028}],outgoing:['old'],departureYears:{old:2028},horizon:2027}
test('timeline adds rookies only in their arrival year and carries them forward',()=>{
 assert.equal(scenarioAtYear(plan,2026,2026).targets.length,0)
 assert.deepEqual(scenarioAtYear(plan,2027,2026).targets.map(t=>t.id),['prospect:1'])
 assert.equal(scenarioAtYear(plan,2028,2026).targets.length,3)
 assert.deepEqual(scenarioAtYear(plan,2027,2026).outgoing,[])
 assert.deepEqual(scenarioAtYear(plan,2028,2026).outgoing,['old'])
 assert.equal(plan.targets.length,3)
})
test('timeline fields survive validation while malformed year maps fail',()=>{
 assert.equal(validateScenarios([plan]),true)
 assert.equal(validateScenarios([{...plan,horizon:'2028'}]),false)
 assert.equal(validateScenarios([{...plan,departureYears:{old:9999}}]),false)
 assert.equal(validateScenarios([{...plan,targets:[{...target(1,2027),arrivalYear:-1}]}]),false)
})
const picks=[{id:'2027:1:2',season:'2027',round:1,roster_id:2,owner_id:1},{id:'2027:2:1',season:'2027',round:2,roster_id:1,owner_id:1}]
test('capital uses original-team slot and never spends one pick twice',()=>{
 const fits=assessDraftCapital([target(1,2027),target(2,2027),target(3,2027)],[{id:1,overall_rank:1},{id:2,overall_rank:15},{id:3,overall_rank:20}],picks,{1:4,2:2},10)
 assert.equal(fits[0].status,'trade-up')
 assert.equal(fits[0].slot,2)
 assert.equal(fits[1].status,'covered')
 assert.equal(fits[1].slot,14)
 assert.equal(fits[2].status,'no-capital')
 assert.equal(new Set(fits.flatMap(f=>f.pick?[f.pick.id]:[])).size,2)
})
test('unranked prospects, missing projections and unsupported years stay uncertain',()=>{
 assert.equal(assessDraftCapital([target(1,2027)],[{id:1,rank:1}],picks,{1:4,2:2},10)[0].status,'unknown')
 assert.equal(assessDraftCapital([target(1,2027)],[{id:1,overall_rank:1}],picks,{},10)[0].status,'unknown')
 assert.equal(assessDraftCapital([target(1,2030)],[{id:1,overall_rank:1}],picks,{1:4,2:2},10)[0].status,'unknown')
 assert.equal(assessDraftCapital([target(1,2027)],[{id:1,overall_rank:1}],[],{1:4,2:2},10,[2027])[0].status,'no-capital')
})
