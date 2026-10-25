import { NextResponse } from 'next/server'
import snapshot from '@/data/history-outcomes.json'
import { careerOutcome, type OutcomeSnapshot } from '@/lib/history-outcomes'
export const revalidate = 3600
export function GET() {
  const data = snapshot as OutcomeSnapshot
  const outcomes = Object.fromEntries(
    data.players
      .filter((p) => p.espnId)
      .map((p) => [`${p.espnId}:${p.year}`, careerOutcome(p, data)])
  )
  return NextResponse.json(
    { season: data.season, week: data.week, version: data.version, outcomes },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } }
  )
}
