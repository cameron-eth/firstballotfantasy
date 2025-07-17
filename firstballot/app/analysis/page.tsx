"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerHeadshot } from "@/components/player-headshot"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ScatterChart,
  Scatter,
  Area,
  AreaChart,
} from "recharts"

interface ModelPerformance {
  model: string
  r2: number
  rmse: number
  cv_r2_mean: number
  cv_rmse_mean: number
  feature_count: number
  total_players: number
  avg_actual_ppg: number
  avg_predicted_ppg: number
  top_features: string
}

interface AggregatedStats {
  position: string
  season: number
  tier: string
  avg_fantasy_ppg: number
  player_count: number
  avg_age: number
  avg_games_played: number
  std_fantasy_ppg: number
  avg_prediction_error: number
}

interface DraftSuccessRates {
  draft_round: string
  total_players: number
  elite_hit_rate: number
  tier1_hit_rate: number
  tier1_plus_hit_rate: number
  analysis: string
}

interface BreakoutBust {
  player_name: string
  position: string
  season: number
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  analysis_type: string
  surprise_factor: number
  performance_ratio: number
  tier_upgrade: boolean
  tier_downgrade: boolean
  player_id?: string
  recent_team?: string
}

interface ProspectAnalysis {
  prospect_tier: string
  analysis_type: string
  elite_count: number
  total_count: number
  hit_rate: number
  success_rate: number
}

