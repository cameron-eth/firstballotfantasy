import test from 'node:test'
import assert from 'node:assert/strict'
import {pickInventory} from '../lib/sleeper-sdk/pick-inventory.ts'
import {validateTradeExtras} from '../lib/sleeper-sdk/trade-assets.ts'
import {tradeOperation} from '../lib/sleeper-sdk/actions.ts'
import {tradeOpportunities} from '../lib/sleeper-sdk/trade-opportunities.ts'
const inventory={picks:pickInventory([1,2],[2027],2,[{season:'2027',round:1,roster_id:1,owner_id:2}]),faab:{1:50,2:25}}
test('inventory applies transfers to original pick identity without duplicating picks',()=>{
 assert.equal(inventory.picks.length,4)
 assert.equal(inventory.picks.find(p=>p.id==='2027:1:1').owner_id,2)
 assert.equal(inventory.picks.filter(p=>p.owner_id===2).length,3)
})
test('pick offer uses SDK comma-separated original, year, round, sender, receiver payload',()=>{
 const assets=validateTradeExtras(1,2,{receivePicks:['2027:1:1'],giveFaab:10},inventory)
 const op=tradeOperation('123',1,2,[],[],assets)
 assert.deepEqual(op.variables.draft_picks,['1,2027,1,2,1'])
 assert.deepEqual(op.variables.waiver_budget,['1-2-10'])
 assert.deepEqual(op.variables.k_adds,[])
 assert.match(op.query,/draft_picks: \$draft_picks/)
})
test('FAAB-only dry-run contains no player or pick offer',()=>{
 const op=tradeOperation('123',1,2,[],[],validateTradeExtras(1,2,{giveFaab:1,receiveFaab:1},inventory))
 assert.deepEqual(op.variables.k_adds,[])
 assert.deepEqual(op.variables.k_drops,[])
 assert.deepEqual(op.variables.draft_picks,[])
 assert.deepEqual(op.variables.waiver_budget,['1-2-1','2-1-1'])
})
test('stale ownership, duplicate picks, unsupported FAAB and excessive budgets are rejected',()=>{
 for(const extras of [{givePicks:['2027:1:1']},{receivePicks:['2027:1:1','2027:1:1']},{givePicks:['2029:1:1']},{giveFaab:51},{giveFaab:-1},{giveFaab:1.5},{giveFaab:'10'}]) assert.throws(()=>validateTradeExtras(1,2,extras,inventory))
 assert.throws(()=>validateTradeExtras(1,2,{giveFaab:1},{...inventory,faab:{1:null}}))
 assert.throws(()=>tradeOperation('123',1,2,[],[],validateTradeExtras(1,2,{},inventory)))
})
test('opportunities respect format values and exclude own roster',()=>{
 const p={playerId:'1',playerName:'Mine',position:'QB',ktcValueSf:5000,ktcValue1qb:1000}
 const mine={rosterId:1,players:[p]}
 const teams=[mine,{rosterId:2,teamName:'Other',players:[{playerId:'2',playerName:'Receiver',position:'WR',ktcValueSf:4900,ktcValue1qb:4000},{playerId:'3',playerName:'Quarterback',position:'QB',ktcValueSf:1000,ktcValue1qb:1100}]}]
 assert.equal(tradeOpportunities(p,mine,teams,true)[0].target.playerId,'2')
 assert.equal(tradeOpportunities(p,mine,teams,false)[0].target.playerId,'3')
 assert.equal(tradeOpportunities(p,mine,teams,true).length,2)
})
test('suggested offers improve our depth without worsening partner balance and avoid duplicated assets',async()=>{
 const {suggestedTeamTrades}=await import('../lib/sleeper-sdk/trade-opportunities.ts')
 const p=(id,pos)=>({playerId:id,playerName:id,position:pos,ktcValueSf:3000})
 const mine={rosterId:1,players:[p('a','WR'),p('b','WR'),p('c','WR'),p('d','RB')]}
 const other={rosterId:2,players:[p('e','RB'),p('f','RB'),p('g','RB'),p('h','WR')]}
 const matches=suggestedTeamTrades(mine,[mine,other],true)
 assert.ok(matches.length>0)
 assert.ok(matches.every(m=>m.give.position==='WR'&&m.target.position==='RB'))
 assert.equal(new Set(matches.map(m=>m.give.playerId)).size,matches.length)
 assert.deepEqual(suggestedTeamTrades(mine,[mine,{...other,players:mine.players.map(p=>({...p,playerId:p.playerId+'2'}))}],true),[])
})
