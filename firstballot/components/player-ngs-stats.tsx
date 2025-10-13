"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PlayerNGSStatsProps {
  playerName: string
  position: string
  compact?: boolean
}

export function PlayerNGSStats({ playerName, position, compact = false }: PlayerNGSStatsProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        // Use master_player_stats which has complete fantasy + NGS data
        const response = await fetch(
          `/api/player-stats?season=2025&limit=500`
        )
        const result = await response.json()
        
        // Find player by name match
        const playerStats = result.data?.find(
          (p: any) => p.player_display_name?.toLowerCase().includes(playerName.toLowerCase().split(' ')[1] || playerName.toLowerCase())
        )

        setStats(playerStats)
      } catch (error) {
        console.error("Failed to fetch player NGS stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerStats()
  }, [playerName, position])

  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    )
  }

  if (!stats) {
    return <div className="text-xs text-slate-500">No NGS data</div>
  }

  // Compact view for cards
  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs font-mono">
            {stats.fantasy_ppg?.toFixed(1)} PPG
          </Badge>
          <span className="text-xs text-slate-500">
            {stats.games_played} GP
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-xs font-mono">
          {position === "QB" && (
            <>
              {stats.avg_cpoe && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">CPOE</span>
                  <span className={stats.avg_cpoe > 0 ? "text-green-400" : "text-red-400"}>
                    {stats.avg_cpoe > 0 ? "+" : ""}{stats.avg_cpoe.toFixed(1)}%
                  </span>
                </div>
              )}
              {stats.avg_passer_rating && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">RTG</span>
                  <span className="text-slate-300">{stats.avg_passer_rating.toFixed(0)}</span>
                </div>
              )}
            </>
          )}
          
          {position === "RB" && (
            <>
              {stats.avg_rush_efficiency && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">EFF</span>
                  <span className="text-green-400">{stats.avg_rush_efficiency.toFixed(1)}</span>
                </div>
              )}
              {stats.avg_rush_yards_over_expected && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">RYOE</span>
                  <span className={stats.avg_rush_yards_over_expected > 0 ? "text-green-400" : "text-red-400"}>
                    {stats.avg_rush_yards_over_expected > 0 ? "+" : ""}{stats.avg_rush_yards_over_expected.toFixed(1)}
                  </span>
                </div>
              )}
            </>
          )}
          
          {(position === "WR" || position === "TE") && (
            <>
              {stats.avg_separation && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">SEP</span>
                  <span className="text-green-400">{stats.avg_separation.toFixed(1)}"</span>
                </div>
              )}
              {stats.avg_catch_percentage && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">CATCH</span>
                  <span className="text-slate-300">{stats.avg_catch_percentage.toFixed(0)}%</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Full view for detailed sections
  return (
    <div className="space-y-3">
      {/* Fantasy Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="bg-slate-700/50 p-2 rounded">
          <div className="text-slate-400">PPG</div>
          <div className="text-green-400 font-semibold text-lg">{stats.fantasy_ppg?.toFixed(1)}</div>
        </div>
        <div className="bg-slate-700/50 p-2 rounded">
          <div className="text-slate-400">Total Pts</div>
          <div className="text-slate-200 font-semibold">{stats.total_fantasy_points?.toFixed(0)}</div>
        </div>
        <div className="bg-slate-700/50 p-2 rounded">
          <div className="text-slate-400">Games</div>
          <div className="text-slate-200 font-semibold">{stats.games_played}</div>
        </div>
      </div>
      
      {/* Position-Specific NGS Metrics */}
      {position === "QB" && (
        <>
          <div className="text-xs text-slate-400 font-semibold mt-3 mb-2">PASSING EFFICIENCY</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Passer Rating</div>
              <div className="text-slate-200 font-semibold">{stats.avg_passer_rating?.toFixed(1)}</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">CPOE</div>
              <div className={`font-semibold ${
                (stats.avg_cpoe || 0) > 0 ? "text-green-400" : "text-red-400"
              }`}>
                {(stats.avg_cpoe || 0) > 0 ? "+" : ""}{stats.avg_cpoe?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Time to Throw</div>
              <div className="text-slate-200 font-semibold">{stats.avg_time_to_throw?.toFixed(2)}s</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Aggressiveness</div>
              <div className="text-orange-400 font-semibold">{stats.aggressiveness?.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded col-span-2">
              <div className="text-slate-400">Completed Air Yards</div>
              <div className="text-slate-200 font-semibold">{stats.avg_completed_air_yards?.toFixed(1)} yds</div>
            </div>
          </div>
        </>
      )}

      {position === "RB" && (
        <>
          <div className="text-xs text-slate-400 font-semibold mt-3 mb-2">RUSHING EFFICIENCY</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Efficiency</div>
              <div className="text-green-400 font-semibold">{stats.avg_rush_efficiency?.toFixed(2)}</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">RYOE/Att</div>
              <div className={`font-semibold ${
                (stats.avg_rush_yards_over_expected || 0) > 0 ? "text-green-400" : "text-red-400"
              }`}>
                {(stats.avg_rush_yards_over_expected || 0) > 0 ? "+" : ""}{stats.avg_rush_yards_over_expected?.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">YPC</div>
              <div className="text-slate-200 font-semibold">{stats.avg_rush_yards_per_attempt?.toFixed(1)}</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">8+ Box%</div>
              <div className="text-orange-400 font-semibold">{stats.avg_rush_8plus_defenders_pct?.toFixed(0)}%</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded col-span-2">
              <div className="text-slate-400">Time to LOS</div>
              <div className="text-slate-200 font-semibold">{stats.avg_time_to_los?.toFixed(2)}s</div>
            </div>
          </div>
        </>
      )}

      {(position === "WR" || position === "TE") && (
        <>
          <div className="text-xs text-slate-400 font-semibold mt-3 mb-2">RECEIVING METRICS</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Separation</div>
              <div className="text-green-400 font-semibold">{stats.avg_separation?.toFixed(1)}"</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Catch %</div>
              <div className="text-slate-200 font-semibold">{stats.avg_catch_percentage?.toFixed(0)}%</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">Cushion</div>
              <div className="text-slate-200 font-semibold">{stats.avg_cushion?.toFixed(1)} yds</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded">
              <div className="text-slate-400">YAC Above Exp</div>
              <div className={`font-semibold ${
                (stats.avg_yac_above_expectation || 0) > 0 ? "text-green-400" : "text-red-400"
              }`}>
                {(stats.avg_yac_above_expectation || 0) > 0 ? "+" : ""}{stats.avg_yac_above_expectation?.toFixed(1)}
              </div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded col-span-2">
              <div className="text-slate-400">Air Yards Share</div>
              <div className="text-orange-400 font-semibold">{stats.avg_air_yards_share?.toFixed(1)}%</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

