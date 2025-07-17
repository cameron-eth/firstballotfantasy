"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerCard } from "@/components/player-card"
import { TierLegend } from "@/components/tier-legend"

const positions = ["QB", "RB", "WR", "TE"]
const seasons = ["2024", "2023", "2022", "2021", "2020"]

interface Player {
  player_name: string
  position: string
  season: number
  recent_team: string
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  tier: string
  position_tier: string
  games_played_lag1: number
  player_id?: string
}

interface TierStats {
  tier: string
  count: number
  avgPPG: number
  description: string
}

// Player Cards Section Component with Show More functionality
function PlayerCardsSection({ players }: { players: Player[] }) {
  const [showAll, setShowAll] = useState(false)
  const [displayedPlayers, setDisplayedPlayers] = useState<Player[]>([])

  useEffect(() => {
    setDisplayedPlayers(showAll ? players : players.slice(0, 12))
  }, [players, showAll])

  const transformPlayerForCard = (player: any) => ({
    name: player.player_name,
    tier: player.position_tier || player.tier || "Unknown",
    ppg: Number(player.fantasy_ppg?.toFixed(1)) || 0,
    predicted: Number(player.predicted_fantasy_ppg?.toFixed(1)) || 0,
    error: player.prediction_error > 0 ? `+${player.prediction_error.toFixed(1)}` : (player.prediction_error?.toFixed(1) || "0.0"),
    team: player.recent_team || "N/A",
    playerId: player.player_id,
  })

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPlayers.map((player, index) => (
          <PlayerCard key={`${player.player_name}-${player.season}-${index}`} player={transformPlayerForCard(player)} />
        ))}
      </div>

      {players.length > 12 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowAll(!showAll)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-green-400 px-6 py-3 rounded-lg font-mono text-sm transition-colors"
          >
            {showAll ? `SHOW LESS` : `SHOW MORE (${players.length - 12} remaining)`}
          </button>
        </div>
      )}
    </>
  )
}

export default function TiersPage() {
  const [activePosition, setActivePosition] = useState("QB")
  const [activeSeason, setActiveSeason] = useState("2024")
  const [players, setPlayers] = useState<Player[]>([])
  const [tierStats, setTierStats] = useState<TierStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayerData()
  }, [activePosition, activeSeason])

  const fetchPlayerData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch players for the selected position and season
      const response = await fetch(`/api/player-tiers?position=${activePosition}&season=${activeSeason}`)
      if (!response.ok) {
        throw new Error("Failed to fetch player data")
      }
      const result = await response.json()
      const playerData = result.data || []

      // Calculate tier statistics
      const tierCounts: { [key: string]: { count: number; totalPPG: number } } = {}

      playerData.forEach((player: any) => {
        const tier = player.tier || "Unknown"
        if (!tierCounts[tier]) {
          tierCounts[tier] = { count: 0, totalPPG: 0 }
        }
        tierCounts[tier].count++
        tierCounts[tier].totalPPG += player.fantasy_ppg || 0
      })

      const stats = Object.entries(tierCounts).map(([tier, data]) => ({
        tier,
        count: data.count,
        avgPPG: data.totalPPG / data.count,
        description: getTierDescription(tier),
      }))

      setPlayers(playerData)
      setTierStats(stats)
    } catch (err) {
      console.error("Error fetching player data:", err)
      setError("Failed to load player data")
    } finally {
      setLoading(false)
    }
  }

  const getTierDescription = (tier: string): string => {
    const descriptions: { [key: string]: string } = {
      Elite: "Top 1% - League winners",
      QB1: "Top tier starters",
      RB1: "Top tier starters",
      WR1: "Top tier starters",
      TE1: "Top tier starters",
      QB2: "Solid starters",
      RB2: "Solid starters",
      WR2: "Solid starters",
      TE2: "Solid starters",
      Startable: "Reliable options",
      Flex: "Situational plays",
      Streamer: "Matchup dependent",
    }
    return descriptions[tier] || "Performance tier"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING PLAYER TIERS...</p>
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
        <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
              <button onClick={fetchPlayerData} className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono">
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

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">PLAYER TIERS</h1>
          <p className="text-green-400">
            Fantasy performance tiers based on predicted PPG 
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Position Tabs */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg w-fit">
            {positions.map((position) => (
              <button
                key={position}
                onClick={() => setActivePosition(position)}
                className={`px-6 py-2 font-mono text-sm transition-colors rounded-lg ${
                  activePosition === position
                    ? "bg-yellow-400 text-slate-900"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {position}
              </button>
            ))}
          </div>

          {/* Season Filter */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg w-fit">
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`px-4 py-2 font-mono text-sm transition-colors rounded-lg ${
                  activeSeason === season
                    ? "bg-green-400 text-slate-900"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {season}
              </button>
            ))}
          </div>
        </div>

        {/* Tier Statistics */}
        {tierStats.length > 0 && (
          <Card className="mb-8 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">
                {activePosition} TIER BREAKDOWN • {activeSeason}
              </CardTitle>
              <p className="text-green-400 text-sm">Distribution and performance by tier</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                {tierStats
                  .sort((a, b) => b.avgPPG - a.avgPPG)
                  .map((stat) => (
                    <div key={stat.tier} className="text-center bg-slate-700 p-3 rounded-lg">
                      <p className="font-mono text-sm text-white font-bold">{stat.tier}</p>
                      <p className="text-xs text-gray-400 mb-1">{stat.description}</p>
                      <p className="text-lg font-mono text-green-400">{stat.avgPPG.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">avg PPG</p>
                      <p className="text-xs text-yellow-400">{stat.count} players</p>
                    </div>
                  ))}
              </div>
              
              {/* Tier Legend */}
              <TierLegend compact={true} className="mt-6" />
            </CardContent>
          </Card>
        )}

        {/* Player Cards */}
        {players.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-gray-400 font-mono text-sm">
                Showing top {players.length} {activePosition} players for {activeSeason} season
              </p>
            </div>
            <PlayerCardsSection players={players} />
          </>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <p className="text-gray-400 font-mono">
                No {activePosition} data available for {activeSeason} season
              </p>
              <p className="text-gray-500 text-sm mt-2">Try selecting a different position or season</p>
            </CardContent>
          </Card>
        )}

       
      </main>
    </div>
  )
}
