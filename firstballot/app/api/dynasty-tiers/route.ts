import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { espnSeasonKey, playerData } from '@/lib/platform/player-data'
import { matchKtcToSleeper } from '@/lib/ktc-identity'
import { KTC_MAX_AGE_MS, sourceWithinBudget } from '@/lib/platform/policy'
import { buildDynastyTiers, DRAFT_CAPITAL_KEY, DYNASTY_TIER_VERSION, DYNASTY_TIERS, KTC_DAY_MARKER_PREFIX, TIER_KEY, type TierPlayer } from '@/lib/dynasty-tiers'
import { writeSnapshot } from '@/lib/platform/snapshots'
import { identityMap } from '@/lib/platform/reference-data'
import type { CurrentSeasonStat } from '@/lib/current-season-stats'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
const key = TIER_KEY
const draftKey = DRAFT_CAPITAL_KEY
/** Draft position never changes, so the cache keeps for five years. */
const DRAFT_CAPITAL_TTL_SECONDS = 5 * 365 * 86400
type KtcRow = { ktc_player_id: number; player_name: string; position: string; team: string | null; value_sf: number; value_1qb: number; scraped_date: string }
type SleeperPlayer = { full_name?: string; position?: string; team?: string; age?: number; years_exp?: number; espn_id?: string; metadata?: { rookie_year?: string } }
type DraftFact = { selection: number; year: number } | null

