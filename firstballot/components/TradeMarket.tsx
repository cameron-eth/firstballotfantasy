"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { UserAvatar } from "@/components/user-avatar"
import { TrendingUp, TrendingDown, Trophy, Users, Target, Calendar, ArrowUp, ArrowDown, Minus, AlertCircle } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  processPlayerForTrade,
  getDraftPickValue,
  getGradeFromValue,
  GRADE_COLORS,
} from "@/lib/trade-utils"

interface TradeMarketProps {
  leagueId: string
  teams: any[]
  allPlayers: Record<string, any>
  transactions: any[]
  userId?: string
  dynastyRankings?: Record<string, any>
  lastUpdated?: string
  dataVersion?: string
  weeksAnalyzed?: number[]
  totalTransactionsAnalyzed?: number
}

interface PlayerValue {
  playerId: string
  playerName: string
  position: string
  team: string
  rank: number
  value: number
  tier: string
}

interface DraftPickValue {
  season: string
  round: number
  baseValue: number
  adjustedValue: number
  bonus: number
  timeDiscount?: number
  finalValue: number
}

interface TradeAnalysis {
  transactionId: string
  week: number
  season: string
  date: string
  teams: {
    rosterId: number
    teamName: string
    ownerName: string
    playersReceived: PlayerValue[]
    picksReceived: DraftPickValue[]
    totalValueReceived: number
    playersSent: PlayerValue[]
    picksSent: DraftPickValue[]
    totalValueSent: number
    netValueGain: number
  }[]
  totalTradeValue: number
  winner: number | null
}

interface TraderStats {
  rosterId: number
  teamName: string
  ownerName: string
  totalTrades: number
  totalValueGained: number
  avgValuePerTrade: number
  winRate: number
  bestTrade: number
  worstTrade: number
  totalValueMoved: number
  grade: string
}

