import { NextResponse } from 'next/server'
import { careerOutcome } from '@/lib/history-outcomes'
import { historyOutcomes } from '@/lib/platform/reference-data'
import { joinableEspnId } from '@/lib/reference-data'
export const revalidate = 3600
export async function GET() {
  // The weekly job's snapshot when present, else the bundled file (PR-13).
  const { data, source, fetchedAt } = await historyOutcomes()
  const outcomes = Object.fromEntries(
    data.players.flatMap((p) => {
      const espnId = joinableEspnId(p)
      return espnId ? [[`${espnId}:${p.year}`, careerOutcome(p, data)]] : []
    })
  )
  return NextResponse.json(
    { season: data.season, week: data.week, version: data.version, source, fetchedAt, outcomes },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } }
  )
}
