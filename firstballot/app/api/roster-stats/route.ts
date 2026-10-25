import identities from '@/data/nfl-player-identities.json'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { currentSeasonStats, type EspnFantasyPlayer } from '@/lib/current-season-stats'
export const dynamic = 'force-dynamic'
const TTL = 900
// Cache the small normalized result, not ESPN's multi-megabyte raw payload.
const loadStats = unstable_cache(
  async (season: number) => {
    const filter = {
      players: {
        limit: 3000,
        sortPercOwned: { sortPriority: 1, sortAsc: false },
        filterStatsForTopScoringPeriodIds: { value: 1, additionalValue: [`00${season}`] },
      },
    }
    const response = await fetch(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leaguedefaults/3?view=kona_player_info`,
      { headers: { 'X-Fantasy-Filter': JSON.stringify(filter) }, cache: 'no-store' }
    )
    if (!response.ok) throw new Error('Current-season stats source unavailable')
    const payload = await response.json()
    if (
      !Array.isArray(payload.players) ||
      !payload.players.length ||
      payload.players.length >= 3000
    )
      throw new Error('Incomplete NFL stats coverage')
    return {
      stats: currentSeasonStats(
        payload.players.map((p: { player: EspnFantasyPlayer }) => p.player),
        season
      ),
      updatedAt: new Date().toISOString(),
    }
  },
  ['espn-current-season-ppr-v1'],
  { revalidate: TTL }
)
export async function GET(request: NextRequest) {
  try {
    const ids = [
      ...new Set((request.nextUrl.searchParams.get('player_ids') ?? '').split(',').filter(Boolean)),
    ]
    if (!ids.length || ids.length > 1000 || ids.some((id) => !/^\w+$/.test(id)))
      return NextResponse.json({ error: 'Invalid player_ids' }, { status: 400 })
    const stateResponse = await fetch('https://api.sleeper.app/v1/state/nfl', {
      next: { revalidate: 600 },
    })
    if (!stateResponse.ok) throw new Error('Current NFL season unavailable')
    const state = await stateResponse.json(),
      season = Number(state.season)
    if (!Number.isInteger(season) || season < 2020)
      throw new Error('Current NFL season unavailable')
    const { stats, updatedAt } = await loadStats(season)
    const data = ids.map((id) => {
      const identity = (identities as Record<string, { espnId: string; name: string }>)[id]
      const espnId = identity?.espnId,
        s = stats[String(espnId)]
      return {
        sleeper_player_id: id,
        player_name: identity?.name ?? 'Unknown',
        fantasy_ppg: s?.ppg ?? null,
        total_fantasy_points: s?.points ?? null,
        games_played: s?.games ?? 0,
        fppg_rank: s?.rank ?? null,
        fppg_position: s?.position ?? null,
        stats_season: season,
        stats_source: 'ESPN',
        stats_scoring: 'PPR',
        headshot_url: espnId
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
          : null,
      }
    })
    return NextResponse.json(
      {
        data,
        count: data.length,
        season,
        source: 'ESPN',
        scoring: 'PPR',
        rankPopulation: 'All NFL players with at least one game; ties share rank',
        updatedAt,
      },
      { headers: { 'Cache-Control': `public, s-maxage=${TTL}, stale-while-revalidate=300` } }
    )
  } catch (error) {
    console.error(
      'Current-season roster stats unavailable',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Current-season stats temporarily unavailable' },
      { status: 502 }
    )
  }
}
