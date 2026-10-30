import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { loadTradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId') ?? ''
  if (!/^\d{10,25}$/.test(leagueId)) return fail(400, 'Invalid league.')
  try {
    return NextResponse.json(await loadTradeInventory(leagueId), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return fail(502, 'Picks and FAAB are unavailable. Retry before reviewing a trade.')
  }
}
