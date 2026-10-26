import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { teamCapacity, freshness, isPublicApi, sourceWithinBudget } from '../lib/platform/policy.ts'
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002'
test('expired entitlement and exact public routes fail closed', () => {
  assert.equal(teamCapacity(null), 1)
  assert.equal(teamCapacity({ status: 'active', paid_slots: -1, period_end: '2099-01-01' }), null)
  assert.equal(teamCapacity({ status: 'past_due', paid_slots: -1, period_end: '2099-01-01' }), 1)
  assert.equal(teamCapacity({ status: 'active', paid_slots: 3, period_end: '2099-01-01' }), 4)
  assert.equal(teamCapacity({ status: 'active', paid_slots: 3, period_end: '2020-01-01' }), 1)
  assert.equal(teamCapacity({ status: 'past_due', paid_slots: 3, period_end: '2099-01-01' }), 1)
  assert.equal(freshness('bad', null), 'expired')
  assert.equal(freshness('2099-01-01', null), 'source-time-unknown')
  assert.equal(isPublicApi('/api/prospects'), true)
  assert.equal(isPublicApi('/api/prospects/draftboard'), false)
  assert.equal(isPublicApi('/api/webhooks/anything'), false)
})
test('Postgres enforces account isolation, capacity, webhook idempotency and daily usage', async () => {
  const db = new PGlite()
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`
    )
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/20261026_platform_foundations.sql', import.meta.url),
        'utf8'
      )
    )
    await db.query('insert into auth.users values ($1),($2)', [a, b])
    const ids = []
    for (let n = 1; n <= 2; n++)
      ids.push(
        (
          await db.query(
            `insert into connected_teams(account_id,lineage_id,league_id,roster_id,sleeper_user_id,name,season) values($1,$2,$2,1,'owner','Team',2026) returning id`,
            [a, String(n)]
          )
        ).rows[0].id
      )
    await db.query('select activate_connected_team($1,$2,true)', [a, ids[0]])
    await assert.rejects(
      db.query('select activate_connected_team($1,$2,true)', [a, ids[1]]),
      /TEAM_LIMIT/
    )
    await assert.rejects(
      db.query('select activate_connected_team($1,$2,true)', [b, ids[0]]),
      /TEAM_NOT_FOUND/
    )
    const bill = (id, status) =>
      db.query(
        `select apply_platform_billing($1,$2,'cus_test','sub_test',$3,1,'2099-01-01',false)`,
        [id, a, status]
      )
    await bill('evt1', 'active')
    await db.query('select activate_connected_team($1,$2,true)', [a, ids[1]])
    await bill('evt1', 'canceled')
    assert.equal((await db.query('select status from account_billing')).rows[0].status, 'active')
    await bill('evt2', 'canceled')
    assert.equal(
      (await db.query('select count(*)::int as n from connected_teams where active')).rows[0].n,
      1
    )
    assert.equal((await db.query('select count(*)::int as n from connected_teams')).rows[0].n, 2)
    for (let i = 0; i < 100; i++)
      assert.equal(
        (
          await db.query(
            `select consume_platform_usage($1,gen_random_uuid(),'teams:read','api') as allowed`,
            [a]
          )
        ).rows[0].allowed,
        true
      )
    assert.equal(
      (
        await db.query(
          `select consume_platform_usage($1,gen_random_uuid(),'teams:read','api') as allowed`,
          [a]
        )
      ).rows[0].allowed,
      false
    )
    const request = (await db.query('select request_id from usage_events limit 1')).rows[0]
      .request_id
    assert.equal(
      (
        await db.query(`select consume_platform_usage($1,$2,'teams:read','api') as allowed`, [
          a,
          request,
        ])
      ).rows[0].allowed,
      true
    )
    await db.query(
      `insert into billing_checkout_attempts(account_id,price_id,quantity) values($1,'price_first',1) on conflict(account_id) do nothing`,
      [a]
    )
    await db.query(
      `insert into billing_checkout_attempts(account_id,price_id,quantity) values($1,'price_second',4) on conflict(account_id) do nothing`,
      [a]
    )
    assert.equal(
      (await db.query('select price_id from billing_checkout_attempts')).rows[0].price_id,
      'price_first'
    )
    await db.query(
      `select apply_platform_billing('unlimited',$1,'cus_test','sub_test','active',-1,'2099-01-01',false)`,
      [a]
    )
    await db.query('select activate_connected_team($1,$2,true)', [a, ids[1]])
    // More than the prior five-team bundle must still activate.
    for (let n = 3; n <= 8; n++) {
      const row = await db.query(
        `insert into connected_teams(account_id,lineage_id,league_id,roster_id,sleeper_user_id,name,season) values($1,$2,$2,1,'owner','Team',2026) returning id`,
        [a, String(n)]
      )
      await db.query('select activate_connected_team($1,$2,true)', [a, row.rows[0].id])
    }
    assert.equal(
      (await db.query('select count(*)::int n from connected_teams where active')).rows[0].n,
      8
    )
    await db.query(
      `select apply_platform_billing('unlimited-cancel',$1,'cus_test','sub_test','canceled',-1,'2099-01-01',false)`,
      [a]
    )
    assert.equal(
      (await db.query('select count(*)::int n from connected_teams where active')).rows[0].n,
      1
    )
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${b}'`)
    assert.equal((await db.query('select * from connected_teams')).rows.length, 0)
    await assert.rejects(db.query('select * from api_access_tokens'), /permission denied/)
    await assert.rejects(db.query('select * from billing_feedback'), /permission denied/)
    await assert.rejects(
      db.query('select activate_connected_team($1,$2,true)', [a, ids[1]]),
      /permission denied/
    )
    await db.exec(`set request.jwt.claim.sub='${a}'`)
    assert.equal((await db.query('select * from connected_teams')).rows.length, 8)
    await assert.rejects(db.query('update account_billing set paid_slots=99'), /permission denied/)
  } finally {
    await db.close()
  }
})

test('source timestamps reject invalid, stale and future observations', () => {
  const now = Date.parse('2026-10-26T00:00:00Z')
  assert.equal(sourceWithinBudget('NA', 86400000, now), false)
  assert.equal(sourceWithinBudget('2026-10-24', 86400000, now), false)
  assert.equal(sourceWithinBudget('2026-10-27', 86400000, now), false)
  assert.equal(sourceWithinBudget('2026-10-25T12:00:00Z', 86400000, now), true)
})
test('provider identity aliases are numeric and unambiguous', async () => {
  const ids = JSON.parse(
    await readFile(new URL('../data/nfl-player-identities.json', import.meta.url), 'utf8')
  )
  const seen = new Set()
  for (const [id, row] of Object.entries(ids)) {
    assert.match(id, /^\d+$/)
    assert.match(row.espnId, /^\d+$/)
    assert.equal(seen.has(row.espnId), false)
    seen.add(row.espnId)
  }
})
