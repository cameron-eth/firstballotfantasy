'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamLogo } from '@/components/team-logo'
import { MatchupData } from '@/types/league'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface CurrentLineupProps {
  matchup: MatchupData | null
  allPlayers: Record<string, any>
  playerProjections?: Record<string, number> // Player ID -> projected points (fantasy_ppg)
}

const POSITION_COLORS = {
  QB: 'bg-red-500',
  RB: 'bg-green-500',
  WR: 'bg-blue-500',
  TE: 'bg-orange-500',
  FLEX: 'bg-purple-500',
  K: 'bg-gray-500',
  DEF: 'bg-slate-600',
}

export const CurrentLineup = memo(function CurrentLineup({
  matchup,
  allPlayers,
  playerProjections,
}: CurrentLineupProps) {
  if (!matchup || !matchup.starters || matchup.starters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">No lineup data available</p>
      </div>
    )
  }

  const { starters, startersPoints, playersPoints } = matchup

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {starters.map((playerId, index) => {
        const player = allPlayers[playerId]
        if (!player) return null

        const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim()
        const position = player.position || 'FLEX'
        const team = player.team || 'FA'

        // Get player points - try startersPoints first, then playersPoints
        let playerPoints = 0
        if (
          startersPoints &&
          startersPoints[index] !== undefined &&
          startersPoints[index] !== null
        ) {
          playerPoints = startersPoints[index]
        } else if (
          playersPoints &&
          playersPoints[playerId] !== undefined &&
          playersPoints[playerId] !== null
        ) {
          playerPoints = playersPoints[playerId]
        }

        // Get projected points (fantasy_ppg from NGS stats)
        // Priority: 1) playerProjections map, 2) player.fantasy_ppg, 3) calculate from total points
        let projectedPoints = 0
        if (playerProjections && playerProjections[playerId]) {
          projectedPoints = playerProjections[playerId]
        } else if (player.fantasy_ppg) {
          projectedPoints = player.fantasy_ppg
        } else if (player.fantasy_points_ppr && player.games_played && player.games_played > 0) {
          // Calculate PPG if we have total points and games
          projectedPoints = player.fantasy_points_ppr / player.games_played
        }

        // Determine if game has been played (player has points > 0)
        const gamePlayed = playerPoints > 0

        // Calculate difference between actual and projected
        const pointsDiff = playerPoints - projectedPoints
        const overperformed = pointsDiff > 0
        const underperformed = pointsDiff < 0

        return (
          <div key={`${playerId}-${index}`} className="group relative">
            <div
              className={`absolute -inset-0.5 rounded-lg blur transition duration-300 ${
                gamePlayed
                  ? 'bg-gradient-to-r from-slate-600/20 to-slate-700/20 opacity-50'
                  : 'bg-gradient-to-r from-green-400/20 to-yellow-400/20 opacity-0 group-hover:opacity-100'
              }`}
            ></div>

            <Card
              className={`relative border transition-all duration-200 ${
                gamePlayed
                  ? 'bg-slate-700/20 border-slate-600/30 opacity-60 grayscale'
                  : 'bg-slate-700/30 border-slate-600/50 hover:border-green-400/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    team={team}
                    size={40}
                    className={`flex-shrink-0 ${gamePlayed ? 'opacity-50' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4
                        className={`font-semibold truncate text-sm ${
                          gamePlayed ? 'text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {playerName}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={`text-xs px-1.5 py-0.5 ${
                          POSITION_COLORS[position as keyof typeof POSITION_COLORS] || 'bg-gray-500'
                        } text-white`}
                      >
                        {position}
                      </Badge>
                    </div>
                    {/* Game played - show actual vs projected */}
                    {gamePlayed && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Projected:</span>
                          <span className="text-gray-500 font-mono">
                            {projectedPoints.toFixed(1)} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-semibold">Actual:</span>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`font-mono font-bold ${
                                overperformed
                                  ? 'text-green-400'
                                  : underperformed
                                    ? 'text-red-400'
                                    : 'text-slate-300'
                              }`}
                            >
                              {playerPoints.toFixed(1)} pts
                            </span>
                            {overperformed && (
                              <div className="flex items-center space-x-0.5 text-green-400">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-[10px] font-bold">
                                  +{pointsDiff.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {underperformed && (
                              <div className="flex items-center space-x-0.5 text-red-400">
                                <TrendingDown className="h-3 w-3" />
                                <span className="text-[10px] font-bold">
                                  {pointsDiff.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-slate-600/40 text-slate-400 border-slate-600 font-mono"
                          >
                            FINAL
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Game not played - show projection */}
                    {!gamePlayed && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Projected:</span>
                          <span className="text-yellow-400 font-mono font-bold">
                            {projectedPoints.toFixed(1)} pts
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono font-bold"
                          >
                            IN PLAY
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
})
