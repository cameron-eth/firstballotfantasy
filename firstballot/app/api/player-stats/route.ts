import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * API Route: Player Stats
 *
 * Efficiently fetches consolidated player statistics from master_player_stats
 * Includes all fantasy points (passing + rushing + receiving) and PPG averages
 *
 * Query Parameters:
 * - player_id: Filter by player GSIS ID
 * - position: Filter by position (QB, RB, WR, TE)
 * - team: Filter by team abbreviation
 * - season: Filter by season (default: 2025)
 * - min_ppg: Minimum fantasy PPG
 * - limit: Number of results (default: 100)
 * - sort: Sort column (default: fantasy_ppg)
 * - order: Sort order (asc/desc, default: desc)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const player_id = searchParams.get('player_id')
    const player_ids = searchParams.get('player_ids') // comma-separated list
    const position = searchParams.get('position')
    const team = searchParams.get('team')
    const season = searchParams.get('season') || '2025'
    const min_ppg = searchParams.get('min_ppg')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000
    const sortBy = searchParams.get('sort') || 'fantasy_ppg'
    const sortOrder = searchParams.get('order') === 'asc'

    // Build query
    let query = supabaseServer
      .from('master_player_stats')
      .select('*')
      .eq('season', parseInt(season))

    // Apply filters
    if (player_ids) {
      // Multiple player IDs (comma-separated)
      const idsArray = player_ids.split(',').map((id) => id.trim())
      query = query.in('player_gsis_id', idsArray)
    } else if (player_id) {
      // Single player ID
      query = query.eq('player_gsis_id', player_id)
    }

    if (position) {
      query = query.eq('position', position.toUpperCase())
    }

    if (team) {
      query = query.eq('team_abbr', team.toUpperCase())
    }

    if (min_ppg) {
      query = query.gte('fantasy_ppg', parseFloat(min_ppg))
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder, nullsFirst: false })
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      count: data?.length || 0,
      filters: {
        player_id,
        position,
        team,
        season,
        min_ppg,
        limit,
        sort: sortBy,
        order: sortOrder ? 'asc' : 'desc',
      },
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player stats', message: error.message },
      { status: 500 }
    )
  }
}
