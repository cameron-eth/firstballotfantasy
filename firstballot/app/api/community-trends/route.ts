import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/platform/session'
import { candidates, readTallies } from '@/lib/community/store'
import { communityTrendsFromTallies } from '@/lib/community/trends'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, max-age=300' }

/** Community rank and 7-day movement per prospect, keyed by `prospect:<id>`. Sign-in required, like the ballot. */
export async function GET(request: NextRequest) {
  if (!readSession(request))
    return NextResponse.json({ error: 'Sign in to see community ranks.' }, { status: 401 })
  try {
    const [pool, tallies] = await Promise.all([candidates(), readTallies()])
    const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json(
      { asOf: today, trends: communityTrendsFromTallies(pool, tallies, today) },
      { headers }
    )
  } catch {
    return NextResponse.json(
      { error: 'Community ranks are temporarily unavailable.' },
      { status: 503 }
    )
  }
}
