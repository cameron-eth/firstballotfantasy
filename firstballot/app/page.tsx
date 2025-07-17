"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Target } from "lucide-react"

interface OverviewData {
  topPerformers: any[]
  topPredictions: any[]
  breakouts: any[]
  busts: any[]
  positionStats: any[]
  overallStats: {
    totalRecords: number
    uniquePlayers: number
    seasonsAnalyzed: number
    overallR2: number
    pipelineRuntime: number
  }
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/overview")
      if (!response.ok) {
        throw new Error("Failed to fetch overview data")
      }
      const result = await response.json()

      setData(result)
    } catch (err) {
      console.error("Error fetching overview data:", err)
      setError("Failed to load overview data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING OVERVIEW DATA...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error || "Failed to load data"}</p>
              <button
                onClick={fetchOverviewData}
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

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono">FIRST BALLOT FANTASY</CardTitle>
                <p className="text-green-400 text-sm">
                  Comprehensive analysis of Fantasy Football performance prediction (2015-2024)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="gradient-border">
                  <div className="gradient-border-content">
                    <h3 className="text-green-400 font-mono mb-2">BACKGROUND</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      To evaluate the predictability and patterns of fantasy football performance by analyzing 5,562
                      skill position player seasons across 1,384 unique players. This project aims to identify which
                      factors most strongly correlate with fantasy success and create reliable tier classifications for
                      player evaluation.
                    </p>
                  </div>
                </div>

                <div className="gradient-border">
                  <div className="gradient-border-content">
                    <h3 className="text-green-400 font-mono mb-2">MODEL STATUS</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Interpreting R² (R² = 0.74): The model explains 74% of fantasy performance variance, indicating
                      strong predictive capability. Cross-validation with 5-fold splits ensures robust performance
                      across different data subsets. Key features include career games played, draft position, and
                      combine metrics.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-gray-400">TOTAL RECORDS</span>
                    </div>
                    <p className="text-xl font-mono text-white">{data.overallStats.totalRecords.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">UNIQUE PLAYERS</span>
                    </div>
                    <p className="text-xl font-mono text-white">{data.overallStats.uniquePlayers.toLocaleString()}</p>
                  </div>
                </div>

                {/* Position Breakdown */}
                <div className="gradient-border">
                  <div className="gradient-border-content">
                    <h3 className="text-green-400 font-mono mb-3">POSITION BREAKDOWN</h3>
                    <div className="space-y-2">
                      {data.positionStats.map((pos: any) => (
                        <div key={pos.position} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-slate-900 font-mono text-xs font-bold">
                              {pos.position}
                            </div>
                            <span className="text-gray-300 text-sm">{pos.records} records</span>
                          </div>
                          <div className="text-right">
                            <span className="text-yellow-400 font-mono text-sm">{pos.percentage}%</span>
                            {pos.avgPPG > 0 && <p className="text-xs text-gray-400">{pos.avgPPG} avg PPG</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - keep existing content */}
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono">TOP PERFORMERS</CardTitle>
                <p className="text-green-400 text-sm">Highest actual fantasy PPG by season</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topPerformers.map((player: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-slate-900 font-mono text-sm font-bold">
                          {player.position}
                        </div>
                        <div>
                          <p className="font-mono text-white">{player.player_name}</p>
                          <p className="text-xs text-gray-400">
                            {player.season} • {player.tier || player.position_tier}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-green-400">{player.fantasy_ppg?.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">PPG</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono">MODEL PREDICTIONS</CardTitle>
                <p className="text-green-400 text-sm">Highest predicted fantasy PPG</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topPredictions.map((player: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 font-mono text-sm font-bold">
                          {player.position}
                        </div>
                        <div>
                          <p className="font-mono text-white">{player.player_name}</p>
                          <p className="text-xs text-gray-400">
                            {player.season} • {player.tier || player.position_tier}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-yellow-400">{player.predicted_fantasy_ppg?.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">PPG</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono text-sm flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    BREAKOUTS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.breakouts.map((player: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-mono text-white text-sm">{player.player_name}</p>
                          <p className="text-xs text-gray-400">{player.position}</p>
                        </div>
                        <p className="font-mono text-green-400 text-sm">+{player.prediction_error?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 font-mono text-sm flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2" />
                    BUSTS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.busts.map((player: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-mono text-white text-sm">{player.player_name}</p>
                          <p className="text-xs text-gray-400">{player.position}</p>
                        </div>
                        <p className="font-mono text-red-400 text-sm">{player.prediction_error?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
