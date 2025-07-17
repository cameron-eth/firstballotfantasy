"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TierExamples } from "@/components/tier-examples"
import { supabase } from "@/lib/supabase"

const positions = ["ALL", "QB", "RB", "WR", "TE"]

interface AllPositionsData {
  draft_round: string
  elite_percentage: number
  tier1_percentage: number
  tier2_percentage: number
  startable_percentage: number
  streamer_percentage: number
}

interface PositionData {
  position: string
  draft_round: string
  elite_percentage: number
  tier1_percentage: number
  tier2_percentage: number
  startable_percentage: number
  streamer_percentage: number
}

interface DraftSuccessData {
  draft_round: string
  elite_hit_rate: number
  tier1_plus_hit_rate: number
  analysis: string
}

interface ProspectTierData {
  position: string
  prospect_tier: string
  total_players: number
  elite_percentage: number
  tier1_percentage: number
  tier2_percentage: number
  startable_percentage: string | number
  streamer_percentage: number
}

const tierColors = {
  Elite: "bg-purple-500",
  "Tier 1": "bg-green-500",
  "Tier 2": "bg-yellow-500",
  Startable: "bg-orange-500",
  Streamer: "bg-gray-500",
}

export default function ConversionPage() {
  const [activePosition, setActivePosition] = useState("ALL")
  const [allPositionsData, setAllPositionsData] = useState<AllPositionsData[]>([])
  const [positionData, setPositionData] = useState<PositionData[]>([])
  const [successRatesData, setSuccessRatesData] = useState<DraftSuccessData[]>([])
  const [prospectTierData, setProspectTierData] = useState<ProspectTierData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConversionData()
  }, [activePosition])

  const fetchConversionData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all positions data
      const { data: allPosData, error: allPosError } = await supabase
        .from("all_positions_draft_round_breakdown")
        .select("*")
        .order("draft_round")

      if (allPosError) throw allPosError

      // Fetch position-specific data
      const { data: posData, error: posError } = await supabase
        .from("position_draft_round_breakdown")
        .select("*")
        .order("position, draft_round")

      if (posError) throw posError

      // Fetch success rates data
      const { data: successData, error: successError } = await supabase
        .from("draft_success_rates")
        .select("*")
        .order("draft_round")

      if (successError) throw successError

      // Fetch prospect tier breakdown data via API
      console.log("Fetching prospect tier breakdown data...")
      const prospectResponse = await fetch("/api/prospect-tier-breakdown")
      if (!prospectResponse.ok) {
        console.error("Prospect tier API response not ok:", prospectResponse.status, prospectResponse.statusText)
        throw new Error(`Failed to fetch prospect tier breakdown data: ${prospectResponse.status} ${prospectResponse.statusText}`)
      }
      
      const prospectResult = await prospectResponse.json()
      console.log("Prospect tier API response:", prospectResult)
      
      if (prospectResult.error) {
        throw new Error(prospectResult.error)
      }

      // Validate the response structure
      if (!prospectResult.data || !Array.isArray(prospectResult.data)) {
        console.warn("Invalid prospect tier data structure, using empty array")
        setProspectTierData([])
      } else {
        setProspectTierData(prospectResult.data)
      }

      setAllPositionsData(allPosData || [])
      setPositionData(posData || [])
      setSuccessRatesData(successData || [])
    } catch (err) {
      console.error("Error fetching conversion data:", err)
      setError("Failed to load conversion data")
    } finally {
      setLoading(false)
    }
  }

  const getIntensity = (value: number) => {
    if (value >= 30) return "opacity-100"
    if (value >= 20) return "opacity-80"
    if (value >= 10) return "opacity-60"
    if (value >= 5) return "opacity-40"
    return "opacity-20"
  }

  const getCurrentData = () => {
    if (activePosition === "ALL") {
      return allPositionsData.map((row) => ({
        draft_round: row.draft_round,
        Elite: row.elite_percentage,
        "Tier 1": row.tier1_percentage,
        "Tier 2": row.tier2_percentage,
        Startable: row.startable_percentage,
        Streamer: row.streamer_percentage,
      }))
    } else {
      return positionData
        .filter((row) => row.position === activePosition)
        .map((row) => ({
          draft_round: row.draft_round,
          Elite: row.elite_percentage,
          "Tier 1": row.tier1_percentage,
          "Tier 2": row.tier2_percentage,
          Startable: row.startable_percentage,
          Streamer: row.streamer_percentage,
        }))
    }
  }

  const getSuccessRateForPosition = (draftRound: string) => {
    const successRate = successRatesData.find((row) => row.draft_round === draftRound)
    return successRate || { elite_hit_rate: 0, tier1_plus_hit_rate: 0, analysis: "" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING CONVERSION DATA...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
              <button
                onClick={fetchConversionData}
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
              >
                RETRY
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentData = getCurrentData()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">CONVERSION ANALYSIS</h1>
          <p className="text-green-400">Draft position to professional tier conversion rates • Live Data</p>
        </div>

        {/* Position Filter */}
        <div className="flex space-x-1 mb-8 bg-slate-800 p-1 rounded-lg w-fit">
          {positions.map((position) => (
            <button
              key={position}
              onClick={() => setActivePosition(position)}
              className={`px-4 py-2 font-mono text-sm transition-colors rounded-lg ${
                activePosition === position
                  ? "bg-yellow-400 text-slate-900"
                  : "text-gray-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              {position}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Draft Round to Pro Tier Heatmap */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">
                {activePosition === "ALL" ? "DRAFT ROUND → PRO TIER" : `${activePosition} DRAFT ROUND → PRO TIER`}
              </CardTitle>
              <p className="text-green-400 text-sm">
                {activePosition === "ALL"
                  ? "Conversion percentages by draft position (all positions)"
                  : `${activePosition} conversion percentages by draft position`}
              </p>
            </CardHeader>
            <CardContent>
              {currentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left font-mono text-sm text-gray-400 p-2">Draft Round</th>
                        {Object.keys(tierColors).map((tier) => (
                          <th key={tier} className="text-center font-mono text-sm text-gray-400 p-2">
                            {tier}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((row) => (
                        <tr key={row.draft_round} className="border-t border-slate-700">
                          <td className="font-mono text-white p-2">{row.draft_round}</td>
                          {Object.entries(tierColors).map(([tier, colorClass]) => {
                            const value = row[tier as keyof typeof row] as number
                            return (
                              <td key={tier} className="p-2 text-center">
                                <div
                                  className={`w-full h-8 rounded flex items-center justify-center font-mono text-sm text-white ${colorClass} ${getIntensity(
                                    value,
                                  )}`}
                                >
                                  {value.toFixed(1)}%
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 font-mono">No data available for {activePosition}</p>
                </div>
              )}
            </CardContent>
          </Card>

       

          {/* Success Rate Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">SUCCESS RATES</CardTitle>
              <p className="text-green-400 text-sm">Hit rates by draft position • Live Data</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {successRatesData.slice(0, 4).map((successRate) => (
                  <div key={successRate.draft_round} className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-green-400 font-mono text-sm mb-2">
                        {successRate.draft_round.toUpperCase()} ANALYSIS
                      </h3>
                      <p className="text-gray-300 text-sm mb-2">
                        {successRate.tier1_plus_hit_rate.toFixed(1)}% achieve Tier 1+ status
                      </p>
                      <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-green-400 h-2 rounded-full"
                          style={{ width: `${successRate.tier1_plus_hit_rate}%` }}
                        ></div>
                      </div>
                      {successRate.analysis && <p className="text-gray-400 text-xs">{successRate.analysis}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Examples */}
          <TierExamples activePosition={activePosition} />
        </div>

        {/* Key Insights */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono">
              {activePosition === "ALL" ? "CONVERSION INSIGHTS" : `${activePosition} CONVERSION INSIGHTS`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">LIVE DATA SOURCE</h3>
                  <p className="text-gray-300 text-sm">
                    This analysis uses real-time data from our Supabase database, reflecting the most current draft
                    conversion patterns and success rates.
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">DRAFT CAPITAL VALUE</h3>
                  <p className="text-gray-300 text-sm">
                    Early round picks consistently show higher success rates across all positions, validating the
                    importance of draft capital in player evaluation.
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">POSITION VARIANCE</h3>
                  <p className="text-gray-300 text-sm">
                    Success rates vary significantly by position. Use the position filter to explore specific patterns
                    for QBs, RBs, WRs, and TEs.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
