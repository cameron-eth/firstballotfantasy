'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamLogo } from '@/components/team-logo'
import { TrendingUp, TrendingDown, Target, Zap, Activity, BarChart3 } from 'lucide-react'
import useSWR from 'swr'

interface NGSMetricsOverviewProps {
  selectedTeam: any
}

interface NGSPlayerMetrics {
  player_name: string
  player_gsis_id: string
  position: string
  team: string
  fantasy_ppg: number
  games_played: number

  // QB metrics
  avg_cpoe?: number
  avg_passer_rating?: number
  avg_time_to_throw?: number

  // RB metrics
  avg_rush_efficiency?: number
  avg_ryoe?: number
  avg_rush_yards?: number

  // WR/TE metrics
  avg_separation?: number
  catch_percentage?: number
  avg_yac_above_expectation?: number
  avg_target_share?: number
}

export function NGSMetricsOverview({ selectedTeam }: NGSMetricsOverviewProps) {
  const playerNamesKey = selectedTeam?.players
    ? selectedTeam.players.map((p: any) => p.playerName).join(',')
    : null

  const { data: ngsData = [], isLoading: loading } = useSWR<NGSPlayerMetrics[]>(
    playerNamesKey,
    async (namesKey: string) => {
      const playerNames = namesKey.split(',')
      const responses = await Promise.all(
        playerNames.map((name: string) =>
          fetch(`/api/player-stats?playerName=${encodeURIComponent(name)}`)
            .then((res) => res.json())
            .catch(() => null)
        )
      )
      return responses.filter((r) => r?.data && r.data.length > 0).map((r) => r.data[0])
    }
  )

  if (!selectedTeam) return null

  // Helper to get player from selectedTeam
  const getPlayerInfo = (playerName: string) => {
    return selectedTeam.players.find((p: any) => p.playerName === playerName)
  }

  // Filter and sort by position and metric
  const qbs = ngsData.filter((p) => p.position === 'QB')
  const rbs = ngsData.filter((p) => p.position === 'RB')
  const wrs = ngsData.filter((p) => p.position === 'WR' || p.position === 'TE')

  // Top performers by NGS metrics
  const topCPOE = qbs
    .filter((p) => p.avg_cpoe != null)
    .sort((a, b) => (b.avg_cpoe || 0) - (a.avg_cpoe || 0))
    .slice(0, 3)

  const topRushEfficiency = rbs
    .filter((p) => p.avg_rush_efficiency != null)
    .sort((a, b) => (b.avg_rush_efficiency || 0) - (a.avg_rush_efficiency || 0))
    .slice(0, 3)

  const topRYOE = rbs
    .filter((p) => p.avg_ryoe != null)
    .sort((a, b) => (b.avg_ryoe || 0) - (a.avg_ryoe || 0))
    .slice(0, 3)

  const topSeparation = wrs
    .filter((p) => p.avg_separation != null)
    .sort((a, b) => (b.avg_separation || 0) - (a.avg_separation || 0))
    .slice(0, 3)

  const topCatchPercentage = wrs
    .filter((p) => p.catch_percentage != null)
    .sort((a, b) => (b.catch_percentage || 0) - (a.catch_percentage || 0))
    .slice(0, 3)

  const topYAC = wrs
    .filter((p) => p.avg_yac_above_expectation != null)
    .sort((a, b) => (b.avg_yac_above_expectation || 0) - (a.avg_yac_above_expectation || 0))
    .slice(0, 3)

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading NGS metrics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-8 shadow-xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-yellow-400/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-yellow-400 font-mono tracking-tight">
            ADVANCED NGS METRICS
          </h2>
        </div>
        <p className="text-slate-400 text-sm ml-14">Next Gen Stats • Performance Analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* QB: CPOE (Completion % Over Expected) */}
        {topCPOE.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-900/30 to-slate-700/50 border-blue-500/40 hover:border-blue-400/60 transition-all duration-300 shadow-lg hover:shadow-blue-500/20">
            <CardHeader className="pb-4 border-b border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-blue-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded">
                    <Target className="h-4 w-4" />
                  </div>
                  QB: CPOE
                </CardTitle>
                <Badge className="!bg-blue-500/20 !text-blue-300 !border-blue-500/30 text-xs">
                  TOP {topCPOE.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Completion % Over Expected</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topCPOE.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div
                        className={`text-2xl font-bold font-mono ${(player.avg_cpoe || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {(player.avg_cpoe || 0) > 0 ? '+' : ''}
                        {player.avg_cpoe?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        CPOE%
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* RB: Rush Efficiency */}
        {topRushEfficiency.length > 0 && (
          <Card className="bg-gradient-to-br from-green-900/30 to-slate-700/50 border-green-500/40 hover:border-green-400/60 transition-all duration-300 shadow-lg hover:shadow-green-500/20">
            <CardHeader className="pb-4 border-b border-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-green-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/20 rounded">
                    <Zap className="h-4 w-4" />
                  </div>
                  RB: Efficiency
                </CardTitle>
                <Badge className="!bg-green-500/20 !text-green-300 !border-green-500/30 text-xs">
                  TOP {topRushEfficiency.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Rush Efficiency Score</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topRushEfficiency.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-2xl font-bold font-mono text-green-400">
                        {player.avg_rush_efficiency?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        EFF
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* RB: RYOE (Rush Yards Over Expected) */}
        {topRYOE.length > 0 && (
          <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-700/50 border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20">
            <CardHeader className="pb-4 border-b border-emerald-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-emerald-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  RB: RYOE
                </CardTitle>
                <Badge className="!bg-emerald-500/20 !text-emerald-300 !border-emerald-500/30 text-xs">
                  TOP {topRYOE.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Rush Yards Over Expected</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topRYOE.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div
                        className={`text-2xl font-bold font-mono ${(player.avg_ryoe || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {(player.avg_ryoe || 0) > 0 ? '+' : ''}
                        {player.avg_ryoe?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        RYOE
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* WR/TE: Separation */}
        {topSeparation.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-slate-700/50 border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 shadow-lg hover:shadow-purple-500/20">
            <CardHeader className="pb-4 border-b border-purple-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-purple-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/20 rounded">
                    <Activity className="h-4 w-4" />
                  </div>
                  WR/TE: Separation
                </CardTitle>
                <Badge className="!bg-purple-500/20 !text-purple-300 !border-purple-500/30 text-xs">
                  TOP {topSeparation.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Average Separation (yards)</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topSeparation.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-2xl font-bold font-mono text-purple-400">
                        {player.avg_separation?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        YDS
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* WR/TE: Catch Percentage */}
        {topCatchPercentage.length > 0 && (
          <Card className="bg-gradient-to-br from-cyan-900/30 to-slate-700/50 border-cyan-500/40 hover:border-cyan-400/60 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20">
            <CardHeader className="pb-4 border-b border-cyan-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-cyan-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 rounded">
                    <Target className="h-4 w-4" />
                  </div>
                  WR/TE: Catch %
                </CardTitle>
                <Badge className="!bg-cyan-500/20 !text-cyan-300 !border-cyan-500/30 text-xs">
                  TOP {topCatchPercentage.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Catch Percentage</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topCatchPercentage.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-2xl font-bold font-mono text-cyan-400">
                        {player.catch_percentage?.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        CATCH
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* WR/TE: YAC Above Expectation */}
        {topYAC.length > 0 && (
          <Card className="bg-gradient-to-br from-orange-900/30 to-slate-700/50 border-orange-500/40 hover:border-orange-400/60 transition-all duration-300 shadow-lg hover:shadow-orange-500/20">
            <CardHeader className="pb-4 border-b border-orange-500/20">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-orange-300 text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-orange-500/20 rounded">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  WR/TE: YAC+
                </CardTitle>
                <Badge className="!bg-orange-500/20 !text-orange-300 !border-orange-500/30 text-xs">
                  TOP {topYAC.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Yards After Catch Above Expected</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topYAC.map((player, idx) => {
                const playerInfo = getPlayerInfo(player.player_name)
                return (
                  <div
                    key={player.player_name}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800/80 transition-all duration-200 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-300 font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      {playerInfo && (
                        <TeamLogo team={playerInfo.team} size={28} className="flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-bold text-base truncate mb-0.5">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {player.fantasy_ppg?.toFixed(1)} PPG • {player.games_played} Games
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div
                        className={`text-2xl font-bold font-mono ${(player.avg_yac_above_expectation || 0) > 0 ? 'text-orange-400' : 'text-red-400'}`}
                      >
                        {(player.avg_yac_above_expectation || 0) > 0 ? '+' : ''}
                        {player.avg_yac_above_expectation?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        YAC+
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state if no data */}
      {ngsData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No NGS data available for your team players</p>
        </div>
      )}
    </div>
  )
}
