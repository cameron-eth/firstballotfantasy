import test from 'node:test'
import assert from 'node:assert/strict'
import {applyFundingPlans,draftFundingIdeas,pickBenchmark} from '../lib/draft-funding.ts'
import {scenarioAtYear} from '../lib/team-timeline.ts'
import {validateScenarios} from '../lib/team-scenarios.ts'
const pick={id:'2027:1:2',season:'2027',round:1,roster_id:2,owner_id:3}
const plan={targetId:'prospect:1',partnerId:3,receivePickId:pick.id,givePlayerIds:['a'],givePickIds:[]}
const player=(id,ppg,value)=>({playerId:id,playerName:id,position:'WR',fantasy_ppg:ppg,games_played:4,ktcValueSf:value})
const mine={rosterId:1,teamName:'Mine',players:[player('a',20,5000),player('b',10,4800),player('c',2,100)]}
const teams=[mine,{rosterId:2,teamName:'Original',players:[]},{rosterId:3,teamName:'Holder',players:[]}]
test('funding follows current holder, keeps original projected slot, and does not mutate inventory',()=>{
 const result=applyFundingPlans([pick],[plan],1)
 assert.equal(result.picks[0].owner_id,1)
 assert.equal(result.picks[0].roster_id,2)
 assert.equal(pick.owner_id,3)
 assert.equal(pickBenchmark(pick,{2:1},12),'2027 Early 1st')
 assert.equal(applyFundingPlans([pick],[{...plan,partnerId:2}],1).accepted.length,0)
 assert.equal(applyFundingPlans([pick],[plan,plan],1).accepted.length,1)
})
test('funding ideas price the real early pick and prefer a lower lineup cost; never invent prices or slots',()=>{
 const args={targetId:'prospect:1',year:2027,rank:1,mine,teams,picks:[pick],slots:{2:1},quotes:[{player_name:'2027 Early 1st',value_sf:5000,value_1qb:4000,scraped_date:'2026-10-25'}],superflex:true,rawSlots:['WR']}
 const ideas=draftFundingIdeas(args)
 assert.ok(ideas.length)
 assert.equal(ideas[0].plan.partnerId,3)
 assert.equal(ideas[0].loss,0)
 assert.ok(ideas.some(i=>i.loss>0))
 assert.deepEqual(draftFundingIdeas({...args,quotes:[]}),[])
 assert.deepEqual(draftFundingIdeas({...args,slots:{}}),[])
 assert.deepEqual(draftFundingIdeas({...args,slots:{2:2}}),[])
 assert.ok(draftFundingIdeas({...args,excludedPlayers:['b']}).every(i=>!i.plan.givePlayerIds.includes('b')))
})
test('saved simulations remove funding players from the what-if roster and undo restores them',()=>{
 const s={id:'plan',name:'Plan',notes:'',outgoing:[],targets:[{id:'prospect:1',name:'Rookie',kind:'draft',year:2027,position:'WR',team:'College',image:null}],fundingPlans:[plan]}
 assert.equal(validateScenarios([s]),true)
 assert.deepEqual(scenarioAtYear(s,2027,2026).outgoing,['a'])
 assert.deepEqual(scenarioAtYear({...s,fundingPlans:[]},2027,2026).outgoing,[])
 assert.equal(validateScenarios([{...s,fundingPlans:[{...plan,receivePickId:'invalid'}]}]),false)
})
