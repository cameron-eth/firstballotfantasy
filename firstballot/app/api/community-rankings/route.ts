import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient, supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Pool = 'nfl' | 'prospect'
type Choice = { key: string; name: string; detail: string; image: string | null }
type Matchup = { pool: Pool; pairKey: string; choices: [Choice, Choice]; counts: Record<string, number> }

type Candidate = Choice & { group: string }

function selectComparablePair(candidates: Candidate[], seed: number): [Choice, Choice] | null {
  const groups = new Map<string, Candidate[]>()
  for (const candidate of candidates) groups.set(candidate.group, [...(groups.get(candidate.group) || []), candidate])
  const pairs: [Choice, Choice][] = []
  for (const group of groups.values()) {
    for (let i = 0; i + 1 < group.length; i += 2) pairs.push([group[i], group[i + 1]])
  }
  return pairs.length ? pairs[seed % pairs.length] : null
}

async function getMatchups(seed: number): Promise<{ matchups: Matchup[]; enabled: boolean }> {
  const [nflResult, prospectResult] = await Promise.all([
    supabaseServer.from('dynasty_player_tiers').select('player_id,player_name,position,team,headshot_url,total_score').in('position', ['QB', 'RB', 'WR', 'TE']).order('total_score', { ascending: false }).limit(120),
    supabaseServer.from('dynasty_prospects').select('id,name,position,school,draft_year,headshot_url,rank').gte('draft_year', 2027).in('position', ['QB', 'RB', 'WR', 'TE']).order('rank', { ascending: true }).limit(200),
  ])
  const matchups: Matchup[] = []
  if (!nflResult.error) {
    const pair = selectComparablePair((nflResult.data || []).map((p) => ({
      key: String(p.player_id || p.player_name), name: p.player_name, detail: `${p.position} · ${p.team || 'NFL'}`,
      image: p.headshot_url, group: p.position,
    })), seed)
    if (pair) matchups.push({ pool: 'nfl', pairKey: pair.map((p) => p.key).sort().join('|'), choices: pair, counts: {} })
  }
  if (!prospectResult.error) {
    const pair = selectComparablePair((prospectResult.data || []).map((p) => ({
      key: String(p.id), name: p.name, detail: `${p.position} · ${p.school} · ${p.draft_year}`,
      image: p.headshot_url, group: `${p.draft_year}:${p.position}`,
    })), seed)
    if (pair) matchups.push({ pool: 'prospect', pairKey: pair.map((p) => p.key).sort().join('|'), choices: pair, counts: {} })
  }
  let enabled = matchups.length > 0
  await Promise.all(matchups.map(async (matchup) => {
    const { data, error } = await supabaseServer.rpc('community_pair_counts', {
      request_pool: matchup.pool, request_pair_key: matchup.pairKey,
    })
    if (error) enabled = false
    else for (const row of data || []) matchup.counts[String(row.winner_key)] = Number(row.vote_count) || 0
  }))
  return { matchups, enabled }
}

function seedFrom(value: unknown): number | null {
  const seed = Number(value)
  return Number.isSafeInteger(seed) && seed >= 0 && seed <= 1000000000 ? seed : null
}

export async function GET(request: NextRequest) {
  const seed = seedFrom(request.nextUrl.searchParams.get('seed'))
  if (seed === null) return NextResponse.json({ error: 'Invalid matchup seed' }, { status: 400 })
  try { return NextResponse.json(await getMatchups(seed), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Community rankings unavailable' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userJwt = request.headers.get('x-user-jwt')
  if (!userId || !userJwt) return NextResponse.json({ error: 'Sign in to save your ranking' }, { status: 401 })
  let body: { pool?: Pool; pairKey?: string; winnerKey?: string; seed?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid ballot' }, { status: 400 }) }
  const seed = seedFrom(body.seed)
  if (seed === null) return NextResponse.json({ error: 'Invalid matchup seed' }, { status: 400 })
  const initial = await getMatchups(seed)
  if (!initial.enabled) return NextResponse.json({ error: 'Community voting is temporarily unavailable' }, { status: 503 })
  const matchup = initial.matchups.find((item) => item.pool === body.pool && item.pairKey === body.pairKey)
  if (!matchup || !matchup.choices.some((choice) => choice.key === body.winnerKey)) {
    return NextResponse.json({ error: 'This matchup has changed. Reload to vote.' }, { status: 400 })
  }
  const client = createAuthenticatedSupabaseClient(userJwt)
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || auth.user?.id !== userId) return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  const { error } = await client.from('community_rank_votes').upsert({
    user_id: userId, pool: matchup.pool, pair_key: matchup.pairKey,
    winner_key: body.winnerKey, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,pool,pair_key' })
  if (error) return NextResponse.json({ error: 'Could not save ranking. Try again.' }, { status: 503 })
  const updated = (await getMatchups(seed)).matchups.find((item) => item.pool === matchup.pool)
  return NextResponse.json({ matchup: updated })
}
