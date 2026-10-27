import { playerData } from '@/lib/platform/player-data'
import { NextResponse } from 'next/server'
import { failure } from '@/lib/platform/http'

// Stats move on a weekly cadence; `_v` in the URL (bumped by Refresh) bypasses edge copies.
const SHARED = 'public, s-maxage=300, stale-while-revalidate=600'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const ids = [
      ...new Set(
        (new URL(request.url).searchParams.get('player_ids') ?? '').split(',').filter(Boolean)
      ),
    ]
    const result = await playerData(ids,1000)
    return NextResponse.json(
      {
        ...result,
        count: result.data.length,
        source: 'ESPN',
        updatedAt: result.freshness.fetchedAt,
      },
      { headers: { 'Cache-Control': SHARED } }
    )
  } catch (e) {
    return failure(e)
  }
}
