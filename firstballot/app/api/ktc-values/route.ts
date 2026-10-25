import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import archive from '@/data/ktc-history.json'
const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '')
const assets = Object.entries(archive.players).map(([id, player]) => ({ id, ...player }))
type Point = {
  scraped_date: string
  value_sf: number
  value_1qb: number
  rank_sf: number
  rank_1qb: number
}
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const names = (params.get('names') || params.get('player'))
    ?.split(',')
    .map((n) => n.trim())
    .filter(Boolean)
  if (names && names.length > 100)
    return NextResponse.json({ error: 'Maximum 100 names' }, { status: 400 })
  const selected = (names ?? assets.map((p) => p.name)).flatMap((name) => {
    const exact = assets.filter((p) => p.names.includes(name))
    const candidates = exact.length
      ? exact
      : assets.filter((p) => p.names.some((n) => normalize(n) === normalize(name)))
    return candidates.length === 1 ? [{ name, asset: candidates[0] }] : []
  })
  const byId: Record<string, Point[]> = {}
  let latestDate: string = archive.dates.at(-1)!
  let source = 'sdk-archive'
  try {
    const latest = await supabaseServer
      .from('ktc_player_values')
      .select('scraped_date')
      .order('scraped_date', { ascending: false })
      .limit(1)
      .single()
    if (latest.error || !latest.data) throw Error('No stored history')
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
        if (!names) query = query.eq('scraped_date', latest.data.scraped_date)
        const result = await query
        if (result.error) throw result.error
        for (const row of result.data ?? []) (byId[String(row.ktc_player_id)] ??= []).push(row)
        if ((result.data?.length ?? 0) < 1000) break
      }
    }
    latestDate = latest.data.scraped_date
    source = 'supabase'
  } catch {
    for (const id of Object.keys(byId)) delete byId[id]
  }
  const historyMap: Record<string, Point[]> = {}
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
    historyMap[name] = history
    rows.push({
      ktc_player_id: p.id,
      player_name: name,
      position: p.position,
      team: p.team,
      ...history.at(-1),
    })
  }
  return NextResponse.json(
    params.get('player')
      ? { player: params.get('player'), history: historyMap[params.get('player')!] ?? [], source }
      : { data: rows, historyMap: names ? historyMap : undefined, latestDate, source },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
  )
}
