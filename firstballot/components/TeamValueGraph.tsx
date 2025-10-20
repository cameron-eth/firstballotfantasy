"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Activity, ArrowUp, ArrowDown } from "lucide-react"

interface TeamValueData {
  teamId: string
  teamName: string
  ownerName: string
  currentValue: number
  currentRank: number
  valueHistory: Array<{
    week: number
    value: number
    rank: number
    change: number
    transactions: number
  }>
  totalValueChange: number
  totalRankChange: number
  netTransactions: number
}

interface TeamValueGraphProps {
  teams: any[]
  transactions: any[]
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}

export function TeamValueGraph({ teams, transactions, allPlayers, dynastyRankings }: TeamValueGraphProps) {
  // Calculate team value changes from transactions
  const teamValueData = useMemo(() => {
    if (!teams.length || !transactions.length) return []

    // Group transactions by week
    const transactionsByWeek = transactions.reduce((acc, tx) => {
      const week = tx.leg || 0
      if (!acc[week]) acc[week] = []
      acc[week].push(tx)
      return acc
    }, {} as Record<number, any[]>)

    // Calculate initial team values based on current roster
    const initialTeamValues = teams.map(team => {
      let totalValue = 0
      
      // Calculate roster value using enhanced player valuation
      if (team.roster) {
        Object.values(team.roster).forEach((playerId: any) => {
          const player = allPlayers[playerId]
          if (player) {
            const playerValue = getPlayerValue(player, dynastyRankings)
            // Use PPG-adjusted value if available, otherwise use base value
            totalValue += playerValue.valueWithPpg || playerValue.totalValue
          }
        })
      }
      
      return {
        teamId: team.rosterId,
        teamName: team.teamName,
        ownerName: team.ownerName,
        initialValue: totalValue
      }
    }).sort((a, b) => b.initialValue - a.initialValue)

    // Calculate value changes through transactions
    const teamHistory = initialTeamValues.map((team, initialRank) => {
      const history = []
      let currentValue = team.initialValue
      let currentRank = initialRank + 1
      let netTransactions = 0
      
      // Add initial point
      history.push({
        week: 0,
        value: currentValue,
        rank: currentRank,
        change: 0,
        transactions: 0
      })

      // Process transactions chronologically
      const sortedWeeks = Object.keys(transactionsByWeek).map(Number).sort((a, b) => a - b)
      
      sortedWeeks.forEach(week => {
        const weekTransactions = transactionsByWeek[week] || []
        let weekValueChange = 0
        let weekTransactionCount = 0

        weekTransactions.forEach(tx => {
          if (tx.adds && tx.adds[team.teamId]) {
            Object.entries(tx.adds[team.teamId]).forEach(([playerId, _]) => {
              const player = allPlayers[playerId]
              if (player) {
                const playerValue = getPlayerValue(player, dynastyRankings)
                // Use PPG-adjusted value if available
                weekValueChange += playerValue.valueWithPpg || playerValue.totalValue
                weekTransactionCount++
                netTransactions++
              }
            })
          }
          
          if (tx.drops && tx.drops[team.teamId]) {
            Object.entries(tx.drops[team.teamId]).forEach(([playerId, _]) => {
              const player = allPlayers[playerId]
              if (player) {
                const playerValue = getPlayerValue(player, dynastyRankings)
                // Use PPG-adjusted value if available
                weekValueChange -= playerValue.valueWithPpg || playerValue.totalValue
                weekTransactionCount++
                netTransactions--
              }
            })
          }
        })

        currentValue += weekValueChange
        
        // Recalculate rank based on new value
        const newTeamValues = [...initialTeamValues]
        const teamIndex = newTeamValues.findIndex(t => t.teamId === team.teamId)
        newTeamValues[teamIndex] = { ...newTeamValues[teamIndex], initialValue: currentValue }
        newTeamValues.sort((a, b) => b.initialValue - a.initialValue)
        const newRank = newTeamValues.findIndex(t => t.teamId === team.teamId) + 1
        
        const rankChange = currentRank - newRank
        currentRank = newRank
        
        history.push({
          week,
          value: currentValue,
          rank: currentRank,
          change: rankChange,
          transactions: weekTransactionCount
        })
      })

      const totalValueChange = currentValue - team.initialValue
      const totalRankChange = (initialRank + 1) - currentRank

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        ownerName: team.ownerName,
        currentValue,
        currentRank,
        valueHistory: history,
        totalValueChange,
        totalRankChange,
        netTransactions
      }
    })

    return teamHistory.sort((a, b) => a.currentRank - b.currentRank)
  }, [teams, transactions, allPlayers, dynastyRankings])

  // Helper function to get player value with PPG adjustments
  const getPlayerValue = (player: any, rankings: Record<string, any>) => {
    const ranking = rankings[player.full_name] || rankings[player.name]
    if (ranking) {
      const baseValue = ranking.rank <= 12 ? 100 : ranking.rank <= 24 ? 80 : ranking.rank <= 48 ? 60 : 40
      
      // Apply PPG multiplier if available
      let valueWithPpg = baseValue
      if (player.fantasy_ppg && player.games_played && player.games_played >= 3) {
        const baseline = 15 // General baseline for PPG comparison
        const ppgRatio = player.fantasy_ppg / baseline
        const ppgMultiplier = Math.max(0.5, Math.min(2.0, ppgRatio))
        valueWithPpg = baseValue * ppgMultiplier
      }
      
      return {
        totalValue: baseValue,
        valueWithPpg: valueWithPpg
      }
    }
    return { totalValue: 20, valueWithPpg: 20 }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            TEAM VALUE TRENDS
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Track how each team's total player value has changed through trades and transactions this season
          </p>
        </CardHeader>
      </Card>

      {/* Team Value Graph */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200 font-mono text-lg">Team Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Graph Area */}
            <div className="relative h-96 bg-slate-900/50 rounded-lg p-4 border border-slate-600/30">
              <div className="absolute inset-4">
                {/* Y-axis labels (value ranges) */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-500 font-mono">
                  <span>High</span>
                  <span>Mid</span>
                  <span>Low</span>
                </div>
                
                {/* Grid lines */}
                <div className="absolute left-8 right-0 top-0 h-full">
                  <div className="h-full flex flex-col justify-between">
                    {[0, 0.5, 1].map((ratio, i) => (
                      <div key={i} className="w-full h-px bg-slate-700/50"></div>
                    ))}
                  </div>
                </div>

                {/* Team value lines */}
                <div className="absolute left-8 right-0 top-0 h-full">
                  {teamValueData.slice(0, 8).map((team, teamIndex) => {
                    const color = [
                      'text-yellow-400',
                      'text-blue-400', 
                      'text-green-400',
                      'text-red-400',
                      'text-purple-400',
                      'text-pink-400',
                      'text-cyan-400',
                      'text-orange-400'
                    ][teamIndex % 8]
                    
                    const strokeColor = color.replace('text-', 'stroke-')
                    
                    // Calculate value range for normalization
                    const allValues = teamValueData.flatMap(t => t.valueHistory.map(h => h.value))
                    const minValue = Math.min(...allValues)
                    const maxValue = Math.max(...allValues)
                    const valueRange = maxValue - minValue
                    
                    return (
                      <div key={team.teamId} className="absolute inset-0">
                        <svg className="w-full h-full">
                          <polyline
                            points={team.valueHistory.map((point, pointIndex) => {
                              const x = (pointIndex / (team.valueHistory.length - 1)) * 100
                              const y = valueRange > 0 ? ((maxValue - point.value) / valueRange) * 100 : 50
                              return `${x}%,${y}%`
                            }).join(' ')}
                            fill="none"
                            strokeWidth="3"
                            className={strokeColor}
                            opacity="0.8"
                          />
                        </svg>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {teamValueData.slice(0, 8).map((team, index) => {
                const color = [
                  'text-yellow-400',
                  'text-blue-400', 
                  'text-green-400',
                  'text-red-400',
                  'text-purple-400',
                  'text-pink-400',
                  'text-cyan-400',
                  'text-orange-400'
                ][index % 8]
                
                const bgColor = color.replace('text-', 'bg-').replace('-400', '-400/10')
                const borderColor = color.replace('text-', 'border-').replace('-400', '-400/30')
                
                return (
                  <div key={team.teamId} className={`p-2 rounded-lg border ${bgColor} ${borderColor}`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${color.replace('text-', 'bg-')}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {team.teamName}
                        </div>
                        <div className="flex items-center space-x-1">
                          {team.totalValueChange > 0 ? (
                            <ArrowUp className="h-3 w-3 text-green-400" />
                          ) : team.totalValueChange < 0 ? (
                            <ArrowDown className="h-3 w-3 text-red-400" />
                          ) : (
                            <Minus className="h-3 w-3 text-slate-400" />
                          )}
                          <span className={`text-xs font-mono ${
                            team.totalValueChange > 0 ? 'text-green-400' : 
                            team.totalValueChange < 0 ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {team.totalValueChange > 0 ? '+' : ''}{team.totalValueChange.toFixed(1)} value
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Values & Rankings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200 font-mono text-lg">Current Values & Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teamValueData.map((team, index) => (
              <div key={team.teamId} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-slate-400 font-mono text-sm w-6">
                    #{team.currentRank}
                  </div>
                  <div>
                    <div className="text-slate-200 font-semibold text-sm">
                      {team.teamName}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {team.ownerName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-slate-300 font-mono">
                      {team.currentValue.toFixed(1)} value
                    </div>
                    <div className={`flex items-center space-x-1 text-xs ${
                      team.totalValueChange > 0 ? 'text-green-400' : 
                      team.totalValueChange < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {team.totalValueChange > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : team.totalValueChange < 0 ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      <span className="font-mono">
                        {team.totalValueChange > 0 ? '+' : ''}{team.totalValueChange.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {team.netTransactions > 0 ? '+' : ''}{team.netTransactions} trades
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
