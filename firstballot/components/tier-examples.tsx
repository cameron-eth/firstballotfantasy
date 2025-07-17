"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerCard } from "@/components/player-card"

interface TierExamplesProps {
  activePosition: string
}

interface TierExamples {
  [key: string]: any[]
}

const tierColors = {
  Elite: "bg-purple-500",
  "Tier 1": "bg-green-500",
  "Tier 2": "bg-yellow-500",
  Startable: "bg-orange-500",
  Streamer: "bg-gray-500",
}

// Map database tier names to display tier names
const tierNameMapping: { [key: string]: string } = {
  "Elite": "Elite",
  "QB1": "Tier 1",
  "RB1": "Tier 1", 
  "WR1": "Tier 1",
  "TE1": "Tier 1",
  "QB2": "Tier 2",
  "RB2": "Tier 2",
  "WR2": "Tier 2", 
  "TE2": "Startable", // TE2 players are typically startable
  "Streamer": "Streamer",
  "Startable": "Startable",
  // Add any other mappings as needed
}

export function TierExamples({ activePosition }: TierExamplesProps) {
  const [tierExamples, setTierExamples] = useState<TierExamples>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTierExamples()
  }, [activePosition])

  const fetchTierExamples = async () => {
    try {
      setLoading(true)
      setError(null)

      const positionParam = activePosition === "ALL" ? "ALL" : activePosition
      const response = await fetch(`/api/conversion-examples?position=${positionParam}&season=2024`)
      const examplesData = await response.json()

      if (examplesData.error) {
        console.error("Error fetching tier examples:", examplesData.error)
        setError("Failed to load tier examples")
      } else {
        setTierExamples(examplesData.data || {})
      }
    } catch (err) {
      console.error("Error fetching tier examples:", err)
      setError("Failed to load tier examples")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono">TIER EXAMPLES</CardTitle>
          <p className="text-green-400 text-sm">
            {activePosition === "ALL" ? "Example players in each tier" : `${activePosition} players in each tier`} • Live Data
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-green-400 font-mono text-sm">LOADING EXAMPLES...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono">TIER EXAMPLES</CardTitle>
          <p className="text-green-400 text-sm">
            {activePosition === "ALL" ? "Example players in each tier" : `${activePosition} players in each tier`} • Live Data
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-400 font-mono text-sm mb-2">ERROR: {error}</p>
              <button
                onClick={fetchTierExamples}
                className="bg-yellow-400 text-slate-900 px-3 py-1 rounded text-xs font-mono"
              >
                RETRY
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">TIER EXAMPLES</CardTitle>
        <p className="text-green-400 text-sm">
          {activePosition === "ALL" ? "Example players in each tier" : `${activePosition} players in each tier`} • Live Data
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(tierColors).map(([displayTierName, colorClass]) => {
            // Find examples for this display tier by mapping back to database tier names
            const databaseTierNames = Object.entries(tierNameMapping)
              .filter(([dbName, displayName]) => displayName === displayTierName)
              .map(([dbName]) => dbName)
            
            // Collect examples from all matching database tier names
            const examples = databaseTierNames.flatMap(dbTierName => tierExamples[dbTierName] || [])
            
            return (
              <div key={displayTierName} className="gradient-border">
                <div className="gradient-border-content">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-4 h-4 rounded ${colorClass}`}></div>
                    <h3 className="text-green-400 font-mono text-lg">{displayTierName}</h3>
                    <span className="text-gray-400 text-sm">({examples.length} examples)</span>
                  </div>
                  {examples.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {examples.map((player: any, index: number) => (
                        <PlayerCard
                          key={`${player.player_name_std}-${index}`}
                          player={{
                            name: player.player_name,
                            tier: player.tier || player.position_tier,
                            ppg: player.fantasy_ppg ? Number(player.fantasy_ppg) : 0,
                            predicted: player.predicted_fantasy_ppg ? Number(player.predicted_fantasy_ppg) : 0,
                            error: player.prediction_error ? (player.prediction_error > 0 ? `+${player.prediction_error.toFixed(1)}` : `${player.prediction_error.toFixed(1)}`) : "0.0",
                            team: player.recent_team,
                            playerId: player.player_id
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 font-mono text-sm">No {displayTierName} players found for {activePosition}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 