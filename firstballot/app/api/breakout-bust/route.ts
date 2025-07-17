import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisType = searchParams.get("type") || "breakout"
    const limit = parseInt(searchParams.get("limit") || "50")

    // Query the main player dataset and filter for breakout/bust players
    const { data, error } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        recent_team,
        fantasy_ppg,
        predicted_fantasy_ppg,
        prediction_error,
        age,
        prospect_tier,
        round,
        player_name_std,
        tier,
        position_tier,
        is_breakout,
        is_bust,
        prediction_accuracy
      `)
      .eq("position", "QB") // We'll filter by position later if needed
      .gte("season", 2020)
      .not("fantasy_ppg", "is", null)
      .gte("games_played", 6)
      .order("prediction_accuracy", { ascending: analysisType === "breakout" ? false : true })
      .limit(100)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    // Process data and filter for breakout/bust players
    const processedData = (data || []).map((item: any) => {
      const fantasy_ppg = Number(item.fantasy_ppg) || 0
      const predicted_ppg = Number(item.predicted_fantasy_ppg) || 0
      const prediction_error = Number(item.prediction_error) || 0
      const surprise_factor = Math.abs(prediction_error)
      const performance_ratio = fantasy_ppg / predicted_ppg || 0
      
      return {
        ...item,
        fantasy_ppg,
        predicted_fantasy_ppg: predicted_ppg,
        prediction_error,
        surprise_factor,
        performance_ratio,
        age: Number(item.age) || 0,
        season: Number(item.season) || 0,
        tier_upgrade: Boolean(item.is_breakout),
        tier_downgrade: Boolean(item.is_bust),
        draft_round: item.round || "Undrafted",
        player_id: item.player_name_std?.replace(/\s+/g, '-').toLowerCase()
      }
    })

    // Filter based on analysis type
    const filteredData = processedData.filter((player: any) => {
      if (analysisType === "breakout") {
        return player.is_breakout || player.prediction_error > 0
      } else if (analysisType === "bust") {
        return player.is_bust || player.prediction_error < 0
      }
      return true
    })

    // Sort by surprise factor (absolute prediction error)
    const sortedData = filteredData.sort((a: any, b: any) => {
      if (analysisType === "breakout") {
        return b.surprise_factor - a.surprise_factor
      } else {
        return a.surprise_factor - b.surprise_factor
      }
    })

    return NextResponse.json({ data: sortedData.slice(0, limit) })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 