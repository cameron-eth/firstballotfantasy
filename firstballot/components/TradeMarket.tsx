"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerHeadshot } from "@/components/player-headshot"
import { UserAvatar } from "@/components/user-avatar"
import { TrendingUp, TrendingDown, Trophy, Users, Target, Calendar, Award, ArrowUp, ArrowDown, Minus } from "lucide-react"

interface TradeMarketProps {
  leagueId: string
  teams: any[]
  allPlayers: Record<string, any>
  transactions: any[]
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

// Dynasty-based player valuation functions
const getPlayerValue = (rank: number): number => {
  if (!rank || rank <= 0) return Math.random() * 12 + 3 // Unranked: 3-15
  
  if (rank <= 12) return Math.random() * 15 + 85 // Top 12: 85-100
  if (rank <= 36) return Math.random() * 19 + 65 // Ranks 13-36: 65-84
  if (rank <= 72) return Math.random() * 19 + 45 // Ranks 37-72: 45-64
  if (rank <= 120) return Math.random() * 19 + 25 // Ranks 73-120: 25-44
  return Math.random() * 19 + 5 // Ranks 121+: 5-24
}

const getDraftPickValue = (round: number, season: string): DraftPickValue => {
  const currentYear = new Date().getFullYear()
  const yearDiff = parseInt(season) - currentYear
  
  // Base values
  let baseValue = 0
  if (round === 1) baseValue = 65
  else if (round === 2) baseValue = 25
  else if (round === 3) baseValue = 15
  else baseValue = Math.max(3, 8 - (round - 4) * 1) // 4th+: 8-3
  
  // 2027 class bonus
  let bonus = 0
  if (season === "2027") {
    if (round === 1) bonus = baseValue * 0.25
    else if (round === 2) bonus = baseValue * 0.35
    else if (round === 3) bonus = baseValue * 0.30
    else bonus = baseValue * 0.25
  }
  
  // Time discounting
  let adjustedValue = baseValue + bonus
  if (yearDiff > 0) {
    // Future picks discounted 15% per year
    adjustedValue *= Math.pow(0.85, yearDiff)
  } else if (yearDiff < 0) {
    // Past picks discounted 70% per year
    adjustedValue *= Math.pow(0.30, Math.abs(yearDiff))
  }
  
  return {
    season,
    round,
    baseValue,
    adjustedValue: Math.round(adjustedValue * 100) / 100,
    bonus: Math.round(bonus * 100) / 100
  }
}

const getGradeFromValue = (value: number): string => {
  if (value >= 50) return "A+"
  if (value >= 30) return "A"
  if (value >= 20) return "A-"
  if (value >= 10) return "B+"
  if (value >= 5) return "B"
  if (value >= 0) return "B-"
  if (value >= -10) return "C+"
  if (value >= -20) return "C"
  if (value >= -30) return "C-"
  if (value >= -50) return "D"
  return "F"
}

const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  'B': 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'D': 'bg-red-400/20 text-red-400 border-red-400',
  'F': 'bg-red-400/20 text-red-400 border-red-400',
} as const

const TradeMarket: React.FC<TradeMarketProps> = ({ leagueId, teams, allPlayers, transactions }) => {
  const [dynastyRankings, setDynastyRankings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Fetch dynasty rankings
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch('/api/rankings')
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
        }
      } catch (error) {
        console.error('Failed to fetch dynasty rankings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRankings()
  }, [])

  // Process trades and calculate values
  const tradeAnalysis = useMemo(() => {
    if (loading || !dynastyRankings) return []

    const trades = transactions.filter(tx => tx.type === 'trade')
    const analyzedTrades: TradeAnalysis[] = []

    trades.forEach(trade => {
      const tradeTeams = trade.roster_ids.map((rosterId: number) => {
        const team = teams.find(t => t.rosterId === rosterId)
        const teamName = team?.teamName || `Team ${rosterId}`
        const ownerName = team?.ownerName || 'Unknown'

        // Process players received
        const playersReceived: PlayerValue[] = []
        if (trade.adds) {
          Object.keys(trade.adds).forEach(playerId => {
            if (trade.adds[playerId] === rosterId) {
              const player = allPlayers[playerId]
              if (player) {
                const playerName = `${player.first_name} ${player.last_name}`
                const ranking = dynastyRankings[playerName]
                const rank = ranking?.rank || player.search_rank || 999
                const value = getPlayerValue(rank)
                
                playersReceived.push({
                  playerId,
                  playerName,
                  position: player.position,
                  team: player.team,
                  rank,
                  value: Math.round(value * 100) / 100,
                  tier: ranking?.tier ? `Tier ${ranking.tier}` : rank <= 12 ? 'Tier 1' : rank <= 36 ? 'Tier 2' : rank <= 72 ? 'Tier 3' : rank <= 120 ? 'Tier 4' : 'Tier 5'
                })
              }
            }
          })
        }

        // Process players sent
        const playersSent: PlayerValue[] = []
        if (trade.drops) {
          Object.keys(trade.drops).forEach(playerId => {
            if (trade.drops[playerId] === rosterId) {
              const player = allPlayers[playerId]
              if (player) {
                const playerName = `${player.first_name} ${player.last_name}`
                const ranking = dynastyRankings[playerName]
                const rank = ranking?.rank || player.search_rank || 999
                const value = getPlayerValue(rank)
                
                playersSent.push({
                  playerId,
                  playerName,
                  position: player.position,
                  team: player.team,
                  rank,
                  value: Math.round(value * 100) / 100,
                  tier: ranking?.tier ? `Tier ${ranking.tier}` : rank <= 12 ? 'Tier 1' : rank <= 36 ? 'Tier 2' : rank <= 72 ? 'Tier 3' : rank <= 120 ? 'Tier 4' : 'Tier 5'
                })
              }
            }
          })
        }

        // Process draft picks received
        const picksReceived: DraftPickValue[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.owner_id === rosterId) {
              picksReceived.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }

        // Process draft picks sent
        const picksSent: DraftPickValue[] = []
        if (trade.draft_picks) {
          trade.draft_picks.forEach((pick: any) => {
            if (pick.previous_owner_id === rosterId && pick.owner_id !== rosterId) {
              picksSent.push(getDraftPickValue(pick.round, pick.season))
            }
          })
        }

        const totalValueReceived = playersReceived.reduce((sum, p) => sum + p.value, 0) + 
                                 picksReceived.reduce((sum, p) => sum + p.adjustedValue, 0)
        const totalValueSent = playersSent.reduce((sum, p) => sum + p.value, 0) + 
                              picksSent.reduce((sum, p) => sum + p.adjustedValue, 0)
        const netValueGain = totalValueReceived - totalValueSent

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
          netValueGain
        }
      })

      const totalTradeValue = tradeTeams.reduce((sum: number, team: any) => sum + team.totalValueReceived, 0)
      const winner = tradeTeams.reduce((max: any, team: any) => team.netValueGain > max.netValueGain ? team : max).rosterId

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
      trade.teams.forEach(team => {
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">Loading trade analysis...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
                    {trade.season} Week {trade.week} • {trade.date}
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    Total Value: {Math.round(trade.totalTradeValue)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trade.teams.map((team) => (
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
                        {team.playersReceived.map((player, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-green-400/20 text-green-400">
                            {player.playerName} ({Math.round(player.value)})
                          </Badge>
                        ))}
                      </div>
                      
                      {team.picksReceived.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {team.picksReceived.map((pick, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-blue-400/20 text-blue-400">
                              {pick.season} R{pick.round} ({Math.round(pick.adjustedValue)})
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