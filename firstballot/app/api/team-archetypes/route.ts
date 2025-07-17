import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    // Fetch tier distribution data from aggregated stats
    const { data: tierStats, error: tierError } = await supabaseServer
      .from("master_aggregated_stats")
      .select(`
        tier,
        position,
        player_count,
        avg_fantasy_ppg
      `)
      .not("tier", "is", null)
      .gte("season", 2020)

    if (tierError) throw tierError

    // Calculate tier distribution percentages
    const totalPlayers = tierStats.reduce((sum: number, stat: any) => sum + (stat.player_count || 0), 0)
    
    const tierDistribution = tierStats.reduce((acc: any, stat: any) => {
      const tier = stat.tier
      if (!acc[tier]) {
        acc[tier] = {
          percentage: 0,
          players: 0,
          avgPPG: 0,
          count: 0
        }
      }
      acc[tier].players += stat.player_count || 0
      acc[tier].avgPPG += (stat.avg_fantasy_ppg || 0) * (stat.player_count || 0)
      acc[tier].count++
      return acc
    }, {})

    // Calculate percentages and average PPG
    Object.keys(tierDistribution).forEach(tier => {
      const data = tierDistribution[tier]
      data.percentage = ((data.players / totalPlayers) * 100).toFixed(1)
      data.avgPPG = (data.avgPPG / data.players).toFixed(1)
    })

    // Define team archetypes based on tier distribution
    const teamArchetypes = [
      {
        id: "superstar",
        name: "SUPERSTAR BUILD",
        description: "Build around 1-2 elite players",
        strategy: "Draft 1-2 elite players early, fill roster with solid contributors",
        probability: "15%",
        expectedPPG: 145,
        riskLevel: "High",
        roster: {
          QB: { tier: "Tier 1", ppg: 18 },
          RB1: { tier: "Elite", ppg: 25 },
          RB2: { tier: "Tier 2", ppg: 13 },
          WR1: { tier: "Elite", ppg: 24 },
          WR2: { tier: "Tier 1", ppg: 17 },
          TE: { tier: "Startable", ppg: 8 },
          FLEX: { tier: "Tier 2", ppg: 12 },
        },
        pros: ["Highest ceiling", "Game-breaking potential", "Weekly advantage at key positions"],
        cons: ["Low probability", "Expensive draft capital", "Depth concerns"],
        draftStrategy: [
          "Target elite RB/WR in rounds 1-2",
          "Find value QB in middle rounds",
          "Build depth with consistent players",
        ],
      },
      {
        id: "balanced",
        name: "BALANCED BUILD",
        description: "Multiple Tier 1-2 players across positions",
        strategy: "Avoid elite tier, focus on consistent Tier 1-2 players",
        probability: "45%",
        expectedPPG: 135,
        riskLevel: "Medium",
        roster: {
          QB: { tier: "Tier 1", ppg: 18 },
          RB1: { tier: "Tier 1", ppg: 17 },
          RB2: { tier: "Tier 2", ppg: 13 },
          WR1: { tier: "Tier 1", ppg: 17 },
          WR2: { tier: "Tier 2", ppg: 13 },
          TE: { tier: "Tier 1", ppg: 14 },
          FLEX: { tier: "Tier 2", ppg: 12 },
        },
        pros: ["High probability", "Consistent scoring", "Good depth potential"],
        cons: ["Lower ceiling", "Less weekly upside", "Harder to overcome bad weeks"],
        draftStrategy: ["Target proven commodities", "Avoid reaching for upside", "Focus on floor over ceiling"],
      },
      {
        id: "value",
        name: "VALUE BUILD",
        description: "Target undervalued players and late-round gems",
        strategy: "Find players outperforming their tier expectations",
        probability: "65%",
        expectedPPG: 125,
        riskLevel: "Medium",
        roster: {
          QB: { tier: "Tier 2", ppg: 15 },
          RB1: { tier: "Tier 1", ppg: 17 },
          RB2: { tier: "Startable", ppg: 10 },
          WR1: { tier: "Tier 1", ppg: 17 },
          WR2: { tier: "Startable", ppg: 9 },
          TE: { tier: "Startable", ppg: 8 },
          FLEX: { tier: "Startable", ppg: 9 },
        },
        pros: ["High probability", "Extra draft capital", "Breakout potential"],
        cons: ["Lower floor", "More research required", "Boom/bust nature"],
        draftStrategy: [
          "Target players in new situations",
          "Focus on opportunity over talent",
          "Stream positions like TE/QB",
        ],
      },
      {
        id: "upside",
        name: "UPSIDE BUILD",
        description: "Target players with breakout potential",
        strategy: "Focus on young players and situation changes",
        probability: "25%",
        expectedPPG: 140,
        riskLevel: "High",
        roster: {
          QB: { tier: "Startable", ppg: 12 },
          RB1: { tier: "Tier 1", ppg: 17 },
          RB2: { tier: "Startable", ppg: 11 },
          WR1: { tier: "Tier 1", ppg: 17 },
          WR2: { tier: "Tier 2", ppg: 15 },
          TE: { tier: "Tier 2", ppg: 12 },
          FLEX: { tier: "Startable", ppg: 11 },
        },
        pros: ["High ceiling if hits", "League-winning potential", "Contrarian approach"],
        cons: ["Very volatile", "Requires luck", "Can bust completely"],
        draftStrategy: ["Target 2nd year players", "Focus on opportunity changes", "Handcuff key players"],
      },
      {
        id: "anchor",
        name: "ANCHOR BUILD",
        description: "Build around one elite QB or TE",
        strategy: "Secure elite production at scarce position, balance elsewhere",
        probability: "35%",
        expectedPPG: 138,
        riskLevel: "Medium",
        roster: {
          QB: { tier: "Elite", ppg: 26 },
          RB1: { tier: "Tier 1", ppg: 16 },
          RB2: { tier: "Tier 2", ppg: 12 },
          WR1: { tier: "Tier 1", ppg: 16 },
          WR2: { tier: "Tier 2", ppg: 13 },
          TE: { tier: "Tier 1", ppg: 14 },
          FLEX: { tier: "Startable", ppg: 9 },
        },
        pros: ["Positional advantage", "Consistent elite production", "Easier to execute"],
        cons: ["Opportunity cost at skill positions", "Less explosive plays", "QB/TE dependent"],
        draftStrategy: ["Draft elite QB/TE early", "Target volume-based skill players", "Focus on safe floors"],
      },
      {
        id: "committee",
        name: "COMMITTEE BUILD",
        description: "No stars, all solid contributors",
        strategy: "Avoid elite tier completely, maximize Tier 2 players",
        probability: "70%",
        expectedPPG: 128,
        riskLevel: "Low",
        roster: {
          QB: { tier: "Tier 2", ppg: 14 },
          RB1: { tier: "Tier 2", ppg: 13 },
          RB2: { tier: "Tier 2", ppg: 12 },
          WR1: { tier: "Tier 2", ppg: 13 },
          WR2: { tier: "Tier 2", ppg: 12 },
          TE: { tier: "Tier 2", ppg: 11 },
          FLEX: { tier: "Tier 2", ppg: 11 },
        },
        pros: ["Very high probability", "Excellent depth", "Injury protection"],
        cons: ["Lowest ceiling", "Hard to win weeks", "Lacks game-breakers"],
        draftStrategy: ["Avoid first 2 rounds of each position", "Target consistent veterans", "Build deep bench"],
      },
      {
        id: "championship",
        name: "CHAMPIONSHIP BUILD",
        description: "Win-now mentality with proven veterans",
        strategy: "Target players with championship pedigree and consistency",
        probability: "40%",
        expectedPPG: 142,
        riskLevel: "Medium",
        roster: {
          QB: { tier: "Tier 1", ppg: 19 },
          RB1: { tier: "Elite", ppg: 24 },
          RB2: { tier: "Tier 1", ppg: 16 },
          WR1: { tier: "Tier 1", ppg: 18 },
          WR2: { tier: "Tier 1", ppg: 16 },
          TE: { tier: "Tier 2", ppg: 12 },
          FLEX: { tier: "Tier 2", ppg: 13 },
        },
        pros: ["Playoff-tested players", "High floor", "Experience advantage"],
        cons: ["Age concerns", "Limited upside", "Expensive in auction"],
        draftStrategy: ["Target 26-29 age range", "Prioritize playoff performers", "Avoid injury-prone players"],
      },
      {
        id: "contrarian",
        name: "CONTRARIAN BUILD",
        description: "Fade popular picks, target overlooked players",
        strategy: "Zig when others zag, find value in unpopular players",
        probability: "30%",
        expectedPPG: 132,
        riskLevel: "High",
        roster: {
          QB: { tier: "Startable", ppg: 11 },
          RB1: { tier: "Tier 2", ppg: 14 },
          RB2: { tier: "Startable", ppg: 10 },
          WR1: { tier: "Tier 1", ppg: 18 },
          WR2: { tier: "Tier 1", ppg: 16 },
          TE: { tier: "Startable", ppg: 9 },
          FLEX: { tier: "Tier 2", ppg: 13 },
        },
        pros: ["Lower ownership", "Unique lineup construction", "Leverage opportunity"],
        cons: ["Requires deep research", "Can backfire badly", "Unpredictable outcomes"],
        draftStrategy: ["Fade consensus rankings", "Target situation changes", "Stream QB/TE aggressively"],
      },
      {
        id: "analytics",
        name: "ANALYTICS BUILD",
        description: "Pure data-driven approach",
        strategy: "Follow model predictions and advanced metrics strictly",
        probability: "50%",
        expectedPPG: 136,
        riskLevel: "Medium",
        roster: {
          QB: { tier: "Tier 1", ppg: 18 },
          RB1: { tier: "Tier 1", ppg: 17 },
          RB2: { tier: "Tier 2", ppg: 13 },
          WR1: { tier: "Tier 1", ppg: 17 },
          WR2: { tier: "Tier 2", ppg: 13 },
          TE: { tier: "Tier 1", ppg: 14 },
          FLEX: { tier: "Tier 2", ppg: 12 },
        },
        pros: ["Evidence-based decisions", "Consistent methodology", "Reduced bias"],
        cons: ["Over-reliance on data", "Misses intangibles", "Can be too rigid"],
        draftStrategy: ["Follow model rankings", "Target efficiency metrics", "Ignore narrative factors"],
      },
    ]

    return NextResponse.json({
      tierDistribution,
      teamArchetypes
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 