import test from 'node:test'
import assert from 'node:assert/strict'
import { encryptToken, decryptToken } from '../lib/sleeper-sdk/token-crypto.ts'
import { playerMomentum } from '../lib/player-momentum.ts'
test('saved tokens are randomized, authenticated, and bound to an account',()=>{
 process.env.SLEEPER_TOKEN_ENCRYPTION_KEY='ab'.repeat(32)
 const one=encryptToken('test-token','account-a'), two=encryptToken('test-token','account-a')
 assert.notEqual(one,two);assert.equal(one.includes('test-token'),false)
 assert.equal(decryptToken(one,'account-a'),'test-token')
 assert.throws(()=>decryptToken(one,'account-b'))
 const bad=JSON.parse(one);bad.data=Buffer.from('tampered').toString('base64');assert.throws(()=>decryptToken(JSON.stringify(bad),'account-a'))
 process.env.SLEEPER_TOKEN_ENCRYPTION_KEY='cd'.repeat(32);assert.throws(()=>decryptToken(one,'account-a'))
 delete process.env.SLEEPER_TOKEN_ENCRYPTION_KEY;assert.throws(()=>encryptToken('test','a'))
})
test('momentum requires both fresh KTC and sufficient played games',()=>{
 const h=[{scraped_date:'2026-10-18',value_sf:1000},{scraped_date:'2026-10-25',value_sf:1100}]
 const games=[{week:1,points:10},{week:2,points:10},{week:3,points:15},{week:4,points:15}]
 const now=Date.parse('2026-10-25')
 assert.equal(playerMomentum(h,games,now).score,100)
 assert.equal(playerMomentum(h,[],now).score,null)
 assert.equal(playerMomentum([],games,now).score,null)
 assert.equal(playerMomentum(h,games,now+4*86400000).score,null)
 assert.equal(playerMomentum(h,games.slice(0,3),now).score,null)
 assert.equal(playerMomentum(h.map(p=>({...p,value_sf:1000})),games.map(p=>({...p,points:0})),now).score,50)
})
