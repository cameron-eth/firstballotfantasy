import { NextRequest, NextResponse } from 'next/server'
import { loadEspnPlayersData, debugEspnIdResolution, getEspnIdCacheStats } from '@/lib/player-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { player } = body

    if (!player) {
      return NextResponse.json({ error: 'Player data is required' }, { status: 400 })
    }

    // Load ESPN data
    const espnPlayersData = await loadEspnPlayersData()
    
    // Debug the ESPN ID resolution
    const debugInfo = debugEspnIdResolution(player, espnPlayersData)
    
    // Get cache stats
    const cacheStats = getEspnIdCacheStats()

    return NextResponse.json({
      debug: debugInfo,
      cacheStats,
      success: true
    })

  } catch (error) {
    console.error('Debug ESPN ID API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return cache statistics
    const cacheStats = getEspnIdCacheStats()
    
    return NextResponse.json({
      cacheStats,
      success: true
    })

  } catch (error) {
    console.error('Debug ESPN ID API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 