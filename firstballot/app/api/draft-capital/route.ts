import { NextRequest, NextResponse } from 'next/server'
import { sleeperClient, type SleeperReadOptions } from '@/lib/sleeper-sdk/client'
import { draftCapital } from '@/lib/sleeper-sdk/draft-capital'
const FIVE_MINUTES: SleeperReadOptions = { next: { revalidate: 300 } }
export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId') ?? ''
  const roster = Number(request.nextUrl.searchParams.get('roster'))
  if (!/^\d{10,25}$/.test(leagueId) || !Number.isInteger(roster) || roster < 1)
    return NextResponse.json({ error: 'Invalid league or roster.' }, { status: 400 })
  try {
    const [league, rosters, traded, drafts] = await Promise.all([
      sleeperClient.getLeague(leagueId, FIVE_MINUTES),
      sleeperClient.getLeagueRosters(leagueId, FIVE_MINUTES),
      sleeperClient.getLeagueTradedPicks(leagueId, FIVE_MINUTES),
      sleeperClient.getLeagueDrafts(leagueId, FIVE_MINUTES),
    ])
    const season = Number(league.season),
      rounds = Number(league.settings?.draft_rounds)
    if (
      !rosters.some((r) => r.roster_id === roster) ||
      !Number.isInteger(season) ||
      !Number.isInteger(rounds) ||
      rounds < 1 ||
      rounds > 20
    )
      throw new Error()
    const currentComplete = drafts.some(
      (d) => Number(d.season) === season && d.status === 'complete'
    )
    const first = season + (currentComplete ? 1 : 0)
    return NextResponse.json(
      {
        years: draftCapital(
          rosters.map((r) => r.roster_id),
          roster,
          [first, first + 1, first + 2],
          rounds,
          traded
        ),
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } }
    )
  } catch {
    return NextResponse.json({ error: 'Draft capital unavailable.' }, { status: 502 })
  }
}
