"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerCard } from "@/components/player-card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface BreakoutBustPlayer {
  player_name: string
  position: string
  season: number
  recent_team: string
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  surprise_factor: number
  performance_ratio: number
  tier_upgrade: boolean
  tier_downgrade: boolean
  age: number
  prospect_tier: string
  draft_round: string
  player_id?: string
}

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState("breakouts")
  const [breakoutCandidates, setBreakoutCandidates] = useState<BreakoutBustPlayer[]>([])
  const [bustCandidates, setBustCandidates] = useState<BreakoutBustPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBreakoutBustData()
  }, [])

  const fetchBreakoutBustData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch breakout players
      const breakoutResponse = await fetch("/api/breakout-bust?type=breakout&limit=50")
      if (!breakoutResponse.ok) {
        throw new Error("Failed to fetch breakout data")
      }
      const breakoutResult = await breakoutResponse.json()
      const breakoutData = breakoutResult.data || []

      // Fetch bust players
      const bustResponse = await fetch("/api/breakout-bust?type=bust&limit=50")
      if (!bustResponse.ok) {
        throw new Error("Failed to fetch bust data")
      }
      const bustResult = await bustResponse.json()
      const bustData = bustResult.data || []

      setBreakoutCandidates(breakoutData)
      setBustCandidates(bustData)
    } catch (err) {
      console.error("Error fetching breakout/bust data:", err)
      setError("Failed to load breakout and bust data")
    } finally {
      setLoading(false)
    }
  }

  // Transform data for PlayerCard component
  const transformPlayerForCard = (player: BreakoutBustPlayer) => ({
    name: player.player_name,
    tier: player.prospect_tier || "Unknown",
    ppg: Number(player.fantasy_ppg?.toFixed(1)) || 0,
    predicted: Number(player.predicted_fantasy_ppg?.toFixed(1)) || 0,
    error: player.prediction_error > 0 ? `+${player.prediction_error.toFixed(1)}` : player.prediction_error.toFixed(1),
    team: player.recent_team || "N/A",
    playerId: player.player_id,
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING BREAKOUT & BUST ANALYSIS...</p>
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
                onClick={fetchBreakoutBustData}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">BREAKOUTS & BUSTS</h1>
          <p className="text-green-400">Players with the largest prediction errors • Live Database Analysis</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("breakouts")}
            className={`px-6 py-2 font-mono text-sm transition-colors rounded-lg ${
              activeTab === "breakouts"
                ? "bg-green-400 text-slate-900"
                : "text-gray-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            <TrendingUp className="inline h-4 w-4 mr-2" />
            BREAKOUTS ({breakoutCandidates.length})
          </button>
          <button
            onClick={() => setActiveTab("busts")}
            className={`px-6 py-2 font-mono text-sm transition-colors rounded-lg ${
              activeTab === "busts" ? "bg-red-400 text-slate-900" : "text-gray-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            <TrendingDown className="inline h-4 w-4 mr-2" />
            BUSTS ({bustCandidates.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "breakouts" ? (
          <div>
            {/* Summary Stats */}
            <Card className="mb-6 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">BREAKOUT SUMMARY</CardTitle>
                <p className="text-gray-300 text-sm">Top performers who exceeded model predictions</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{breakoutCandidates.length}</div>
                    <div className="text-sm text-gray-400">Total Breakouts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      +{breakoutCandidates[0]?.surprise_factor.toFixed(1) || "0"}
                    </div>
                    <div className="text-sm text-gray-400">Max Surprise Factor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {breakoutCandidates.filter((p) => p.tier_upgrade).length}
                    </div>
                    <div className="text-sm text-gray-400">Tier Upgrades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {(
                        breakoutCandidates.reduce((sum, p) => sum + p.fantasy_ppg, 0) / breakoutCandidates.length || 0
                      ).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-400">Avg Actual PPG</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">BREAKOUT CANDIDATES</CardTitle>
                <p className="text-gray-300 text-sm">Players who significantly outperformed model predictions</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {breakoutCandidates.slice(0, 15).map((player, index) => (
                    <div key={index} className="relative">
                      <PlayerCard player={transformPlayerForCard(player)} />
                      {/* Enhanced overlay with additional data */}
                      <div className="absolute top-2 right-2 bg-green-400 text-slate-900 px-2 py-1 rounded text-xs font-mono font-bold">
                        +{player.surprise_factor.toFixed(1)}
                      </div>
                      <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Season:</span>
                          <span className="text-white">{player.season}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Age:</span>
                          <span className="text-white">{player.age || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Draft:</span>
                          <span className="text-white">{player.draft_round || "Undrafted"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Ratio:</span>
                          <span className="text-green-400">{player.performance_ratio?.toFixed(2) || "N/A"}</span>
                        </div>
                        {player.tier_upgrade && (
                          <div className="mt-1 text-center">
                            <span className="text-green-400 text-xs">↗ TIER UPGRADE</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono">BREAKOUT PATTERNS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-green-400 font-mono text-sm mb-2">OPPORTUNITY CHANGES</h3>
                      <p className="text-gray-300 text-sm">
                        Many breakouts occur when players receive unexpected increases in target share or touches due to
                        injuries or scheme changes.
                      </p>
                    </div>
                  </div>
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-green-400 font-mono text-sm mb-2">YOUNG TALENT</h3>
                      <p className="text-gray-300 text-sm">
                        Rookie and second-year players often breakout as they adapt to NFL speed and earn coaching
                        trust.
                      </p>
                    </div>
                  </div>
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-green-400 font-mono text-sm mb-2">SYSTEM FIT</h3>
                      <p className="text-gray-300 text-sm">
                        Players moving to systems that better utilize their skillset often exceed expectations
                        significantly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            {/* Bust Summary Stats */}
            <Card className="mb-6 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400 font-mono">BUST SUMMARY</CardTitle>
                <p className="text-gray-300 text-sm">Players who significantly underperformed expectations</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{bustCandidates.length}</div>
                    <div className="text-sm text-gray-400">Total Busts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {bustCandidates[0]?.surprise_factor.toFixed(1) || "0"}
                    </div>
                    <div className="text-sm text-gray-400">Worst Surprise Factor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {bustCandidates.filter((p) => p.tier_downgrade).length}
                    </div>
                    <div className="text-sm text-gray-400">Tier Downgrades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {(bustCandidates.reduce((sum, p) => sum + p.fantasy_ppg, 0) / bustCandidates.length || 0).toFixed(
                        1,
                      )}
                    </div>
                    <div className="text-sm text-gray-400">Avg Actual PPG</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400 font-mono">BUST CANDIDATES</CardTitle>
                <p className="text-gray-300 text-sm">Players who significantly underperformed model predictions</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bustCandidates.slice(0, 15).map((player, index) => (
                    <div key={index} className="relative">
                      <PlayerCard player={transformPlayerForCard(player)} />
                      {/* Enhanced overlay with additional data */}
                      <div className="absolute top-2 right-2 bg-red-400 text-slate-900 px-2 py-1 rounded text-xs font-mono font-bold">
                        {player.surprise_factor.toFixed(1)}
                      </div>
                      <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Season:</span>
                          <span className="text-white">{player.season}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Age:</span>
                          <span className="text-white">{player.age || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Draft:</span>
                          <span className="text-white">{player.draft_round || "Undrafted"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Ratio:</span>
                          <span className="text-red-400">{player.performance_ratio?.toFixed(2) || "N/A"}</span>
                        </div>
                        {player.tier_downgrade && (
                          <div className="mt-1 text-center">
                            <span className="text-red-400 text-xs">↘ TIER DOWNGRADE</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono">BUST PATTERNS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-red-400 font-mono text-sm mb-2">INJURY IMPACT</h3>
                      <p className="text-gray-300 text-sm">
                        Many busts result from significant injuries that limit playing time or effectiveness throughout
                        the season.
                      </p>
                    </div>
                  </div>
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-red-400 font-mono text-sm mb-2">ROLE CHANGES</h3>
                      <p className="text-gray-300 text-sm">
                        Unexpected decreases in usage due to coaching changes, scheme shifts, or emergence of other
                        players.
                      </p>
                    </div>
                  </div>
                  <div className="gradient-border">
                    <div className="gradient-border-content">
                      <h3 className="text-red-400 font-mono text-sm mb-2">REGRESSION</h3>
                      <p className="text-gray-300 text-sm">
                        Players coming off career years often regress to their mean performance level the following
                        season.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