const TradeMarket: React.FC<TradeMarketProps> = ({ 
  leagueId, 
  teams, 
  allPlayers, 
  transactions, 
  userId,
  dynastyRankings: initialDynastyRankings,
  lastUpdated,
  dataVersion,
  weeksAnalyzed,
  totalTransactionsAnalyzed
}) => {
  const [dynastyRankings, setDynastyRankings] = useState<Record<string, any>>(initialDynastyRankings || {})
  const [loading, setLoading] = useState(!initialDynastyRankings)
  const [error, setError] = useState<string | null>(null)

  // Fetch dynasty rankings if not provided
  useEffect(() => {
    if (initialDynastyRankings) {
      setDynastyRankings(initialDynastyRankings)
      setLoading(false)
      return
    }

    const fetchRankings = async () => {
      try {
        setError(null)
        const response = await fetch('/api/rankings', { 
          cache: 'force-cache',
          next: { revalidate: 3600 } // 1 hour
        })
        if (response.ok) {
          const data = await response.json()
          const rankingsMap = data.reduce((acc: any, player: any) => {
            const playerName = player['PLAYER NAME']
            if (playerName) {
              acc[playerName] = {
                rank: player.RK,
                position: player.POS,
                team: player.TEAM,
                name: playerName,
                tier: player.RK <= 12 ? 1 : player.RK <= 36 ? 2 : player.RK <= 72 ? 3 : player.RK <= 120 ? 4 : 5
              }
            }
            return acc
          }, {})
          setDynastyRankings(rankingsMap)
        } else {
          throw new Error('Failed to fetch rankings')
        }
      } catch (error) {
        console.error('Failed to fetch dynasty rankings:', error)
        setError('Failed to load dynasty rankings data')
      } finally {
        setLoading(false)
      }
    }
    fetchRankings()
  }, [initialDynastyRankings])

  // Process trades and calculate values using shared utils
  const tradeAnalysis = useMemo(() => {
    if (loading || !dynastyRankings) return []
    const trades = transactions.filter(tx => tx.type === 'trade')
    const analyzedTrades: TradeAnalysis[] = []

    trades.forEach(trade => {
      // Map of rosterId to team trade data
      const tradeTeams = trade.roster_ids.map((rosterId: number) => {
        const team = teams.find(t => t.rosterId === rosterId)
        const teamName = team?.teamName || `Team ${rosterId}`
        const ownerName = team?.ownerName || 'Unknown'

        // Players received
        const playersReceived: PlayerValue[] = []
        if (trade.adds) {
          Object.keys(trade.adds).forEach(playerId => {
            if (trade.adds[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) playersReceived.push(playerValue)
            }
          })
        }
        // Players sent
        const playersSent: PlayerValue[] = []
        if (trade.drops) {
          Object.keys(trade.drops).forEach(playerId => {
            if (trade.drops[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) playersSent.push(playerValue)
            }
          })
        }
        // Draft picks received
        const picksReceived: DraftPickValue[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.owner_id === rosterId) {
              picksReceived.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }
        // Draft picks sent
        const picksSent: DraftPickValue[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.previous_owner_id === rosterId && pick.owner_id !== rosterId) {
              picksSent.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }
        const totalValueReceived = playersReceived.reduce((sum, p) => sum + p.value, 0) + picksReceived.reduce((sum, p) => sum + p.finalValue, 0)
        const totalValueSent = playersSent.reduce((sum, p) => sum + p.value, 0) + picksSent.reduce((sum, p) => sum + p.finalValue, 0)
        // Net value gain: just received - sent
        return {
          rosterId,
          teamName,
          ownerName,
          playersReceived,
          picksReceived,
          totalValueReceived,
          playersSent,
          picksSent,
          totalValueSent,
          netValueGain: Math.round((totalValueReceived - totalValueSent) * 100) / 100
        }
      })
      // Winner: team with highest totalValueReceived
      const winner = tradeTeams.reduce((max: any, team: any) => team.totalValueReceived > max.totalValueReceived ? team : max, tradeTeams[0]).rosterId
      const totalTradeValue = tradeTeams.reduce((sum: number, team: any) => sum + team.totalValueReceived, 0)
      analyzedTrades.push({
        transactionId: trade.transaction_id,
        week: trade.leg,
        season: new Date(trade.created).getFullYear().toString(),
        date: new Date(trade.created).toLocaleDateString(),
        teams: tradeTeams,
        totalTradeValue,
        winner
      })
    })
    return analyzedTrades
  }, [transactions, teams, allPlayers, dynastyRankings, loading])

  // Calculate trader statistics
  const traderStats = useMemo(() => {
    const stats: Record<number, TraderStats> = {}
    tradeAnalysis.forEach(trade => {
      trade.teams.forEach((team: any) => {
        if (!stats[team.rosterId]) {
          stats[team.rosterId] = {
            rosterId: team.rosterId,
            teamName: team.teamName,
            ownerName: team.ownerName,
            totalTrades: 0,
            totalValueGained: 0,
            avgValuePerTrade: 0,
            winRate: 0,
            bestTrade: 0,
            worstTrade: 0,
            totalValueMoved: 0,
            grade: 'F'
          }
        }
        const stat = stats[team.rosterId]
        stat.totalTrades++
        stat.totalValueGained += team.netValueGain
        stat.totalValueMoved += team.totalValueReceived + team.totalValueSent
        stat.bestTrade = Math.max(stat.bestTrade, team.netValueGain)
        stat.worstTrade = Math.min(stat.worstTrade, team.netValueGain)
      })
    })
    // Calculate averages and win rates
    Object.values(stats).forEach(stat => {
      stat.avgValuePerTrade = stat.totalTrades > 0 ? stat.totalValueGained / stat.totalTrades : 0
      stat.grade = getGradeFromValue(stat.totalValueGained)
    })
    return Object.values(stats).sort((a, b) => b.totalValueGained - a.totalValueGained)
  }, [tradeAnalysis])

  // Calculate total value exchanged per owner for pie chart
  const valueExchangedByOwner = useMemo(() => {
    const exchanged: Record<number, { teamName: string, ownerName: string, value: number }> = {}
    tradeAnalysis.forEach(trade => {
      trade.teams.forEach(team => {
        if (!exchanged[team.rosterId]) {
          exchanged[team.rosterId] = {
            teamName: team.teamName,
            ownerName: team.ownerName,
            value: 0
          }
        }
        exchanged[team.rosterId].value += team.totalValueReceived + team.totalValueSent
      })
    })
    return Object.values(exchanged).map(owner => ({
      name: owner.teamName,
      value: Math.round(owner.value * 10) / 10,
      ownerName: owner.ownerName
    }))
  }, [tradeAnalysis])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">Loading trade analysis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center space-x-2 text-red-400 mb-4">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading trade data</span>
        </div>
        <div className="text-sm text-slate-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Status Bar */}
      {(lastUpdated || dataVersion || weeksAnalyzed) && (
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
              {lastUpdated && (
                <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
              )}
              {dataVersion && (
                <span>Data version: {dataVersion}</span>
              )}
              {weeksAnalyzed && weeksAnalyzed.length > 0 && (
                <span>Weeks analyzed: {weeksAnalyzed.join(', ')}</span>
              )}
              {totalTransactionsAnalyzed && (
                <span>Total transactions: {totalTransactionsAnalyzed}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{tradeAnalysis.length}</div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.playersReceived.length + team.playersSent.length, 0), 0)}
              </div>
              <div className="text-sm text-gray-400">Players Traded</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.picksReceived.length + team.picksSent.length, 0), 0)}
              </div>
              <div className="text-sm text-gray-400">Draft Picks</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0))}
              </div>
              <div className="text-sm text-gray-400">Total Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trade Leaderboard */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono text-lg flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>TRADE LEADERBOARD</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {traderStats.map((trader, index) => (
              <div key={trader.rosterId} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-yellow-400">#{index + 1}</div>
                  <UserAvatar
                    avatarId={teams.find(t => t.rosterId === trader.rosterId)?.ownerAvatar}
                    displayName={trader.ownerName}
                    username={trader.ownerName}
                    size={32}
                    className="flex-shrink-0"
                  />
                  <div>
                    <div className="font-semibold text-slate-100">{trader.teamName}</div>
                    <div className="text-sm text-gray-400">{trader.ownerName}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-400">{trader.totalTrades} trades</div>
                    <div className={`font-semibold ${trader.totalValueGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trader.totalValueGained >= 0 ? '+' : ''}{Math.round(trader.totalValueGained * 10) / 10}
                    </div>
                  </div>
                  <Badge variant="outline" className={GRADE_COLORS[trader.grade as keyof typeof GRADE_COLORS]}>
                    {trader.grade}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Total Value Gained Pie Chart */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-purple-400 font-mono text-lg flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>TOTAL VALUE GAINED</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {traderStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={traderStats.map(trader => ({
                    name: trader.teamName,
                    value: Math.round(trader.totalValueGained * 10) / 10,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {traderStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={[
                        '#FFD600', '#00E676', '#2979FF', '#FF1744', '#FF9100', 
                        '#00B8D4', '#C51162', '#AEEA00', '#D500F9', '#FF3D00'
                      ][index % 10]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} points`, 'Value Gained']}
                  labelFormatter={(label) => `Team: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400">No trade data available</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Value Exchanged Pie Chart */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-cyan-400 font-mono text-lg flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>TOTAL VALUE EXCHANGED</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {valueExchangedByOwner.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={valueExchangedByOwner}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#00bcd4"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {valueExchangedByOwner.map((entry, index) => (
                    <Cell
                      key={`cell-exchanged-${index}`}
                      fill={[
                        '#FFD600', '#00E676', '#2979FF', '#FF1744', '#FF9100',
                        '#00B8D4', '#C51162', '#AEEA00', '#D500F9', '#FF3D00'
                      ][index % 10]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} points`, 'Value Exchanged']}
                  labelFormatter={(label) => `Team: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400">No trade data available</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono text-lg flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>RECENT TRADES</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tradeAnalysis.slice(0, 5).map((trade) => (
              <div key={trade.transactionId} className="p-4 bg-slate-800 border border-slate-600 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-400">
                    {trade.season} Week {trade.week}  {trade.date}
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    Total Value: {Math.round(trade.totalTradeValue)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trade.teams.map((team: any) => (
                    <div key={team.rosterId} className={`p-3 rounded-lg border ${
                      team.rosterId === trade.winner 
                        ? 'bg-green-400/10 border-green-400' 
                        : 'bg-slate-700 border-slate-600'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-slate-100">{team.teamName}</div>
                        <div className={`text-sm font-semibold ${
                          team.netValueGain >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {team.netValueGain >= 0 ? '+' : ''}{Math.round(team.netValueGain * 10) / 10}
                        </div>
                      </div>
                      {team.playersReceived.length > 0 && (
                        <div className="text-xs text-gray-400 mb-1">Received:</div>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {team.playersReceived.map((player: PlayerValue, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-green-400/20 text-green-400">
                            {player.playerName} ({Math.round(player.value)})
                          </Badge>
                        ))}
                      </div>
                      {team.picksReceived.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {team.picksReceived.map((pick: DraftPickValue, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-blue-400/20 text-blue-400">
                              {pick.season} R{pick.round} ({Math.round(pick.finalValue)})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TradeMarket 