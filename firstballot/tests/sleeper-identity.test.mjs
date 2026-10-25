import test from 'node:test'
import assert from 'node:assert/strict'
import { sleeperTokenIdentity } from '../lib/sleeper-sdk/token-identity.ts'
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
