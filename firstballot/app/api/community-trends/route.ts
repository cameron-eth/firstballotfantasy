import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { candidates, readBallots } from '@/lib/community/store'
import { communityTrends } from '@/lib/community/trends'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, max-age=300' }

/** Community rank and 7-day movement per prospect, keyed by `prospect:<id>`. Sign-in required, like the ballot. */
export async function GET(request: NextRequest) {
  const jwt = request.headers.get('x-user-jwt')
  if (!jwt) return NextResponse.json({ error: 'Sign in to see community ranks.' }, { status: 401 })
  const { data, error } = await supabaseServer.auth.getUser(jwt)
  if (error || !data.user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 })
  try {
    const [pool, ballots] = await Promise.all([candidates(), readBallots()])
    const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json(
      { asOf: today, trends: communityTrends(pool, ballots, today) },
      { headers }
    )
  } catch {
    return NextResponse.json(
      { error: 'Community ranks are temporarily unavailable.' },
      { status: 503 }
    )
  }
}
