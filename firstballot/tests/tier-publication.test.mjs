import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('tier publication archives versions and rejects late, older workers', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table public.data_snapshots (
        key text primary key, source text not null, payload jsonb not null,
        fetched_at timestamptz not null, source_observed_at timestamptz,
        expires_at timestamptz not null, quality text not null,
        content_hash text not null, season integer, week integer
      );
    `)
    await db.exec(await readFile(new URL('../supabase/migrations/20261026_tier_publication.sql', import.meta.url), 'utf8'))
    const publish = (hash, generated, observed) => db.query(`
      select public.publish_dynasty_tiers(
        'dynasty:tiers:v1', $1::jsonb, $2, 'test', $3::timestamptz,
        $4::timestamptz, '2026-10-29T00:00:00Z'::timestamptz, 2026
      ) as published
    `, [JSON.stringify({ hash, players: { sf: {}, one_qb: {} } }), hash, generated, observed])
    const first = await publish('first', '2026-10-26T10:00:00Z', '2026-10-26T00:00:00Z')
    assert.equal(first.rows[0].published, true)
    assert.equal((await publish('duplicate', '2026-10-26T10:00:00Z', '2026-10-26T00:00:00Z')).rows[0].published, false)
    const next = await publish('next', '2026-10-26T11:00:00Z', '2026-10-26T00:00:00Z')
    assert.equal(next.rows[0].published, true)
    const late = await publish('late', '2026-10-26T10:30:00Z', '2026-10-26T00:00:00Z')
    assert.equal(late.rows[0].published, false)
    const oldSource = await publish('old', '2026-10-26T12:00:00Z', '2026-10-25T00:00:00Z')
    assert.equal(oldSource.rows[0].published, false)
    assert.equal((await db.query(`select payload->>'hash' as hash from data_snapshots where key='dynasty:tiers:v1'`)).rows[0].hash, 'next')
    assert.deepEqual((await db.query(`select content_hash from dynasty_tier_publications order by fetched_at`)).rows.map((r) => r.content_hash), ['first', 'next'])
    await assert.rejects(
      db.query(`select public.publish_dynasty_tiers('other', '{}'::jsonb,'bad','test',now(),now(),now()+interval '1 hour',2026)`),
      /INVALID_TIER_PUBLICATION/
    )
  } finally {
    await db.close()
  }
})
