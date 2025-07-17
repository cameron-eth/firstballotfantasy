import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get("type") || "all"

    let result: any = {}

    if (dataType === "all" || dataType === "model") {
              // Fetch model performance
        const { data: modelData, error: modelError } = await supabaseServer
        .from("master_model_performance")
        .select("*")
        .limit(1)

      if (modelError) throw modelError
      result.modelPerformance = modelData || []
    }

    if (dataType === "all" || dataType === "stats") {
      // Fetch aggregated stats
      const { data: statsData, error: statsError } = await supabaseServer
        .from("master_aggregated_stats")
        .select("*")
        .gte("season", 2020)
        .order("position")
        .order("season", { ascending: false })
        .order("avg_fantasy_ppg", { ascending: false })

      if (statsError) throw statsError
      result.aggregatedStats = statsData || []
    }

    if (dataType === "all" || dataType === "draft") {
      // Fetch draft success rates
      const { data: draftData, error: draftError } = await supabaseServer
        .from("draft_success_rates")
        .select("*")
        .order("draft_round")

      if (draftError) throw draftError
      result.draftSuccess = draftData || []
    }

    if (dataType === "all" || dataType === "breakout") {
      // Fetch breakout/bust analysis
      try {
        const { data: bbData, error: bbError } = await supabaseServer
          .from("master_breakout_bust")
          .select(`
            player_name,
            position,
            season,
            fantasy_ppg,
            predicted_fantasy_ppg,
            prediction_error,
            analysis_type,
            surprise_factor,
            performance_ratio,
            tier_upgrade,
            tier_downgrade,
            player_id,
            recent_team
          `)
          .order("surprise_factor", { ascending: false })
          .limit(50)

        if (bbError) throw bbError
        result.breakoutBust = bbData || []
      } catch (bbErr: any) {
        if (!String(bbErr?.message).includes("does not exist")) {
          console.error("Breakout/Bust query failed:", bbErr)
        }
        result.breakoutBust = []
      }
    }

    if (dataType === "all" || dataType === "prospect") {
      // Fetch prospect analysis
      const { data: prospectData, error: prospectError } = await supabaseServer
        .from("master_prospect_analysis")
        .select("*")
        .eq("analysis_type", "prospect_tier")
        .order("hit_rate", { ascending: false })

      if (prospectError) throw prospectError
      result.prospectAnalysis = prospectData || []
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 