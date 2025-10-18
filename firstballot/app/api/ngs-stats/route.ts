import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

type NGSStatType = "passing" | "rushing" | "receiving"

const TABLE_MAP: Record<NGSStatType, string> = {
  passing: "nfl_ngs_passing_stats",
  rushing: "nfl_ngs_rushing_stats",
  receiving: "nfl_ngs_receiving_stats"
}

export async function GET(request: NextRequest) {
  console.log("=== NGS Stats API Called ===")
  try {
    const searchParams = request.nextUrl.searchParams
    const stat_type = searchParams.get("type") as NGSStatType
    const season = searchParams.get("season")
    const week = searchParams.get("week")
    const player_id = searchParams.get("player_id")
    const team = searchParams.get("team")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100

    console.log("Request params:", { stat_type, season, week, team, player_id, limit })

    // Validate stat type
    if (!stat_type || !TABLE_MAP[stat_type]) {
      console.error("Invalid stat type:", stat_type)
      return NextResponse.json(
        { error: "Invalid stat type. Must be 'passing', 'rushing', or 'receiving'" },
        { status: 400 }
      )
    }

    const tableName = TABLE_MAP[stat_type]
    console.log("Querying table:", tableName)

    // Build query
    let query = supabaseServer
      .from(tableName)
      .select("*")

    // Apply filters
    if (season) {
      query = query.eq("season", parseInt(season))
    }

    if (week) {
      query = query.eq("week", parseInt(week))
    }

    if (player_id) {
      query = query.eq("player_gsis_id", player_id)
    }

    if (team) {
      query = query.eq("team_abbr", team)
    }

    // Order by fantasy points by default (can be overridden with sort param)
    const sortBy = searchParams.get("sort") || "fantasy_points"
    const sortOrder = searchParams.get("order") === "asc"
    
    // Ensure the column exists before ordering
    try {
      query = query.order(sortBy, { ascending: sortOrder, nullsFirst: false })
    } catch (orderError) {
      console.error("Order error:", orderError)
      // Fallback to default order if sort column doesn't exist
      query = query.order("fantasy_points", { ascending: false, nullsFirst: false })
    }

    query = query.limit(limit)

    console.log("About to execute Supabase query...")
    const { data, error } = await query
    console.log("Query executed. Error:", !!error, "Data count:", data?.length)

    if (error) {
      console.error("Supabase query error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      console.error("Error code:", error.code)
      console.error("Error message:", error.message)
      return NextResponse.json(
        { error: "Database query failed", details: error.message },
        { status: 500 }
      )
    }

    console.log(`Successfully fetched ${data?.length || 0} records`)

    return NextResponse.json({
      data,
      count: data?.length || 0,
      stat_type,
      filters: {
        season,
        week,
        player_id,
        team,
        limit
      }
    })
  } catch (error: any) {
    console.error("API error:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { error: "Failed to fetch NGS stats", message: error.message },
      { status: 500 }
    )
  }
}