export default function AnalysisPage() {
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([])
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats[]>([])
  const [draftSuccess, setDraftSuccess] = useState<DraftSuccessRates[]>([])
  const [breakoutBust, setBreakoutBust] = useState<BreakoutBust[]>([])
  const [prospectAnalysis, setProspectAnalysis] = useState<ProspectAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sort state for each chart
  const [positionSort, setPositionSort] = useState<'avgPPG' | 'totalPlayers' | 'avgError'>('avgPPG')
  const [tierSort, setTierSort] = useState<'value' | 'avgPPG'>('value')
  const [draftSort, setDraftSort] = useState<'eliteRate' | 'tier1PlusRate' | 'totalPlayers'>('eliteRate')
  const [prospectSort, setProspectSort] = useState<'hitRate' | 'successRate' | 'totalCount'>('hitRate')
  const [breakoutSort, setBreakoutSort] = useState<'surprise_factor' | 'fantasy_ppg' | 'performance_ratio'>('surprise_factor')
  const [bustSort, setBustSort] = useState<'surprise_factor' | 'fantasy_ppg' | 'performance_ratio'>('surprise_factor')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch all analysis data from API
        const response = await fetch("/api/analysis?type=all")
        if (!response.ok) {
          throw new Error("Failed to fetch analysis data")
        }
        const result = await response.json()

        setModelPerformance(result.modelPerformance || [])
        setAggregatedStats(result.aggregatedStats || [])
        setDraftSuccess(result.draftSuccess || [])
        setBreakoutBust(result.breakoutBust || [])
        setProspectAnalysis(result.prospectAnalysis || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load analytics data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING COMPREHENSIVE ANALYTICS...</p>
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
                onClick={() => window.location.reload()}
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

  // Process data for enhanced visualizations
  const positionPerformance = aggregatedStats
    .filter((stat) => stat.season === 2024)
    .reduce(
      (acc, stat) => {
        const existing = acc.find((p) => p.position === stat.position)
        if (existing) {
          existing.avgPPG = Math.max(existing.avgPPG, stat.avg_fantasy_ppg)
          existing.totalPlayers += stat.player_count
          existing.avgError = (existing.avgError + stat.avg_prediction_error) / 2
        } else {
          acc.push({
            position: stat.position,
            avgPPG: stat.avg_fantasy_ppg,
            totalPlayers: stat.player_count,
            avgError: stat.avg_prediction_error,
          })
        }
        return acc
      },
      [] as { position: string; avgPPG: number; totalPlayers: number; avgError: number }[],
    )
    .sort((a, b) => {
      if (positionSort === 'avgPPG') return b.avgPPG - a.avgPPG
      if (positionSort === 'totalPlayers') return b.totalPlayers - a.totalPlayers
      return a.avgError - b.avgError // Lower error is better
    })

  const tierDistribution = aggregatedStats
    .filter((stat) => stat.season === 2024)
    .reduce(
      (acc, stat) => {
        const existing = acc.find((t) => t.name === stat.tier)
        if (existing) {
          existing.value += stat.player_count
          existing.avgPPG = (existing.avgPPG + stat.avg_fantasy_ppg) / 2
        } else {
          acc.push({
            name: stat.tier,
            value: stat.player_count,
            avgPPG: stat.avg_fantasy_ppg,
            color: getTierColor(stat.tier),
          })
        }
        return acc
      },
      [] as { name: string; value: number; avgPPG: number; color: string }[],
    )
    .sort((a, b) => {
      if (tierSort === 'value') return b.value - a.value
      return b.avgPPG - a.avgPPG
    })

  const seasonalTrends = aggregatedStats
    .filter((stat) => ["Elite", "WR1/RB1", "Tier1"].includes(stat.tier))
    .reduce(
      (acc, stat) => {
        const existing = acc.find((s) => s.season === stat.season)
        if (existing) {
          existing.avgPPG = (existing.avgPPG + stat.avg_fantasy_ppg) / 2
          existing.playerCount += stat.player_count
        } else {
          acc.push({
            season: stat.season,
            avgPPG: stat.avg_fantasy_ppg,
            playerCount: stat.player_count,
          })
        }
        return acc
      },
      [] as { season: number; avgPPG: number; playerCount: number }[],
    )
    .sort((a, b) => a.season - b.season) // Keep chronological order for trends

  const draftRoundSuccess = draftSuccess
    .map((draft) => ({
      round: draft.draft_round.replace("Round ", "R"),
      eliteRate: Number((draft.elite_hit_rate * 100).toFixed(1)),
      tier1Rate: Number((draft.tier1_hit_rate * 100).toFixed(1)),
      tier1PlusRate: Number((draft.tier1_plus_hit_rate * 100).toFixed(1)),
      totalPlayers: draft.total_players,
      analysis: draft.analysis,
    }))
    .sort((a, b) => {
      if (draftSort === 'eliteRate') return b.eliteRate - a.eliteRate
      if (draftSort === 'tier1PlusRate') return b.tier1PlusRate - a.tier1PlusRate
      return b.totalPlayers - a.totalPlayers
    })

  const prospectTierData = prospectAnalysis
    .map((prospect) => ({
      tier: prospect.prospect_tier,
      hitRate: Number((prospect.hit_rate * 100).toFixed(1)),
      successRate: Number((prospect.success_rate * 100).toFixed(1)),
      eliteCount: prospect.elite_count,
      totalCount: prospect.total_count,
    }))
    .sort((a, b) => {
      if (prospectSort === 'hitRate') return b.hitRate - a.hitRate
      if (prospectSort === 'successRate') return b.successRate - a.successRate
      return b.totalCount - a.totalCount
    })

  const topBreakouts = breakoutBust
    .filter((player) => player.analysis_type === "breakout")
    .sort((a, b) => {
      if (breakoutSort === 'surprise_factor') return b.surprise_factor - a.surprise_factor
      if (breakoutSort === 'fantasy_ppg') return b.fantasy_ppg - a.fantasy_ppg
      return (b.performance_ratio || 0) - (a.performance_ratio || 0)
    })
    .slice(0, 12)

  const topBusts = breakoutBust
    .filter((player) => player.analysis_type === "bust")
    .sort((a, b) => {
      if (bustSort === 'surprise_factor') return a.surprise_factor - b.surprise_factor // Most negative first
      if (bustSort === 'fantasy_ppg') return a.fantasy_ppg - b.fantasy_ppg
      return (a.performance_ratio || 0) - (b.performance_ratio || 0)
    })
    .slice(0, 12)

  const predictionAccuracy = breakoutBust
    .filter((player) => player.predicted_fantasy_ppg > 0 && player.fantasy_ppg >= 0)
    .slice(0, 200)
    .map((player) => ({
      predicted: Number(player.predicted_fantasy_ppg.toFixed(2)),
      actual: Number(player.fantasy_ppg.toFixed(2)),
      error: Math.abs(player.prediction_error),
      position: player.position,
    }))

  function getTierColor(tier: string): string {
    const colors: { [key: string]: string } = {
      Elite: "#8B5CF6",
      "WR1/RB1": "#10B981",
      Tier1: "#10B981",
      QB1: "#10B981",
      RB1: "#10B981",
      TE1: "#10B981",
      "WR2/RB2": "#F59E0B",
      Tier2: "#F59E0B",
      QB2: "#F59E0B",
      RB2: "#F59E0B",
      TE2: "#F59E0B",
      Startable: "#F97316",
      "Flex/Streamer": "#6B7280",
      Streamer: "#6B7280",
      Flex: "#6B7280",
    }
    return colors[tier] || "#6B7280"
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">COMPREHENSIVE ANALYSIS</h1>
          <p className="text-green-400">Advanced analytics from master data pipeline • Live Database</p>
        </div>

        {/* Enhanced Model Performance Summary */}
        {modelPerformance.length > 0 && (
          <Card className="mb-8 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">MASTER MODEL PERFORMANCE</CardTitle>
              <p className="text-green-400 text-sm">
                {modelPerformance[0].model} • {modelPerformance[0].feature_count} features • Cross-validated
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{(modelPerformance[0].r2 * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">R² Score</div>
                  <div className="text-xs text-gray-500">CV: {(modelPerformance[0].cv_r2_mean * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{modelPerformance[0].rmse.toFixed(2)}</div>
                  <div className="text-sm text-gray-400">RMSE</div>
                  <div className="text-xs text-gray-500">CV: {modelPerformance[0].cv_rmse_mean.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">{modelPerformance[0].feature_count}</div>
                  <div className="text-sm text-gray-400">Features</div>
                  <div className="text-xs text-gray-500">Optimized</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {modelPerformance[0].total_players?.toLocaleString() || "N/A"}
                  </div>
                  <div className="text-sm text-gray-400">Players</div>
                  <div className="text-xs text-gray-500">2015-2024</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {modelPerformance[0].avg_actual_ppg?.toFixed(1) || "N/A"}
                  </div>
                  <div className="text-sm text-gray-400">Avg PPG</div>
                  <div className="text-xs text-gray-500">Actual</div>
                </div>
              </div>

              {/* Top Features */}
              {modelPerformance[0].top_features && (
                <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                  <h4 className="text-yellow-400 font-mono text-sm mb-2">TOP PREDICTIVE FEATURES</h4>
                  <p className="text-gray-300 text-sm">{modelPerformance[0].top_features}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Seasonal Performance Trends */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">ELITE TIER TRENDS</CardTitle>
              <p className="text-green-400 text-sm">Top tier performance by season</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={seasonalTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="season" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="avgPPG" stroke="#FFD700" fill="#FFD700" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="playerCount" stroke="#2CFF94" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Prediction Accuracy */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">PREDICTION ACCURACY</CardTitle>
              <p className="text-green-400 text-sm">
                Actual vs Predicted PPG • R² = {(modelPerformance[0]?.r2 * 100 || 0).toFixed(1)}%
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={predictionAccuracy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="predicted" stroke="#9CA3AF" />
                  <YAxis dataKey="actual" stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Scatter dataKey="actual" fill="#2CFF94" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Draft Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Enhanced Draft Success */}
          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
            onClick={() => {
              if (draftSort === 'eliteRate') setDraftSort('tier1PlusRate')
              else if (draftSort === 'tier1PlusRate') setDraftSort('totalPlayers')
              else setDraftSort('eliteRate')
            }}
          >
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                DRAFT ROUND SUCCESS RATES
                <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                  Sort: {draftSort === 'eliteRate' ? 'Elite Rate' : draftSort === 'tier1PlusRate' ? 'Tier 1+ Rate' : 'Total Players'}
                </span>
              </CardTitle>
              <p className="text-green-400 text-sm">Click to sort • Hit rates by draft position</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={draftRoundSuccess.slice(0, 7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="round" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="eliteRate" fill="#8B5CF6" name="Elite Rate %" />
                  <Bar dataKey="tier1PlusRate" fill="#10B981" name="Tier 1+ Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Prospect Tier Analysis */}
          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
            onClick={() => {
              if (prospectSort === 'hitRate') setProspectSort('successRate')
              else if (prospectSort === 'successRate') setProspectSort('totalCount')
              else setProspectSort('hitRate')
            }}
          >
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                PROSPECT TIER ANALYSIS
                <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                  Sort: {prospectSort === 'hitRate' ? 'Hit Rate' : prospectSort === 'successRate' ? 'Success Rate' : 'Total Count'}
                </span>
              </CardTitle>
              <p className="text-green-400 text-sm">Click to sort • Success rates by prospect grade</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prospectTierData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="tier" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="hitRate" fill="#FFD700" name="Hit Rate %" />
                  <Bar dataKey="successRate" fill="#2CFF94" name="Success Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Position Performance & Tier Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Enhanced Position Performance */}
          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
            onClick={() => {
              if (positionSort === 'avgPPG') setPositionSort('totalPlayers')
              else if (positionSort === 'totalPlayers') setPositionSort('avgError')
              else setPositionSort('avgPPG')
            }}
          >
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                2024 POSITION PERFORMANCE
                <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                  Sort: {positionSort === 'avgPPG' ? 'Avg PPG' : positionSort === 'totalPlayers' ? 'Total Players' : 'Avg Error'}
                </span>
              </CardTitle>
              <p className="text-green-400 text-sm">Click to sort • Average PPG and prediction accuracy</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={positionPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="position" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="avgPPG" fill="#2CFF94" name="Avg PPG" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Tier Distribution */}
          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
            onClick={() => {
              if (tierSort === 'value') setTierSort('avgPPG')
              else setTierSort('value')
            }}
          >
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                2024 TIER DISTRIBUTION
                <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                  Sort: {tierSort === 'value' ? 'Player Count' : 'Avg PPG'}
                </span>
              </CardTitle>
              <p className="text-green-400 text-sm">Click to sort • Player count by performance tier</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {breakoutBust.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Enhanced Breakouts and Busts */}
            {/* Top Breakouts with Surprise Factor */}
            <Card 
              className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => {
                if (breakoutSort === 'surprise_factor') setBreakoutSort('fantasy_ppg')
                else if (breakoutSort === 'fantasy_ppg') setBreakoutSort('performance_ratio')
                else setBreakoutSort('surprise_factor')
              }}
            >
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                  TOP BREAKOUTS
                  <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                    Sort: {breakoutSort === 'surprise_factor' ? 'Surprise Factor' : breakoutSort === 'fantasy_ppg' ? 'Fantasy PPG' : 'Performance Ratio'}
                  </span>
                </CardTitle>
                <p className="text-green-400 text-sm">Click to sort • Highest surprise factor players</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {topBreakouts.map((player, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <div className="flex items-center space-x-3">
                        <PlayerHeadshot
                          playerId={player.player_id}
                          playerName={player.player_name}
                          teamLogo={player.recent_team}
                          size={32}
                          className="flex-shrink-0"
                          player={player}
                        />
                        <div>
                          <div className="text-white font-medium">{player.player_name}</div>
                          <div className="text-sm text-gray-400">
                            {player.position} • {player.season}
                            {player.tier_upgrade && <span className="text-green-400 ml-2">↗ TIER UP</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ratio: {player.performance_ratio?.toFixed(2) || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">+{player.surprise_factor.toFixed(1)}</div>
                        <div className="text-xs text-gray-400">{player.fantasy_ppg.toFixed(1)} PPG</div>
                        <div className="text-xs text-gray-500">vs {player.predicted_fantasy_ppg.toFixed(1)} pred</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Busts with Surprise Factor */}
            <Card 
              className="bg-slate-800 border-slate-700 cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => {
                if (bustSort === 'surprise_factor') setBustSort('fantasy_ppg')
                else if (bustSort === 'fantasy_ppg') setBustSort('performance_ratio')
                else setBustSort('surprise_factor')
              }}
            >
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
                  TOP BUSTS
                  <span className="text-xs text-green-400 bg-slate-700 px-2 py-1 rounded">
                    Sort: {bustSort === 'surprise_factor' ? 'Surprise Factor' : bustSort === 'fantasy_ppg' ? 'Fantasy PPG' : 'Performance Ratio'}
                  </span>
                </CardTitle>
                <p className="text-green-400 text-sm">Click to sort • Biggest disappointments</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {topBusts.map((player, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <div className="flex items-center space-x-3">
                        <PlayerHeadshot
                          playerId={player.player_id}
                          playerName={player.player_name}
                          teamLogo={player.recent_team}
                          size={32}
                          className="flex-shrink-0"
                          player={player}
                        />
                        <div>
                          <div className="text-white font-medium">{player.player_name}</div>
                          <div className="text-sm text-gray-400">
                            {player.position} • {player.season}
                            {player.tier_downgrade && <span className="text-red-400 ml-2">↘ TIER DOWN</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ratio: {player.performance_ratio?.toFixed(2) || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">{player.surprise_factor.toFixed(1)}</div>
                        <div className="text-xs text-gray-400">{player.fantasy_ppg.toFixed(1)} PPG</div>
                        <div className="text-xs text-gray-500">vs {player.predicted_fantasy_ppg.toFixed(1)} pred</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Key Insights */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono">MASTER DATA INSIGHTS</CardTitle>
            <p className="text-green-400 text-sm">Advanced analytics from comprehensive pipeline</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">MODEL EXCELLENCE</h3>
                  <p className="text-gray-300 text-sm">
                    {modelPerformance.length > 0 &&
                      `${(modelPerformance[0].r2 * 100).toFixed(1)}% R² with ${modelPerformance[0].feature_count} optimized features across ${modelPerformance[0].total_players?.toLocaleString() || "N/A"} player seasons`}
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">DRAFT INTELLIGENCE</h3>
                  <p className="text-gray-300 text-sm">
                    {draftRoundSuccess.length > 0 &&
                      `Round 1: ${draftRoundSuccess[0]?.eliteRate}% elite rate, Round 7: ${draftRoundSuccess[6]?.eliteRate || "0"}% elite rate - clear draft capital value`}
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">BREAKOUT SCIENCE</h3>
                  <p className="text-gray-300 text-sm">
                    {topBreakouts.length > 0 &&
                      `${topBreakouts.length} major breakouts with surprise factors up to +${topBreakouts[0]?.surprise_factor.toFixed(1)} - predictive patterns identified`}
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">PROSPECT GRADING</h3>
                  <p className="text-gray-300 text-sm">
                    {prospectTierData.length > 0 &&
                      `${prospectTierData[0]?.tier} prospects: ${prospectTierData[0]?.hitRate}% hit rate - validated prospect evaluation system`}
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
