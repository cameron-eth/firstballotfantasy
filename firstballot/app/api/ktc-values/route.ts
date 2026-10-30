import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { supabaseServer } from '@/lib/supabase-server'
import archive from '@/data/ktc-history.json'
import { KTC_MAX_AGE_MS, sourceWithinBudget } from '@/lib/platform/policy'
import { resolvePlayers, sleeperIdsForEspn } from '@/lib/platform/identity'
import { latestKtcDay } from '@/lib/platform/ktc-days'
const assets = Object.entries(archive.players).map(([id, player]) => ({ id, ...player }))
type Point = {
  scraped_date: string
  value_sf: number
  value_1qb: number
  rank_sf: number
  rank_1qb: number
}
/**
 * KTC values and history by Sleeper id (PR-19): ids resolve through the tier snapshot's
 * KTC ↔ Sleeper match, so two players who share a name can't be confused. A player KTC
 * doesn't list is simply absent.
 */
async function bySleeperIds(sleeperIds: string[]) {
  const identities = (await resolvePlayers(sleeperIds)).filter((p) => p.ktcId != null)
  const sleeperByKtc = new Map(identities.map((p) => [p.ktcId!, p.sleeperId]))
  const history: Record<string, Point[]> = {}
  const latestDay = await latestKtcDay()
  if (!latestDay) throw Error('No stored history')
  const ktcIds = [...sleeperByKtc.keys()]
  for (let offset = 0; ktcIds.length; offset += 1000) {
    const result = await supabaseServer
      .from('ktc_player_values')
      .select('ktc_player_id,scraped_date,value_sf,value_1qb,rank_sf,rank_1qb')
      .in('ktc_player_id', ktcIds)
      .order('scraped_date', { ascending: true })
      .order('ktc_player_id', { ascending: true })
      .range(offset, offset + 999)
    if (result.error) throw result.error
    for (const row of result.data ?? []) {
      const sleeperId = sleeperByKtc.get(Number(row.ktc_player_id))
      if (sleeperId) (history[sleeperId] ??= []).push(row)
    }
    if ((result.data?.length ?? 0) < 1000) break
  }
  const latestDate = latestDay.date
  const latest = Object.fromEntries(
    Object.entries(history).flatMap(([sleeperId, points]) => {
      const last = points.at(-1)
      return last && sourceWithinBudget(last.scraped_date, KTC_MAX_AGE_MS)
        ? [[sleeperId, { value_sf: last.value_sf, value_1qb: last.value_1qb }]]
        : []
    })
  )
  return { latestDate, history, latest }
}

function rekey<T>(bySleeper: Record<string, T>, espnToSleeper: Map<string, string>) {
  return Object.fromEntries(
    [...espnToSleeper].flatMap(([espnId, sleeperId]) =>
      sleeperId in bySleeper ? [[espnId, bySleeper[sleeperId]]] : []
    )
  )
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const ids = (key: string) =>
    params
      .get(key)
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => /^\w{1,30}$/.test(id))
  const sleeperIds = ids('sleeperIds')
  const espnIds = ids('espnIds')
  if (sleeperIds || espnIds) {
    if ((sleeperIds ?? espnIds)!.length > 100) return fail(400, 'Maximum 100 players')
    try {
      // ESPN ids (prospects) resolve to Sleeper ids first; results come back keyed the
      // way they were asked for.
      const espnToSleeper = espnIds ? await sleeperIdsForEspn(espnIds) : null
      const bySleeper = await bySleeperIds(sleeperIds ?? [...espnToSleeper!.values()])
      const result = espnToSleeper
        ? {
            ...bySleeper,
            history: rekey(bySleeper.history, espnToSleeper),
            latest: rekey(bySleeper.latest, espnToSleeper),
          }
        : bySleeper
      if (!sourceWithinBudget(result.latestDate, KTC_MAX_AGE_MS))
        return fail(503, 'Current KTC values are unavailable.', { code: 'STALE_SOURCE' })
      return NextResponse.json(
        { ...result, source: 'supabase' },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      )
    } catch {
      return fail(503, 'KTC values are unavailable.')
    }
  }
  // Without ids: today's value of every KTC asset (players and draft picks), one row per
  // KTC id. The name and player lookups are gone (PR-19); ask by sleeperIds or espnIds.
  if (params.has('names') || params.has('player'))
    return fail(400, 'Look players up by sleeperIds or espnIds.')
  const selected = assets.map((asset) => ({ name: asset.name, asset }))
  const byId: Record<string, Point[]> = {}
  let latestDate: string = archive.dates.at(-1)!
  let source = 'sdk-archive'
  try {
    const latest = await latestKtcDay()
    if (!latest) throw Error('No stored history')
    const ids = [...new Set(selected.map((p) => Number(p.asset.id)))]
    if (ids.length) {
      for (let offset = 0; ; offset += 1000) {
        let query = supabaseServer
          .from('ktc_player_values')
          .select('ktc_player_id,scraped_date,value_sf,value_1qb,rank_sf,rank_1qb')
          .in('ktc_player_id', ids)
          .order('scraped_date', { ascending: true })
          .order('ktc_player_id', { ascending: true })
          .range(offset, offset + 999)
        query = query.eq('scraped_date', latest.date)
        const result = await query
        if (result.error) throw result.error
        for (const row of result.data ?? []) (byId[String(row.ktc_player_id)] ??= []).push(row)
        if ((result.data?.length ?? 0) < 1000) break
      }
    }
    latestDate = latest.date
    source = 'supabase'
  } catch {
    for (const id of Object.keys(byId)) delete byId[id]
  }
  // Per-source and per-player freshness apply equally to archive and database records.
  if (!sourceWithinBudget(latestDate, KTC_MAX_AGE_MS)) {
    return fail(503, 'Current KTC values are unavailable.', {
      code: 'STALE_SOURCE',
      latestDate,
      source,
    })
  }
  const rows: object[] = []
  for (const { name, asset: p } of selected) {
    const history =
      byId[p.id] ??
      (source === 'sdk-archive'
        ? p.history.map((h) => ({
            scraped_date: String(h[0]),
            value_sf: Number(h[1]),
            value_1qb: Number(h[2]),
            rank_sf: Number(h[3]),
            rank_1qb: Number(h[4]),
          }))
        : [])
    if (!history.length) continue
    if (!sourceWithinBudget(history.at(-1)?.scraped_date, KTC_MAX_AGE_MS)) continue
    rows.push({
      ktc_player_id: p.id,
      player_name: name,
      position: p.position,
      team: p.team,
      ...history.at(-1),
    })
  }
  return NextResponse.json(
    { data: rows, latestDate, source },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
