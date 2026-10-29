import { NextResponse } from 'next/server'
import { sleeperClient } from '@/lib/sleeper-sdk/client'
export async function GET() {
  try {
    const state = await sleeperClient.getNflState({ next: { revalidate: 3600 } })
    const end = state.season_type === 'regular' ? Math.min(18, state.week - 1) : 18
    const weeks = Array.from({ length: Math.min(6, Math.max(0, end)) }, (_, i) => end - i).reverse()
    const history: Record<string, { week: number; points: number }[]> = {}
    await Promise.all(
      weeks.map(async (week) => {
        const response = await fetch(
          `https://api.sleeper.com/stats/nfl/${state.season}/${week}?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF&order_by=pts_ppr`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
            next: { revalidate: 3600 },
          }
        )
        if (!response.ok) throw Error('Stats unavailable')
        const rows = await response.json()
        if (!Array.isArray(rows)) throw Error('Invalid stats')
        for (const row of rows) {
          if (!(row.stats?.gp > 0) || typeof row.stats.pts_ppr !== 'number') continue
          ;(history[row.player_id] ??= []).push({ week, points: row.stats.pts_ppr })
        }
      })
    )
    for (const rows of Object.values(history)) rows.sort((a, b) => a.week - b.week)
    return NextResponse.json(
      { history, season: state.season, throughWeek: end },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=3600' } }
    )
  } catch {
    return NextResponse.json({ error: 'Recent scoring history unavailable' }, { status: 502 })
  }
}
