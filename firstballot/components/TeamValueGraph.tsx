'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Calendar,
} from 'lucide-react'
import { getPlayerValue, type PlayerValuationData } from '@/lib/trade-utils'

interface TeamValueData {
  teamId: string
  teamName: string
  ownerName: string
  ownerAvatar?: string
  currentValue: number
  currentRank: number
  valueHistory: Array<{
    month: number
    week: number
    value: number
    rank: number
    change: number
    transactions: number
    monthLabel: string
  }>
  totalValueChange: number
  totalRankChange: number
  netTransactions: number
  tradeDetails: Array<{
    week: number
    type: 'trade' | 'waiver' | 'free_agent'
    valueChange: number
    playersAdded: Array<{ name: string; value: number }>
    playersDropped: Array<{ name: string; value: number }>
    tradePartner?: string
  }>
}

interface TeamValueGraphProps {
  teams: any[]
  transactions: any[]
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}

export function TeamValueGraph({
  teams,
  transactions,
  allPlayers,
  dynastyRankings,
}: TeamValueGraphProps) {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null)

  // Early return if no teams
  if (!teams || teams.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              TEAM VALUE TRENDS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Loading team data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Helper function to get player value using unified FirstBallotModel valuation system
  const getPlayerValueFromRankings = (player: any, rankings: Record<string, any>) => {
    const ranking = rankings[player.full_name] || rankings[player.name]

    if (ranking) {
      // Use new valuation system with total_score if available
      const valuationData: PlayerValuationData | undefined = ranking.total_score
        ? {
            total_score: ranking.total_score,
            tier: ranking.tier_name || ranking.tier,
            player_name: ranking.name,
            position: ranking.position,
          }
        : undefined

      const valueResult = getPlayerValue(valuationData, player.fantasy_ppg, player.games_played)

      return {
        totalValue: valueResult.value,
        valueWithPpg: valueResult.valueWithPpg || valueResult.value,
      }
    }

    // Unranked players: 3-15 points based on recent performance
    let unrankedValue = 8 // Default middle value
    if (player.fantasy_ppg && player.games_played >= 3) {
      // Scale 3-15 based on PPG (assuming 5-25 PPG range)
      const ppg = player.fantasy_ppg
      if (ppg >= 15) unrankedValue = 15
      else if (ppg >= 12) unrankedValue = 12
      else if (ppg >= 9) unrankedValue = 10
      else if (ppg >= 6) unrankedValue = 7
      else if (ppg >= 3) unrankedValue = 5
      else unrankedValue = 3
    }

    return {
      totalValue: unrankedValue,
      valueWithPpg: unrankedValue,
    }
  }

  // Helper function to get draft pick value
  const getDraftPickValue = (pick: any) => {
    const round = pick.round || 1
    const season = pick.season || new Date().getFullYear()
    const currentYear = new Date().getFullYear()
    const yearsOut = season - currentYear

    // Base values
    let baseValue: number
    if (round === 1) {
      baseValue = 55
    } else if (round === 2) {
      baseValue = 25
    } else if (round === 3) {
      baseValue = 15
    } else if (round === 4) {
      baseValue = 8
    } else {
      baseValue = Math.max(3, 8 - (round - 4)) // 4th+ rounds: 8-3 points
    }

    // 2027 Class Bonus
    if (season === 2027) {
      if (round === 1)
        baseValue *= 1.25 // +25%
      else if (round === 2)
        baseValue *= 1.35 // +35%
      else if (round === 3)
        baseValue *= 1.3 // +30%
      else baseValue *= 1.25 // +25% for 4th+
    }

    // Future picks discounted 15% per year
    if (yearsOut > 0) {
      baseValue *= Math.pow(0.85, yearsOut)
    }

    return Math.round(baseValue)
  }

  // Calculate team value changes from transactions
  const teamValueData = useMemo(() => {
    if (!teams.length || !transactions.length) return []

    // Helper to convert week to month (approximate: 4 weeks = 1 month)
    const weekToMonth = (week: number) => {
      if (week === 0) return 0 // Offseason
      return Math.floor(week / 4) + 1 // Weeks 1-4 = Month 1, 5-8 = Month 2, etc.
    }

    // Group transactions by month instead of week
    const transactionsByMonth = transactions.reduce(
      (acc, tx) => {
        const week = tx.leg || 0
        const month = weekToMonth(week)
        if (!acc[month]) acc[month] = []
        acc[month].push(tx)
        return acc
      },
      {} as Record<number, any[]>
    )

    // Calculate initial team values based on current roster
    const initialTeamValues = teams
      .map((team) => {
        let totalValue = 0

        // Calculate roster value using unified FirstBallotModel valuation system
        if (team.roster) {
          Object.values(team.roster).forEach((playerId: any) => {
            const player = allPlayers[playerId]
            if (player) {
              const playerValue = getPlayerValueFromRankings(player, dynastyRankings)
              totalValue += playerValue.totalValue
            }
          })
        }

        // Add draft pick values if available
        if (team.draft_picks) {
          team.draft_picks.forEach((pick: any) => {
            totalValue += getDraftPickValue(pick)
          })
        }

        return {
          teamId: team.rosterId,
          teamName: team.teamName,
          ownerName: team.ownerName,
          ownerAvatar: team.ownerAvatar,
          initialValue: Math.round(totalValue),
        }
      })
      .sort((a, b) => b.initialValue - a.initialValue)

    // Calculate value changes through transactions
    const teamHistory = initialTeamValues.map((team, initialRank) => {
      const history = []
      const tradeDetails: any[] = []
      let currentValue = team.initialValue
      let currentRank = initialRank + 1
      let netTransactions = 0

      // Add initial point (Month 0 = Offseason)
      history.push({
        month: 0,
        week: 0,
        value: currentValue,
        rank: currentRank,
        change: 0,
        transactions: 0,
        monthLabel: 'Offseason',
      })

      // Get all months that have transactions (to create data points)
      const allMonths = Object.keys(transactionsByMonth)
        .map(Number)
        .sort((a, b) => a - b)
      const maxMonth = allMonths.length > 0 ? Math.max(...allMonths) : 0

      // Always show at least 2 months (Sep, Oct) even if no transactions, up to current month
      const minMonthsToShow = 2 // Show at least Offseason + 2 months
      const monthsToDisplay = Math.max(maxMonth, minMonthsToShow)

      // Create data points for each month from 1 to display (even if no transactions)
      for (let month = 1; month <= monthsToDisplay; month++) {
        const monthTransactions = transactionsByMonth[month] || []
        let monthValueChange = 0
        let monthTransactionCount = 0

        monthTransactions.forEach((tx: any) => {
          // Check if this team is involved in this transaction
          const rosterIds = tx.roster_ids || []
          if (!rosterIds.includes(team.teamId)) return

          let transactionValueChange = 0
          const playersAdded: Array<{ name: string; value: number }> = []
          const playersDropped: Array<{ name: string; value: number }> = []

          // Process adds (players acquired)
          if (tx.adds) {
            Object.entries(tx.adds).forEach(([playerId, rosterId]) => {
              if (rosterId === team.teamId) {
                const player = allPlayers[playerId]
                if (player) {
                  const playerValue = getPlayerValueFromRankings(player, dynastyRankings)
                  const value = playerValue.valueWithPpg || playerValue.totalValue
                  transactionValueChange += value
                  playersAdded.push({
                    name: player.full_name || player.name || 'Unknown',
                    value: value,
                  })
                  monthTransactionCount++
                  netTransactions++
                }
              }
            })
          }

          // Process drops (players lost)
          if (tx.drops) {
            Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
              if (rosterId === team.teamId) {
                const player = allPlayers[playerId]
                if (player) {
                  const playerValue = getPlayerValueFromRankings(player, dynastyRankings)
                  const value = playerValue.valueWithPpg || playerValue.totalValue
                  transactionValueChange -= value
                  playersDropped.push({
                    name: player.full_name || player.name || 'Unknown',
                    value: value,
                  })
                  monthTransactionCount++
                  netTransactions--
                }
              }
            })
          }

          // Process draft picks (trades only)
          if (tx.draft_picks && tx.type === 'trade') {
            tx.draft_picks.forEach((pick: any) => {
              const pickValue = getDraftPickValue(pick)

              // Pick acquired by this team
              if (pick.owner_id === team.teamId && pick.previous_owner_id !== team.teamId) {
                transactionValueChange += pickValue
                playersAdded.push({
                  name: `${pick.season} Round ${pick.round} Pick`,
                  value: pickValue,
                })
                monthTransactionCount++
                netTransactions++
              }

              // Pick lost by this team
              if (pick.previous_owner_id === team.teamId && pick.owner_id !== team.teamId) {
                transactionValueChange -= pickValue
                playersDropped.push({
                  name: `${pick.season} Round ${pick.round} Pick`,
                  value: pickValue,
                })
                monthTransactionCount++
                netTransactions--
              }
            })
          }

          // If there was a value change, add to trade details
          if (playersAdded.length > 0 || playersDropped.length > 0) {
            // Find trade partner if it's a trade
            let tradePartner = undefined
            if (tx.type === 'trade' && rosterIds.length === 2) {
              const partnerRosterId = rosterIds.find((id: number) => id !== team.teamId)
              const partnerTeam = teams.find((t) => t.rosterId === partnerRosterId)
              tradePartner = partnerTeam?.teamName || 'Unknown'
            }

            tradeDetails.push({
              week: tx.leg || 0,
              type: tx.type,
              valueChange: transactionValueChange,
              playersAdded,
              playersDropped,
              tradePartner,
            })
          }

          monthValueChange += transactionValueChange
        })

        currentValue += monthValueChange

        // Recalculate rank based on new value
        const newTeamValues = [...initialTeamValues]
        const teamIndex = newTeamValues.findIndex((t) => t.teamId === team.teamId)
        newTeamValues[teamIndex] = { ...newTeamValues[teamIndex], initialValue: currentValue }
        newTeamValues.sort((a, b) => b.initialValue - a.initialValue)
        const newRank = newTeamValues.findIndex((t) => t.teamId === team.teamId) + 1

        const rankChange = currentRank - newRank
        currentRank = newRank

        // Month labels
        const monthLabels = ['Offseason', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

        // Add history point for every month (even if no transactions) to ensure chart displays
        history.push({
          month,
          week: 0,
          value: currentValue,
          rank: currentRank,
          change: rankChange,
          transactions: monthTransactionCount,
          monthLabel: monthLabels[month] || `M${month}`,
        })
      }

      const totalValueChange = currentValue - team.initialValue
      const totalRankChange = initialRank + 1 - currentRank

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        ownerName: team.ownerName,
        ownerAvatar: team.ownerAvatar,
        currentValue,
        currentRank,
        valueHistory: history,
        totalValueChange,
        totalRankChange,
        netTransactions,
        tradeDetails,
      }
    })

    return teamHistory.sort((a, b) => a.currentRank - b.currentRank)
  }, [teams, transactions, allPlayers, dynastyRankings])

  const toggleTeam = (teamId: string) => {
    const newSelected = new Set(selectedTeams)
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId)
    } else {
      newSelected.add(teamId)
    }
    setSelectedTeams(newSelected)
  }

  const displayedTeams =
    selectedTeams.size > 0
      ? teamValueData.filter((t) => selectedTeams.has(t.teamId))
      : teamValueData

  return (
    <div className="space-y-6">
      {/* Mobile Warning */}
      <div className="lg:hidden">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto">
                <Activity className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">
                  Laptop/Desktop Only Feature
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Team Value Analytics with interactive charts and detailed transaction history is
                  optimized for larger screens. Please view this feature on a laptop or desktop for
                  the best experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Content */}
      <div className="hidden lg:block space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-yellow-500/30 rounded-t-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Activity className="h-6 w-6 text-yellow-400" />
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Team Value Analytics
                </h1>
              </div>
              <p className="text-slate-400 text-sm">
                Dynasty SF valuation • Transaction tracking • Trend analysis
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Teams Tracked
              </div>
              <div className="text-2xl font-bold text-yellow-400">{teamValueData.length}</div>
            </div>
          </div>
        </div>

        {/* Team Value Graph */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100 text-xl font-bold">Value Trajectory</CardTitle>
                <p className="text-slate-400 text-sm mt-1">
                  Click teams below to filter • Hover to highlight
                </p>
              </div>
              {selectedTeams.size > 0 && (
                <button
                  onClick={() => setSelectedTeams(new Set())}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Show All Teams
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {teamValueData.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No team value data available</p>
                <p className="text-slate-500 text-sm mt-1">
                  Transactions and team rosters are needed to generate the chart
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Graph Area */}
                <div className="relative h-[500px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
                  <div className="absolute inset-6">
                    {(() => {
                      const allValues = teamValueData.flatMap((t) =>
                        t.valueHistory.map((h) => h.value)
                      )
                      const minValue = Math.min(...allValues)
                      const maxValue = Math.max(...allValues)
                      const valueRange = maxValue - minValue || 1

                      // Calculate Y-axis labels
                      const yAxisLabels = [
                        maxValue,
                        maxValue - valueRange * 0.33,
                        maxValue - valueRange * 0.66,
                        minValue,
                      ]

                      return (
                        <>
                          {/* Y-axis labels and grid lines */}
                          <div className="absolute left-0 top-0 bottom-10 w-16 flex flex-col justify-between">
                            {yAxisLabels.map((value, i) => (
                              <div key={i} className="relative">
                                <span className="absolute right-2 -translate-y-1/2 text-xs text-slate-400 font-mono font-semibold">
                                  {Math.round(value)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Horizontal grid lines */}
                          <div className="absolute left-16 right-0 top-0 bottom-10">
                            <div className="relative w-full h-full">
                              {[0, 33, 66, 100].map((percent, i) => (
                                <div
                                  key={i}
                                  className="absolute w-full border-t border-slate-700/40"
                                  style={{ top: `${percent}%` }}
                                />
                              ))}

                              {/* Vertical grid lines for months */}
                              {teamValueData[0].valueHistory.map((_, idx) => (
                                <div
                                  key={idx}
                                  className="absolute h-full border-l border-slate-700/20"
                                  style={{
                                    left: `${(idx / (teamValueData[0].valueHistory.length - 1)) * 100}%`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Chart lines with glow effect */}
                          <div className="absolute left-16 right-0 top-0 bottom-10">
                            <svg
                              className="w-full h-full"
                              preserveAspectRatio="none"
                              viewBox="0 0 100 100"
                            >
                              <defs>
                                {/* Glow filters for each color */}
                                {teamValueData.slice(0, 8).map((_, teamIndex) => (
                                  <filter
                                    key={`glow-${teamIndex}`}
                                    id={`glow-${teamIndex}`}
                                    x="-50%"
                                    y="-50%"
                                    width="200%"
                                    height="200%"
                                  >
                                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                    <feMerge>
                                      <feMergeNode in="coloredBlur" />
                                      <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                  </filter>
                                ))}
                              </defs>

                              {displayedTeams.slice(0, 8).map((team, teamIndex) => {
                                const originalIndex = teamValueData.findIndex(
                                  (t) => t.teamId === team.teamId
                                )
                                const colors = [
                                  '#facc15', // yellow-400
                                  '#60a5fa', // blue-400
                                  '#4ade80', // green-400
                                  '#f87171', // red-400
                                  '#c084fc', // purple-400
                                  '#f472b6', // pink-400
                                  '#22d3ee', // cyan-400
                                  '#fb923c', // orange-400
                                ]

                                const strokeColor = colors[originalIndex % 8]
                                const isHovered = hoveredTeam === team.teamId
                                const isDimmed = hoveredTeam !== null && !isHovered

                                const points = team.valueHistory.map((point, pointIndex) => {
                                  const x = (pointIndex / (team.valueHistory.length - 1)) * 100
                                  const y = ((maxValue - point.value) / valueRange) * 100
                                  return { x, y }
                                })

                                return (
                                  <g key={team.teamId}>
                                    {/* Line */}
                                    <polyline
                                      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                                      fill="none"
                                      stroke={strokeColor}
                                      strokeWidth={isHovered ? '4' : '3'}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity={isDimmed ? '0.2' : isHovered ? '1' : '0.85'}
                                      filter={isHovered ? `url(#glow-${originalIndex})` : 'none'}
                                      vectorEffect="non-scaling-stroke"
                                      style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Data points */}
                                    {points.map((point, idx) => (
                                      <circle
                                        key={idx}
                                        cx={point.x}
                                        cy={point.y}
                                        r={isHovered ? '3' : '2'}
                                        fill={strokeColor}
                                        stroke="white"
                                        strokeWidth={isHovered ? '2' : '1'}
                                        opacity={isDimmed ? '0.2' : '1'}
                                        vectorEffect="non-scaling-stroke"
                                        style={{ transition: 'all 0.2s ease' }}
                                      />
                                    ))}
                                  </g>
                                )
                              })}
                            </svg>
                          </div>

                          {/* X-axis labels (months) */}
                          {teamValueData.length > 0 && teamValueData[0].valueHistory.length > 0 && (
                            <div className="absolute left-16 right-0 bottom-0 h-10 flex items-center justify-between">
                              {teamValueData[0].valueHistory.map((point: any, idx: number) => (
                                <div key={idx} className="flex-1 text-center">
                                  <span className="text-xs font-semibold text-slate-400 font-mono">
                                    {point.monthLabel || `M${point.month}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Legend with Monthly Trends */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {teamValueData.slice(0, 8).map((team, index) => {
                    const colors = [
                      {
                        text: 'text-yellow-400',
                        bg: 'bg-yellow-400',
                        border: 'border-yellow-400',
                        hex: '#facc15',
                      },
                      {
                        text: 'text-blue-400',
                        bg: 'bg-blue-400',
                        border: 'border-blue-400',
                        hex: '#60a5fa',
                      },
                      {
                        text: 'text-green-400',
                        bg: 'bg-green-400',
                        border: 'border-green-400',
                        hex: '#4ade80',
                      },
                      {
                        text: 'text-red-400',
                        bg: 'bg-red-400',
                        border: 'border-red-400',
                        hex: '#f87171',
                      },
                      {
                        text: 'text-purple-400',
                        bg: 'bg-purple-400',
                        border: 'border-purple-400',
                        hex: '#c084fc',
                      },
                      {
                        text: 'text-pink-400',
                        bg: 'bg-pink-400',
                        border: 'border-pink-400',
                        hex: '#f472b6',
                      },
                      {
                        text: 'text-cyan-400',
                        bg: 'bg-cyan-400',
                        border: 'border-cyan-400',
                        hex: '#22d3ee',
                      },
                      {
                        text: 'text-orange-400',
                        bg: 'bg-orange-400',
                        border: 'border-orange-400',
                        hex: '#fb923c',
                      },
                    ]

                    const colorSet = colors[index % 8]

                    // Calculate monthly trend (last month vs this month)
                    const recentMonths = team.valueHistory.slice(-2)
                    const monthlyChange =
                      recentMonths.length === 2 ? recentMonths[1].value - recentMonths[0].value : 0

                    const avatarUrl = team.ownerAvatar
                      ? `https://sleepercdn.com/avatars/thumbs/${team.ownerAvatar}`
                      : '/placeholder-user.jpg'

                    const isSelected = selectedTeams.has(team.teamId)
                    const isHovered = hoveredTeam === team.teamId

                    return (
                      <div
                        key={team.teamId}
                        onClick={() => toggleTeam(team.teamId)}
                        onMouseEnter={() => setHoveredTeam(team.teamId)}
                        onMouseLeave={() => setHoveredTeam(null)}
                        className={`relative p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? `${colorSet.border} bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg scale-105`
                            : `${colorSet.border}/30 bg-gradient-to-br from-slate-800 to-slate-900 hover:${colorSet.border}/60 hover:shadow-lg hover:scale-102`
                        }`}
                      >
                        {/* Colored accent bar */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 ${colorSet.bg} rounded-t-xl ${isSelected ? 'h-2' : ''}`}
                        ></div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div
                            className={`absolute -top-2 -right-2 w-6 h-6 ${colorSet.bg} rounded-full flex items-center justify-center shadow-lg`}
                          >
                            <svg
                              className="w-4 h-4 text-slate-900"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}

                        <div className="flex items-start space-x-3 mt-1">
                          {/* Avatar with colored ring */}
                          <div
                            className={`relative flex-shrink-0 ring-2 ${colorSet.border} rounded-full p-0.5`}
                          >
                            <img
                              src={avatarUrl}
                              alt={team.ownerName}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/placeholder-user.jpg'
                              }}
                            />
                            <div
                              className={`absolute -bottom-1 -right-1 w-6 h-6 ${colorSet.bg} rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shadow-lg`}
                            >
                              #{team.currentRank}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Team Name */}
                            <div className="text-sm font-bold text-slate-100 truncate mb-0.5">
                              {team.teamName}
                            </div>

                            {/* Owner Name */}
                            <div className="text-xs text-slate-400 truncate mb-2">
                              {team.ownerName}
                            </div>

                            {/* Stats */}
                            <div className="space-y-1">
                              {/* Total change */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Total Value</span>
                                <div className="flex items-center space-x-1">
                                  {team.totalValueChange > 0 ? (
                                    <TrendingUp className="h-3 w-3 text-green-400" />
                                  ) : team.totalValueChange < 0 ? (
                                    <TrendingDown className="h-3 w-3 text-red-400" />
                                  ) : (
                                    <Minus className="h-3 w-3 text-slate-400" />
                                  )}
                                  <span
                                    className={`text-sm font-bold font-mono ${
                                      team.totalValueChange > 0
                                        ? 'text-green-400'
                                        : team.totalValueChange < 0
                                          ? 'text-red-400'
                                          : 'text-slate-400'
                                    }`}
                                  >
                                    {team.totalValueChange > 0 ? '+' : ''}
                                    {team.totalValueChange.toFixed(0)}
                                  </span>
                                </div>
                              </div>

                              {/* Monthly change */}
                              {monthlyChange !== 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">This Month</span>
                                  <div className="flex items-center space-x-1">
                                    {monthlyChange > 0 ? (
                                      <ArrowUp className="h-3 w-3 text-green-400/70" />
                                    ) : (
                                      <ArrowDown className="h-3 w-3 text-red-400/70" />
                                    )}
                                    <span
                                      className={`text-sm font-mono ${
                                        monthlyChange > 0 ? 'text-green-400/80' : 'text-red-400/80'
                                      }`}
                                    >
                                      {monthlyChange > 0 ? '+' : ''}
                                      {monthlyChange.toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Values & Rankings */}
        {teamValueData.length > 0 && (
          <>
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100 text-xl font-bold">Team Rankings</CardTitle>
                  <div className="text-xs text-slate-400">Based on Dynasty SF valuations</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamValueData.map((team, index) => {
                    const avatarUrl = team.ownerAvatar
                      ? `https://sleepercdn.com/avatars/thumbs/${team.ownerAvatar}`
                      : '/placeholder-user.jpg'

                    const rankColors = [
                      'bg-yellow-400 text-slate-900', // 1st
                      'bg-slate-300 text-slate-900', // 2nd
                      'bg-orange-600 text-white', // 3rd
                      'bg-slate-600 text-slate-200', // 4th+
                    ]
                    const rankColor = index < 3 ? rankColors[index] : rankColors[3]

                    return (
                      <div
                        key={team.teamId}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/50 to-slate-800/30 rounded-xl border border-slate-600/50 hover:border-slate-500 transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          {/* Rank Badge */}
                          <div
                            className={`w-10 h-10 rounded-lg ${rankColor} flex items-center justify-center font-bold text-lg shadow-lg`}
                          >
                            {team.currentRank}
                          </div>

                          {/* Avatar */}
                          <img
                            src={avatarUrl}
                            alt={team.ownerName}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-600 shadow-lg"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = '/placeholder-user.jpg'
                            }}
                          />

                          {/* Team Info */}
                          <div>
                            <div className="text-slate-100 font-bold text-sm">{team.teamName}</div>
                            <div className="text-slate-400 text-xs">{team.ownerName}</div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-slate-400 text-xs">Current Value</div>
                            <div className="text-slate-200 font-bold font-mono">
                              {team.currentValue.toFixed(1)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-slate-400 text-xs">Change</div>
                            <div
                              className={`flex items-center space-x-1 font-mono font-bold ${
                                team.totalValueChange > 0
                                  ? 'text-green-400'
                                  : team.totalValueChange < 0
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {team.totalValueChange > 0 ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : team.totalValueChange < 0 ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                              <span>
                                {team.totalValueChange > 0 ? '+' : ''}
                                {team.totalValueChange.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-slate-400 text-xs">Transactions</div>
                            <div className="text-slate-300 font-mono font-semibold">
                              {team.netTransactions > 0 ? '+' : ''}
                              {team.netTransactions}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Trade History */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-400/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-100 text-xl font-bold">
                      Transaction History
                    </CardTitle>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Complete trade timeline with value analysis
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamValueData
                    .flatMap((team) =>
                      team.tradeDetails.map((trade) => ({
                        ...trade,
                        teamId: team.teamId,
                        teamName: team.teamName,
                      }))
                    )
                    .sort((a, b) => b.week - a.week) // Most recent first
                    .map((trade, index) => {
                      const isPositive = trade.valueChange > 0
                      const isNegative = trade.valueChange < 0

                      return (
                        <div
                          key={`${trade.teamId}-${trade.week}-${index}`}
                          className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`p-2 rounded ${
                                    trade.type === 'trade'
                                      ? 'bg-yellow-400/10'
                                      : trade.type === 'waiver'
                                        ? 'bg-blue-400/10'
                                        : 'bg-green-400/10'
                                  }`}
                                >
                                  <ArrowLeftRight
                                    className={`h-4 w-4 ${
                                      trade.type === 'trade'
                                        ? 'text-yellow-400'
                                        : trade.type === 'waiver'
                                          ? 'text-blue-400'
                                          : 'text-green-400'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-slate-200 font-semibold text-sm">
                                      {trade.teamName}
                                    </span>
                                    {trade.tradePartner && (
                                      <>
                                        <ArrowLeftRight className="h-3 w-3 text-slate-500" />
                                        <span className="text-slate-300 text-sm">
                                          {trade.tradePartner}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    Week {trade.week} •{' '}
                                    {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`flex items-center space-x-1 font-mono text-sm ${
                                isPositive
                                  ? 'text-green-400'
                                  : isNegative
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : isNegative ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                              <span className="font-bold">
                                {trade.valueChange > 0 ? '+' : ''}
                                {trade.valueChange.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Players Acquired */}
                            {trade.playersAdded.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                                  Acquired ({trade.playersAdded.length})
                                </div>
                                <div className="space-y-1.5">
                                  {trade.playersAdded.map(
                                    (player: { name: string; value: number }, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-green-400/5 rounded border border-green-400/20"
                                      >
                                        <span className="text-slate-200 text-sm">
                                          {player.name}
                                        </span>
                                        <span className="text-green-400 text-xs font-mono">
                                          +{player.value.toFixed(1)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Players Lost */}
                            {trade.playersDropped.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                                  Gave Up ({trade.playersDropped.length})
                                </div>
                                <div className="space-y-1.5">
                                  {trade.playersDropped.map(
                                    (player: { name: string; value: number }, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-red-400/5 rounded border border-red-400/20"
                                      >
                                        <span className="text-slate-200 text-sm">
                                          {player.name}
                                        </span>
                                        <span className="text-red-400 text-xs font-mono">
                                          -{player.value.toFixed(1)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  {teamValueData.every((team) => team.tradeDetails.length === 0) && (
                    <div className="text-center py-12">
                      <ArrowLeftRight className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No trades recorded yet</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Trade activity will appear here once transactions occur
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
