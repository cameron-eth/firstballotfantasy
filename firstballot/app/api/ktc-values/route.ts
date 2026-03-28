import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ktc-values
 *
 * Query params:
 *   player  – exact player name, returns all historical rows (for sparkline)
 *   names   – comma-separated list of names, returns latest value for each
 *   date    – specific scraped_date (YYYY-MM-DD), defaults to latest
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const player = searchParams.get('player')
    const names  = searchParams.get('names')

    // ── Single player history (sparkline data) ──────────────────────
    if (player) {
      const { data, error } = await supabaseAdmin
        .from('ktc_player_values')
        .select('scraped_date, value_sf, value_1qb, rank_sf, rank_1qb')
        .eq('player_name', player)
        .order('scraped_date', { ascending: true })

      if (error) throw error

      return NextResponse.json({ player, history: data ?? [] }, {
        headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
      })
    }

    // ── Multiple players – latest value only (for table column) ──────
    if (names) {
      const nameList = names.split(',').map((n) => n.trim()).filter(Boolean)
      if (nameList.length === 0) {
        return NextResponse.json({ data: [] })
      }

      // Get the most recent scraped_date
      const { data: latestRow } = await supabaseAdmin
        .from('ktc_player_values')
        .select('scraped_date')
        .order('scraped_date', { ascending: false })
        .limit(1)
        .single()

      const latestDate = latestRow?.scraped_date

      const { data, error } = await supabaseAdmin
        .from('ktc_player_values')
        .select('player_name, value_sf, value_1qb, rank_sf, rank_1qb, scraped_date')
        .in('player_name', nameList)
        .eq('scraped_date', latestDate)

      if (error) throw error

      // Also fetch history for each player so we can render mini sparklines
      const { data: history, error: histErr } = await supabaseAdmin
        .from('ktc_player_values')
        .select('ktc_player_id, player_name, scraped_date, value_sf, value_1qb')
        .in('player_name', nameList)
        .order('scraped_date', { ascending: true })

      if (histErr) throw histErr

      // Group history by player_name (primary) and also by ktc_player_id (stable id)
      const historyMap: Record<string, { scraped_date: string; value_sf: number; value_1qb: number }[]> = {}
      const historyById: Record<number, { scraped_date: string; value_sf: number; value_1qb: number }[]> = {}
      for (const row of (history ?? [])) {
        // by name
        if (!historyMap[row.player_name]) historyMap[row.player_name] = []
        historyMap[row.player_name].push({ scraped_date: row.scraped_date, value_sf: row.value_sf, value_1qb: row.value_1qb })
        // by ktc_player_id
        if (row.ktc_player_id) {
          if (!historyById[row.ktc_player_id]) historyById[row.ktc_player_id] = []
          historyById[row.ktc_player_id].push({ scraped_date: row.scraped_date, value_sf: row.value_sf, value_1qb: row.value_1qb })
        }
      }

      return NextResponse.json(
        { data: data ?? [], historyMap, latestDate },
        { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
      )
    }

    // ── Full latest snapshot (all 500 players) ───────────────────────
    const { data: latestRow } = await supabaseAdmin
      .from('ktc_player_values')
      .select('scraped_date')
      .order('scraped_date', { ascending: false })
      .limit(1)
      .single()

    const latestDate = latestRow?.scraped_date

    const { data, error } = await supabaseAdmin
      .from('ktc_player_values')
      .select('*')
      .eq('scraped_date', latestDate)
      .order('rank_sf', { ascending: true })

    if (error) throw error

    return NextResponse.json(
      { data: data ?? [], latestDate },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (err) {
    console.error('[ktc-values] error:', err)
    return NextResponse.json({ error: 'Failed to fetch KTC values' }, { status: 500 })
  }
}
