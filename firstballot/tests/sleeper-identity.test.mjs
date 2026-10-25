import test from 'node:test'
import assert from 'node:assert/strict'
import { sleeperTokenIdentity, sleeperConnectionStatus, normalizeSleeperToken } from '../lib/sleeper-sdk/token-identity.ts'
import { ownsRoster } from '../lib/sleeper-sdk/actions.ts'
const token = payload => `header.${Buffer.from(payload).toString('base64url')}.signature`
test('numeric Sleeper Snowflakes retain every digit for ownership checks',()=>{
 const id='1015846922424725504'
 const payload=`{"user_id":${id},"exp":1824477188}`
 assert.notEqual(String(JSON.parse(payload).user_id),id)
 const decoded=sleeperTokenIdentity(token(payload))
 assert.equal(decoded.user_id,id)
 assert.equal(ownsRoster({roster_id:1,owner_id:id},decoded.user_id),true)
 assert.equal(decoded.exp,1824477188)
})
test('quoted IDs work and numeric text inside strings is untouched',()=>{
 const payload=JSON.stringify({user_id:'1015846922424725504',exp:1824477188,display_name:'Text "user_id":9999999999999999999'})
 assert.equal(sleeperTokenIdentity(token(payload)).user_id,'1015846922424725504')
 assert.throws(()=>sleeperTokenIdentity(token('{"user_id":1.5,"exp":1824477188}')))
 assert.throws(()=>sleeperTokenIdentity('invalid'))
})

test('saved status is account-scoped, preserves expired state and never returns a token',()=>{
 const saved=token('{"user_id":1015846922424725504,"exp":2000000000}')
 assert.deepEqual(sleeperConnectionStatus(null),{saved:false})
 assert.equal(sleeperConnectionStatus(saved,1900000000000).expired,false)
 assert.equal(sleeperConnectionStatus(saved,2100000000000).expired,true)
 assert.equal(sleeperConnectionStatus(saved).saved,true)
 assert.equal(JSON.stringify(sleeperConnectionStatus(saved)).includes(saved),false)
 assert.deepEqual(sleeperConnectionStatus('invalid'),{saved:true,expired:true})
})


test('clipboard wrappers normalize to the raw token sent to Sleeper', () => {
 const raw=token('{"user_id":1015846922424725504,"exp":2000000000}')
 for (const input of [raw, ` Bearer ${raw} `, `Authorization: Bearer ${raw}`, `"${raw}"`, `'${raw}'`]) {
  assert.equal(normalizeSleeperToken(input),raw)
  assert.equal(sleeperTokenIdentity(input).user_id,'1015846922424725504')
 }
})
test('invalid input explains the problem without reflecting credentials', () => {
 assert.throws(()=>normalizeSleeperToken('payload-only'), /three dot-separated parts/)
 assert.throws(()=>normalizeSleeperToken('head.body.sig.extra'), /three dot-separated parts/)
 assert.throws(()=>sleeperTokenIdentity(token('{"iss":"https:\/\/example.supabase.co/auth/v1","sub":"private-id"}')), /First Ballot sign-in token/)
 assert.throws(()=>sleeperTokenIdentity(token('null')), /not a Sleeper/)
 assert.throws(()=>sleeperTokenIdentity(token('{')), /payload is incomplete/)
})
