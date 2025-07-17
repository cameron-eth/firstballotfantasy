"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, Target, Zap, Shield, Users, Crown, Gamepad2, BarChart3 } from "lucide-react"

interface TeamBuilderData {
  tierDistribution: any
  teamArchetypes: any[]
}

export default function TeamBuilderPage() {
  const [data, setData] = useState<TeamBuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamBuilderData()
  }, [])

  const fetchTeamBuilderData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/team-archetypes")
      if (!response.ok) {
        throw new Error("Failed to fetch team builder data")
      }
      const result = await response.json()

      setData(result)
    } catch (err) {
      console.error("Error fetching team builder data:", err)
      setError("Failed to load team builder data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING TEAM BUILDER DATA...</p>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error || "Failed to load data"}</p>
              <button
                onClick={fetchTeamBuilderData}
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

  const teamArchetypes = data.teamArchetypes
  const tierDistribution = data.tierDistribution

  const getProbabilityColor = (probability: string) => {
    const num = parseInt(probability.replace("%", ""))
    if (num >= 60) return "bg-green-500"
    if (num >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "high":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">TEAM BUILDER</h1>
          <p className="text-gray-400 font-mono">
            Explore different team construction strategies and their expected outcomes
          </p>
        </div>

        {/* Tier Distribution Overview */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white font-mono">TIER DISTRIBUTION</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(tierDistribution).map(([tier, stats]: [string, any]) => (
                <div key={tier} className="text-center">
                  <div className="text-2xl font-mono text-white mb-1">{stats.percentage}%</div>
                  <div className="text-sm text-gray-400 font-mono">{tier}</div>
                  <div className="text-xs text-yellow-400 font-mono">{stats.players} players</div>
                  <div className="text-xs text-green-400 font-mono">{stats.avgPPG} PPG</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Archetypes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamArchetypes.map((archetype: any) => (
            <Card key={archetype.id} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <archetype.icon className="h-6 w-6 text-yellow-400" />
                    <CardTitle className="text-white font-mono">{archetype.name}</CardTitle>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={`${getProbabilityColor(archetype.probability)} text-white`}>
                      {archetype.probability}
                    </Badge>
                    <Badge className={`${getRiskColor(archetype.riskLevel)} text-white`}>
                      {archetype.riskLevel}
                    </Badge>
                  </div>
                </div>
                <p className="text-gray-400 font-mono text-sm">{archetype.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-white font-mono mb-2">STRATEGY</h4>
                  <p className="text-gray-300 text-sm">{archetype.strategy}</p>
                </div>

                <div>
                  <h4 className="text-white font-mono mb-2">EXPECTED ROSTER</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(archetype.roster).map(([position, player]: [string, any]) => (
                      <div key={position} className="flex justify-between">
                        <span className="text-gray-400 font-mono">{position}:</span>
                        <span className="text-white font-mono">{player.tier} ({player.ppg} PPG)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-mono mb-2">PROS</h4>
                    <ul className="text-sm text-green-400 space-y-1">
                      {archetype.pros.map((pro: string, index: number) => (
                        <li key={index} className="font-mono">• {pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-mono mb-2">CONS</h4>
                    <ul className="text-sm text-red-400 space-y-1">
                      {archetype.cons.map((con: string, index: number) => (
                        <li key={index} className="font-mono">• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-mono mb-2">DRAFT STRATEGY</h4>
                  <ul className="text-sm text-yellow-400 space-y-1">
                    {archetype.draftStrategy.map((strategy: string, index: number) => (
                      <li key={index} className="font-mono">• {strategy}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono">Expected PPG:</span>
                    <span className="text-yellow-400 font-mono text-lg">{archetype.expectedPPG}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
} 