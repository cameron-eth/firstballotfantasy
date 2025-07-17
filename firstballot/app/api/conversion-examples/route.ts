import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get("position") || "ALL"
    const season = parseInt(searchParams.get("season") || "2024")

    console.log("Conversion examples query params:", { position, season })

    let query = supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        recent_team,
        fantasy_ppg,
        predicted_fantasy_ppg,
        prediction_error,
        tier,
        position_tier,
        games_played,
        player_name_std
      `)
      .eq("season", season)
      .not("fantasy_ppg", "is", null)
      .gte("games_played", 6)
      .order("fantasy_ppg", { ascending: false })

    // Filter by position if not ALL
    if (position !== "ALL") {
      query = query.eq("position", position)
    }

    const { data, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    // Process data with proper type casting
    const processedData = (data || []).map((item: any) => ({
      ...item,
      fantasy_ppg: Number(item.fantasy_ppg) || 0,
      predicted_fantasy_ppg: Number(item.predicted_fantasy_ppg) || 0,
      prediction_error: Number(item.prediction_error) || 0,
      season: Number(item.season) || 0,
      games_played: Number(item.games_played) || 0,
      // Use player_name_std as player_id for headshots
      player_id: item.player_name_std?.replace(/\s+/g, '-').toLowerCase()
    }))

    // Remove duplicate players - keep only the most recent record for each player
    const uniquePlayers = new Map()
    processedData.forEach((player: any) => {
      const playerKey = player.player_name_std || player.player_name
      if (!uniquePlayers.has(playerKey) || uniquePlayers.get(playerKey).season < player.season) {
        uniquePlayers.set(playerKey, player)
      }
    })

    const deduplicatedData = Array.from(uniquePlayers.values())

    // Group by tier and get top 5 examples in each tier
    const tierGroups: { [key: string]: any[] } = {}
    
    deduplicatedData.forEach((player: any) => {
      const tier = player.tier || player.position_tier || "Unknown"
      if (!tierGroups[tier]) {
        tierGroups[tier] = []
      }
      tierGroups[tier].push(player)
    })

    // Get top 5 players from each tier for examples
    const examplesByTier: { [key: string]: any[] } = {}
    Object.entries(tierGroups).forEach(([tier, players]) => {
      examplesByTier[tier] = players.slice(0, 5) // Top 5 examples in each tier
    })

    console.log("Examples by tier:", Object.keys(examplesByTier))
    return NextResponse.json({ data: examplesByTier })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 