import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { DynastyTier, TierFormat } from '@/lib/dynasty-tiers'

export const dynamic = 'force-dynamic'
type Identity = { name: string; position: string; team: string | null; age: number | null; espnId: string; draftYear: number | null }
type Payload = { players: Record<TierFormat, Record<string, DynastyTier>>; identity: Record<string, Identity> }

export async function GET(request: NextRequest) {
  const { data, error } = await supabaseAdmin.from('data_snapshots')
    .select('payload,expires_at,fetched_at').eq('key', 'dynasty:tiers:v1').maybeSingle()
  if (error || !data || Date.parse(data.expires_at) <= Date.now())
    return NextResponse.json({ error: 'Current rankings are unavailable' }, { status: 503,
      headers: { 'Cache-Control': 'no-store' } })
  const payload = data.payload as Payload
  const maxAge = Math.max(0, Math.min(300, Math.floor((Date.parse(data.expires_at) - Date.now()) / 1000)))
  const format: TierFormat = request.nextUrl.searchParams.get('format') === 'one_qb' ? 'one_qb' : 'sf'
  const rankings = Object.entries(payload.players[format] ?? {}).flatMap(([id, tier]) => {
    const person = payload.identity[id]
    if (!person) return []
    return [{
      player_id: id, player_name: person.name, position: person.position, team: person.team ?? '',
      age: person.age, espn_id: person.espnId || null,
      headshot_url: person.espnId ? `https://a.espncdn.com/i/headshots/nfl/players/full/${person.espnId}.png` : null,
      draft_year: person.draftYear, draft_class: person.draftYear,
      rank: tier.rank, RK: tier.rank, 'PLAYER NAME': person.name, POS: person.position, TEAM: person.team ?? '',
      total_score: tier.score, tier: `${tier.name} (Tier ${tier.number})`, factors: tier.factors,
    }]
  }).sort((a, b) => a.rank - b.rank)
  const search = request.nextUrl.searchParams.get('search')
  if (search !== null) return NextResponse.json({ players: rankings.filter((p) =>
    p.player_name.toLowerCase().includes(search.toLowerCase())).slice(0, 20) },
  { headers: { 'Cache-Control': `public, max-age=${maxAge}` } })
  const playerName = request.nextUrl.searchParams.get('player')
  if (playerName) {
    const found = rankings.find((p) => p.player_name.toLowerCase() === playerName.toLowerCase())
    return found ? NextResponse.json(found) : NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
  const scoreQuery = request.nextUrl.searchParams.get('score')
  if (scoreQuery !== null) {
    const score = Number(scoreQuery)
    if (!Number.isFinite(score) || score < 0 || score > 100)
      return NextResponse.json({ error: 'Score must be between 0 and 100' }, { status: 400 })
    return NextResponse.json({ score, rank: rankings.find((p) => p.total_score <= score)?.rank ?? rankings.length + 1 })
  }
  return NextResponse.json({ data: rankings, fetchedAt: data.fetched_at,
    rankingsMap: Object.fromEntries(rankings.map((p) => [p.player_name, {
      rank: p.rank, position: p.position, team: p.team, name: p.player_name,
      total_score: p.total_score, tier: p.tier, headshot_url: p.headshot_url, espn_id: p.espn_id,
    }])) }, { headers: { 'Cache-Control': `public, max-age=${maxAge}` } })
}
