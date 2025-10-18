import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// Force dynamic to disable caching - always get fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0



export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const playerIdsParam = searchParams.get("player_ids")
    const season = parseInt(searchParams.get("season") || "2025")

    if (!playerIdsParam) {
      return NextResponse.json(
        { error: "player_ids parameter is required (comma-separated)" },
        { status: 400 }
      )
    }

    const playerIds = playerIdsParam.split(",").map(id => id.trim())

    // Fetch all three stat types in parallel - just fantasy_points and week
    const [passingData, rushingData, receivingData] = await Promise.all([
      supabaseServer
        .from("nfl_ngs_passing_stats")
        .select("player_gsis_id, player_display_name, fantasy_points, week")
        .eq("season", season)
        .in("player_gsis_id", playerIds)
        .then(res => res.data || []),
      
      supabaseServer
        .from("nfl_ngs_rushing_stats")
        .select("player_gsis_id, player_display_name, fantasy_points, week")
        .eq("season", season)
        .in("player_gsis_id", playerIds)
        .then(res => res.data || []),
      
      supabaseServer
        .from("nfl_ngs_receiving_stats")
        .select("player_gsis_id, player_display_name, fantasy_points, week")
        .eq("season", season)
        .in("player_gsis_id", playerIds)
        .then(res => res.data || [])
    ])

    // Combine all stats and group by player
    const allStats = [...passingData, ...rushingData, ...receivingData]
    const playerStats = new Map<string, {
      player_display_name: string
      weeks: Set<number>
      total_fantasy_points: number
      weeklyPoints: Map<number, number>
    }>()

    // Sum fantasy points by player and track unique weeks
    allStats.forEach((stat: any) => {
      if (!playerStats.has(stat.player_gsis_id)) {
        playerStats.set(stat.player_gsis_id, {
          player_display_name: stat.player_display_name,
          weeks: new Set(),
          total_fantasy_points: 0,
          weeklyPoints: new Map()
        })
      }
      
      const player = playerStats.get(stat.player_gsis_id)!
      player.weeks.add(stat.week)
      player.total_fantasy_points += stat.fantasy_points || 0
      
      // Track points per week
      const currentWeekPoints = player.weeklyPoints.get(stat.week) || 0
      player.weeklyPoints.set(stat.week, currentWeekPoints + (stat.fantasy_points || 0))
    })

    // Calculate PPG for each player
    const result = Array.from(playerStats.entries()).map(([player_gsis_id, data]) => {
      const games_played = data.weeks.size
      const fantasy_ppg = games_played > 0 ? data.total_fantasy_points / games_played : 0

      return {
        player_gsis_id,
        player_display_name: data.player_display_name,
        total_fantasy_points: data.total_fantasy_points,
        fantasy_ppg,
        games_played
      }
    })

    return NextResponse.json({
      data: result,
      count: result.length,
      season
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch player fantasy stats", message: error.message },
      { status: 500 }
    )
  }
}