async function refresh() {
  const generatedAt = new Date()
  // Build from the newest KTC day the sync marked complete, never from a day it is still
  // writing (or left partial when interrupted).
  const { data: marker, error: markerError } = await supabaseAdmin.from('ingestion_runs')
    .select('dataset,row_count').eq('status', 'success').like('dataset', `${KTC_DAY_MARKER_PREFIX}%`)
    .order('dataset', { ascending: false }).limit(1).maybeSingle()
  if (markerError) throw Error('KTC_DAY_MARKERS_UNAVAILABLE')
  if (!marker) throw Error('KTC_NO_COMPLETE_DAY')
  const latest = { scraped_date: marker.dataset.slice(KTC_DAY_MARKER_PREFIX.length) }
  if (!sourceWithinBudget(latest.scraped_date, KTC_MAX_AGE_MS)) throw Error('KTC_SOURCE_STALE')
  const [ktc, sleeperResponse, stats] = await Promise.all([
    supabaseAdmin.from('ktc_player_values')
      .select('ktc_player_id,player_name,position,team,value_sf,value_1qb,scraped_date')
      .eq('scraped_date', latest.scraped_date).limit(2000),
    fetch('https://api.sleeper.app/v1/players/nfl', { cache: 'no-store', signal: AbortSignal.timeout(30000) }),
    playerData(['8144']), // Revalidates the shared ESPN current-season snapshot before reading it.
  ])
  if (ktc.error || !ktc.data || ktc.data.length < 250 || ktc.data.length < (marker.row_count ?? 0) ||
      !sleeperResponse.ok)
    throw Error('INCOMPLETE_TIER_INPUT')
  // 30-day change: the newest scrape on or before 30 days before the latest one.
  const cutoff = new Date(Date.parse(`${latest.scraped_date}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10)
  const { data: priorDate } = await supabaseAdmin.from('ktc_player_values')
    .select('scraped_date').lte('scraped_date', cutoff).order('scraped_date', { ascending: false }).limit(1).maybeSingle()
  // Keyed by KTC's own id, so the 30-day change compares the same KTC asset (PR-19).
  const prior = new Map<number, { value_sf: number; value_1qb: number }>()
  if (priorDate) {
    const { data: priorRows } = await supabaseAdmin.from('ktc_player_values')
      .select('ktc_player_id,value_sf,value_1qb').eq('scraped_date', priorDate.scraped_date).limit(2000)
    for (const row of priorRows ?? []) prior.set(Number(row.ktc_player_id), row)
  }
  const nflKtc = (ktc.data as KtcRow[]).filter((row) => ['QB', 'RB', 'WR', 'TE'].includes(row.position))
  const sleeper = await sleeperResponse.json() as Record<string, SleeperPlayer>
  const { data: statSnapshot, error: statError } = await supabaseAdmin.from('data_snapshots')
    .select('payload,expires_at').eq('key', espnSeasonKey(stats.season)).single()
  if (statError || !statSnapshot || Date.parse(statSnapshot.expires_at) <= Date.now())
    throw Error('ESPN_SOURCE_STALE')
  const espn = statSnapshot.payload as Record<string, CurrentSeasonStat>
  // The one place KTC is matched to Sleeper (lib/ktc-identity); readers use these ids.
  const matched = matchKtcToSleeper(nflKtc, sleeper)
  if (matched.length < 200 || matched.length / nflKtc.length < 0.9)
    throw Error('PLAYER_ID_COVERAGE_LOW')
  const { data: draftStored, error: draftReadError } = await supabaseAdmin.from('data_snapshots')
    .select('payload').eq('key', draftKey).maybeSingle()
  if (draftReadError) throw Error('DRAFT_CACHE_UNAVAILABLE')
  const draft: Record<string, DraftFact> = (draftStored?.payload ?? {}) as Record<string, DraftFact>
  const ids: Record<string, { espnId?: string }> = (await identityMap()).data
  const missing = [...new Set(matched.map(({ id, player }) => String(player.espn_id ?? ids[id]?.espnId ?? '')))]
    .filter((id) => /^\d+$/.test(id) && !(id in draft))
  // Draft position is an immutable NFL fact. Cache successes and missing records so a daily
  // refresh does not issue hundreds of redundant athlete requests.
  for (let offset = 0; offset < missing.length; offset += 20) {
    await Promise.all(missing.slice(offset, offset + 20).map(async (id) => {
      try {
        const response = await fetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/${id}`, {
          cache: 'no-store', signal: AbortSignal.timeout(12000),
        })
        if (!response.ok) return
        const athlete = await response.json() as { draft?: { selection?: number; year?: number } }
        const selection = Number(athlete.draft?.selection), year = Number(athlete.draft?.year)
        draft[id] = Number.isInteger(selection) && selection > 0 && Number.isInteger(year)
          ? { selection, year } : null
      } catch { /* Retry transient provider failures on the next scheduled run. */ }
    }))
  }
  const now = Date.now()
  if (missing.length) {
    try {
      await writeSnapshot(draftKey, 'ESPN NFL athlete draft records', DRAFT_CAPITAL_TTL_SECONDS, draft)
    } catch {
      throw Error('DRAFT_CACHE_WRITE_FAILED')
    }
  }
  const players: TierPlayer[] = matched.map(({ id, row, player }) => {
    const espnId = String(player.espn_id ?? ids[id]?.espnId ?? '')
    const season = espn[espnId]
    const before = prior.get(Number(row.ktc_player_id))
    return {
      id, name: player.full_name ?? row.player_name, position: row.position,
      age: Number(player.age) || null, experience: Number.isFinite(player.years_exp) ? Number(player.years_exp) : null,
      draftSelection: draft[espnId]?.selection ?? null, draftYear: draft[espnId]?.year ?? null,
      ppgRank: season?.rank ?? null, games: season?.games ?? null, adp: season?.adp ?? null,
      valueSf: Number(row.value_sf), value1qb: Number(row.value_1qb),
      change30Sf: before ? Number(row.value_sf) - Number(before.value_sf) : null,
      change301qb: before ? Number(row.value_1qb) - Number(before.value_1qb) : null,
    }
  }).filter((p) => Number.isFinite(p.valueSf) && Number.isFinite(p.value1qb))
  const payload = {
    version: DYNASTY_TIER_VERSION, season: stats.season, ktcDate: latest.scraped_date,
    methodology: { market: 65, currentPprProduction: 18, currentFantasyAdp: 8, age: 6, nflDraftCapital: 3 },
    tiers: DYNASTY_TIERS,
    coverage: { ktcNflPlayers: nflKtc.length, matched: players.length, excludedDraftPicks: ktc.data.length - nflKtc.length,
      production: players.filter((p) => p.ppgRank && (p.games ?? 0) >= 3).length,
      adp: players.filter((p) => p.adp).length, draft: players.filter((p) => p.draftSelection).length },
    // KTC ↔ Sleeper is resolved here, once per publish (unique name + position match);
    // readers join KTC by these ids, never by display name (PR-19).
    identity: Object.fromEntries(matched.map(({ id, row, player }) => [id, {
      ktcId: Number(row.ktc_player_id),
      name: player.full_name, position: player.position, team: player.team,
      age: Number(player.age) || null, espnId: String(player.espn_id ?? ids[id]?.espnId ?? ''),
      draftYear: draft[String(player.espn_id ?? ids[id]?.espnId ?? '')]?.year ?? null,
    }])),
    players: {
      sf: buildDynastyTiers(players, 'sf'),
      one_qb: buildDynastyTiers(players, 'one_qb'),
    },
  }
  const serialized = JSON.stringify(payload)
  const { data: published, error } = await supabaseAdmin.rpc('publish_dynasty_tiers', {
    p_key: key, p_source: 'KTC + ESPN + Sleeper', p_payload: payload,
    p_generated_at: generatedAt.toISOString(),
    p_source_observed_at: `${latest.scraped_date}T00:00:00Z`,
    p_expires_at: new Date(now + 30 * 3600000).toISOString(),
    p_content_hash: createHash('sha256').update(serialized).digest('hex'),
    p_season: stats.season,
  })
  if (error) throw Error('TIER_SNAPSHOT_WRITE_FAILED')
  if (published !== true) return { refreshed: false, reason: 'SUPERSEDED_BY_NEWER_PUBLICATION' }
  await supabaseAdmin.from('ingestion_runs').insert({
    dataset: key, status: 'success', completed_at: new Date().toISOString(), row_count: players.length,
  })
  return { refreshed: true, coverage: payload.coverage, ktcDate: payload.ktcDate }
}

export async function POST(request: Request) {
  const expected = process.env.DATA_REFRESH_SECRET
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(provided)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await refresh()) }
  catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN'
    console.error(JSON.stringify({ event: 'dynasty_tier_refresh_failed', code }))
    await supabaseAdmin.from('ingestion_runs').insert({ dataset: key, status: 'failed',
      completed_at: new Date().toISOString(), error_code: code.slice(0, 80) })
    return NextResponse.json({ error: 'Tier refresh failed', code }, { status: 503 })
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from('data_snapshots')
    .select('payload,fetched_at,expires_at,source_observed_at').eq('key', key).maybeSingle()
  if (error || !data || Date.parse(data.expires_at) <= Date.now())
    return NextResponse.json({ error: 'Current dynasty tiers are unavailable' }, { status: 503,
      headers: { 'Cache-Control': 'private, no-store' } })
  const maxAge = Math.max(0, Math.min(300, Math.floor((Date.parse(data.expires_at) - Date.now()) / 1000)))
  return NextResponse.json({ ...data.payload, fetchedAt: data.fetched_at, expiresAt: data.expires_at,
    sourceObservedAt: data.source_observed_at }, { headers: { 'Cache-Control': `public, max-age=${maxAge}` } })
}
