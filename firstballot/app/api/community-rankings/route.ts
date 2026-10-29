import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/platform/session'
import { candidates, dailySeed, readTallies, readToday, saveBallot } from '@/lib/community/store'
import { parseBallotRound, MAX_DAILY_BALLOTS } from '@/lib/community/rounds'
import { communityRatingsFromTallies, dailyPair, type Ballot } from '@/lib/community/rating'
import { sleeperClient } from '@/lib/sleeper-sdk/client'
export const dynamic = 'force-dynamic'
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function handle(request: NextRequest) {
  const session = readSession(request)
  if (!session) return reply({ error: 'Sign in to contribute.' }, 401)
  const round = parseBallotRound(request.nextUrl.searchParams.get('round'))
  if (round === null) return reply({ error: 'Invalid comparison number.' }, 400)
  try {
    let pool: 'dynasty' | 'nfl' = 'dynasty'
    const league = request.nextUrl.searchParams.get('leagueId')
    if (league) {
      if (!/^\d{10,25}$/.test(league)) return reply({ error: 'Invalid league' }, 400)
      const settings = await sleeperClient
        .getLeague(league, { next: { revalidate: 300 } })
        .catch(() => {
          throw new Error('League settings unavailable')
        })
      pool = Number(settings.settings?.type) === 2 ? 'dynasty' : 'nfl'
    }
    const day = new Date().toISOString().slice(0, 10)
    const [players, existing] = await Promise.all([
      candidates(),
      readToday(session.userId, day, round),
    ])
    if (existing) pool = existing.pool
    const choices = existing
      ? existing.pair
          .map((key) => players.find((p) => p.key === key))
          .filter((p): p is (typeof players)[number] => Boolean(p))
      : dailyPair(players, dailySeed(session.userId, round ? `${day}:round:${round}` : day), pool)
    if (!choices || choices.length !== 2) throw new Error('No comparison available')
    let voted = Boolean(existing)
    let winner = existing?.winner
    if (request.method === 'POST') {
      if (existing) return reply({ error: 'This pick is already saved.', voted: true }, 409)
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
      await saveBallot(session.userId, ballot, round)
      voted = true
      winner = ballot.winner
    }
    const history = (await readTallies()).filter((t) => t.pool === pool)
    const rated = communityRatingsFromTallies(
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
      round,
      maxRounds: MAX_DAILY_BALLOTS,
      pool,
      voted,
      winner,
      choices,
      rankings,
      totalVotes: history.reduce((sum, t) => sum + t.n, 0),
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
