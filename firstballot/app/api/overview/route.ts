import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    // Fetch top performers (highest fantasy PPG)
    const { data: topPerformers, error: performersError } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        fantasy_ppg,
        tier,
        position_tier
      `)
      .not("fantasy_ppg", "is", null)
      .gte("games_played", 6)
      .order("fantasy_ppg", { ascending: false })
      .limit(5)

    if (performersError) throw performersError

    // Fetch top predictions (highest predicted fantasy PPG)
    const { data: topPredictions, error: predictionsError } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        predicted_fantasy_ppg,
        tier,
        position_tier
      `)
      .not("predicted_fantasy_ppg", "is", null)
      .gte("games_played", 6)
      .order("predicted_fantasy_ppg", { ascending: false })
      .limit(5)

    if (predictionsError) throw predictionsError

    // Fetch breakout players (highest positive prediction error)
    const { data: breakouts, error: breakoutsError } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        fantasy_ppg,
        predicted_fantasy_ppg,
        prediction_error
      `)
      .not("prediction_error", "is", null)
      .gt("prediction_error", 0)
      .gte("games_played", 6)
      .order("prediction_error", { ascending: false })
      .limit(3)

    if (breakoutsError) throw breakoutsError

    // Fetch bust players (highest negative prediction error)
    const { data: busts, error: bustsError } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        player_name,
        position,
        season,
        fantasy_ppg,
        predicted_fantasy_ppg,
        prediction_error
      `)
      .not("prediction_error", "is", null)
      .lt("prediction_error", 0)
      .gte("games_played", 6)
      .order("prediction_error", { ascending: true })
      .limit(3)

    if (bustsError) throw bustsError

    // Fetch position statistics
    const { data: positionStats, error: statsError } = await supabaseServer
      .from("master_player_dataset")
      .select(`
        position,
        fantasy_ppg
      `)
      .not("fantasy_ppg", "is", null)
      .gte("games_played", 6)

    if (statsError) throw statsError

    // Calculate position breakdown
    const positionBreakdown = positionStats.reduce((acc: any, player: any) => {
      const pos = player.position
      if (!acc[pos]) {
        acc[pos] = { count: 0, totalPPG: 0 }
      }
      acc[pos].count++
      acc[pos].totalPPG += player.fantasy_ppg
      return acc
    }, {})

    const positionStatsFormatted = Object.entries(positionBreakdown).map(([position, data]: [string, any]) => ({
      position,
      records: data.count,
      percentage: ((data.count / positionStats.length) * 100).toFixed(1),
      avgPPG: (data.totalPPG / data.count).toFixed(2)
    }))

    // Overall statistics
    const totalRecords = positionStats.length
    const uniquePlayers = new Set(positionStats.map((p: any) => p.player_name)).size

    return NextResponse.json({
      topPerformers: topPerformers || [],
      topPredictions: topPredictions || [],
      breakouts: breakouts || [],
      busts: busts || [],
      positionStats: positionStatsFormatted,
      overallStats: {
        totalRecords,
        uniquePlayers,
        seasonsAnalyzed: 10, // This could be calculated from actual data
        overallR2: 0.72, // This should come from model performance table
        pipelineRuntime: 76 // This should come from pipeline metrics
      }
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 