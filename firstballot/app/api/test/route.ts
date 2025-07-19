import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    console.log("Testing position_draft_round_breakdown data...")
    
    // Fetch QB data specifically
    const { data: qbData, error: qbError } = await supabaseServer
      .from("position_draft_round_breakdown")
      .select("*")
      .eq("position", "QB")
      .order("draft_round")

    if (qbError) {
      console.error("Database error:", qbError)
      return NextResponse.json({ error: "Failed to fetch QB data" }, { status: 500 })
    }

    console.log("QB data from database:", qbData)

    // Check for QBs with "Startable" tier in master_player_dataset
    const { data: startableQBs, error: startableError } = await supabaseServer
      .from("master_player_dataset")
      .select("player_name, tier, position_tier, fantasy_ppg")
      .eq("position", "QB")
      .eq("season", 2024)
      .or("tier.eq.Startable,position_tier.eq.Startable")
      .limit(10)

    if (startableError) {
      console.error("Database error:", startableError)
      return NextResponse.json({ error: "Failed to fetch startable QBs" }, { status: 500 })
    }

    console.log("Startable QBs from database:", startableQBs)

    // Also fetch a sample of all positions data
    const { data: allData, error: allError } = await supabaseServer
      .from("position_draft_round_breakdown")
      .select("*")
      .limit(20)
      .order("position, draft_round")

    if (allError) {
      console.error("Database error:", allError)
      return NextResponse.json({ error: "Failed to fetch all data" }, { status: 500 })
    }

    console.log("Sample of all position data:", allData)

    return NextResponse.json({ 
      qbData,
      startableQBs,
      sampleData: allData,
      message: "Database inspection complete"
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 