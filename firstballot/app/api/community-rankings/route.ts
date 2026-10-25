import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { candidates, dailySeed, readBallots, readToday, saveBallot } from '@/lib/community/store'
import { communityRatings, dailyPair, type Ballot } from '@/lib/community/rating'
export const dynamic = 'force-dynamic'
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function handle(request: NextRequest) {
  const jwt = request.headers.get('x-user-jwt')
  if (!jwt) return reply({ error: 'Sign in to contribute.' }, 401)
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(jwt)
  if (error || !user) return reply({ error: 'Sign in again.' }, 401)
  try {
    let pool: 'dynasty' | 'nfl' = 'dynasty'
    const league = request.nextUrl.searchParams.get('leagueId')
    if (league) {
      if (!/^\d{10,25}$/.test(league)) return reply({ error: 'Invalid league' }, 400)
      const r = await fetch(`https://api.sleeper.app/v1/league/${league}`, {
        next: { revalidate: 300 },
      })
      if (!r.ok) throw new Error('League settings unavailable')
      const settings = await r.json()
      pool = Number(settings.settings?.type) === 2 ? 'dynasty' : 'nfl'
    }
    const day = new Date().toISOString().slice(0, 10)
    const [players, existing] = await Promise.all([candidates(), readToday(user.id, day)])
    const choices = dailyPair(players, dailySeed(user.id, day), pool)
    if (!choices) throw new Error('No comparison available')
    let voted = Boolean(existing)
    let winner = existing?.winner
    if (request.method === 'POST') {
      if (existing) return reply({ error: 'Today’s pick is already saved.', voted: true }, 409)
      const raw = await request.text()
      if (raw.length > 2000) return reply({ error: 'Invalid ballot' }, 400)
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        return reply({ error: 'Invalid ballot' }, 400)
      }
      if (
        body.day !== day ||
        !Array.isArray(body.pair) ||
        body.pair.join('|') !== choices.map((p) => p.key).join('|') ||
        !choices.some((p) => p.key === body.winner)
      )
        return reply({ error: 'This ballot changed. Refresh to make today’s pick.' }, 400)
      const ballot: Ballot = {
        version: 1,
        day,
        pool,
        pair: [choices[0].key, choices[1].key],
        winner: body.winner,
      }
      await saveBallot(user.id, ballot)
      voted = true
      winner = ballot.winner
    }
    const history = (await readBallots()).filter((v) => v.pool === pool)
    const rated = communityRatings(
      pool === 'nfl' ? players.filter((p) => p.kind === 'nfl') : players,
      history
    )
    const board = rated
      .filter((p) => pool === 'nfl' || p.kind === 'prospect')
      .filter((p) => p.comparisons > 0)
    let rank = 0
    const rankings = board
      .map((p) => ({ ...p, rank: p.comparisons >= 5 ? ++rank : null }))
      .slice(0, 30)
    return reply({
      day,
      pool,
      voted,
      winner,
      choices,
      rankings,
      totalVotes: history.length,
      method: 'Regularized Bradley–Terry',
      choiceRatings: rated.filter((p) => choices.some((c) => c.key === p.key)),
    })
  } catch {
    return reply(
      { error: 'Community rankings are temporarily unavailable. Please try again.' },
      503
    )
  }
}
export const GET = handle
export const POST = handle
