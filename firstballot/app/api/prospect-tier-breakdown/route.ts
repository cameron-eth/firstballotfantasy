import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching prospect tier breakdown data from database...")
    
    const { data, error } = await supabaseServer
      .from("position_prospect_tier_breakdown")
      .select("*")
      .order("position", { ascending: true })
      .order("prospect_tier", { ascending: true })

    if (error) {
      console.error("Database error fetching prospect tier breakdown data:", error)
      return NextResponse.json({ 
        error: "Failed to fetch prospect tier breakdown data",
        details: error.message
      }, { status: 500 })
    }

    // If no data returned from database, return empty array
    if (!data || data.length === 0) {
      console.log("No prospect tier breakdown data found in database")
      return NextResponse.json({ 
        data: [],
        message: "No prospect tier breakdown data available"
      })
    }

    console.log(`Successfully fetched ${data.length} prospect tier records from database`)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error in prospect tier breakdown API:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 