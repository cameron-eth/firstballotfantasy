"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerHeadshot } from "@/components/player-headshot"
import { UserAvatar } from "@/components/user-avatar"
import { TrendingUp, TrendingDown, Trophy, Users, Target, Calendar, Award, ArrowUp, ArrowDown, Minus, ArrowLeft, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  getPlayerValue, 
  getDraftPickValue, 
  getGradeFromValue, 
  GRADE_COLORS,
  matchPlayerToRankings,
  processPlayerForTrade,
  calculateTraderStats,
  formatValue,
  getValuationSystemDescription,
  type PlayerValue,
  type DraftPickValue,
  type TradeAnalysis,
  type TraderStats
} from "@/lib/trade-utils"
import { TradeCharts } from "@/components/trade-charts"

// Using types from trade-utils.ts

// Using valuation functions from trade-utils.ts

export default function TradeMarketPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [leagueId, setLeagueId] = useState<string>('')
  
  const [teams, setTeams] = useState<any[]>([])
  const [allPlayers, setAllPlayers] = useState<Record<string, any>>({})
  const [transactions, setTransactions] = useState<any[]>([])
  const [tradedPicks, setTradedPicks] = useState<any[]>([])
  const [dynastyRankings, setDynastyRankings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noLeagueId, setNoLeagueId] = useState(false)

  // Try to get league ID from multiple sources
  useEffect(() => {
    // First try URL params
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
      setLeagueId(urlLeagueId)
      return
    }
    
    // Then try localStorage (cached from LeagueBuddy)
    const cachedLeagueId = localStorage.getItem('cachedLeagueId')
    if (cachedLeagueId) {
      console.log('Trade Market Page: Using cached league ID:', cachedLeagueId)
      setLeagueId(cachedLeagueId)
      return
    }
    
    // Finally try sessionStorage
    const sessionLeagueId = sessionStorage.getItem('currentLeagueId')
    if (sessionLeagueId) {
      console.log('Trade Market Page: Using session league ID:', sessionLeagueId)
      setLeagueId(sessionLeagueId)
      return
    }
    
    console.log('Trade Market Page: No league ID found in any source')
    setNoLeagueId(true)
    setLoading(false)
  }, [searchParams])

  // Fetch all necessary data using the new API endpoint
  useEffect(() => {
    const fetchData = async () => {
      if (!leagueId) {
        console.log('No leagueId provided')
        return
      }
      
      console.log('Trade Market Page: Fetching data for leagueId:', leagueId)
      setNoLeagueId(false) // Reset the no league ID state when we have a league ID
      
      try {
        setLoading(true)
        setError(null)

        // Use the new trade market API endpoint
        const apiUrl = `/api/trade-market?leagueId=${leagueId}`
        console.log('Trade Market Page: Making API call to:', apiUrl)
        const response = await fetch(apiUrl)
        
        console.log('Trade Market Page: API response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Trade Market Page: API error response:', errorText)
          throw new Error(`Failed to fetch trade market data: ${response.status}`)
        }

        const result = await response.json()
        
        console.log('Trade Market Page: API result:', {
          success: result.success,
          hasData: !!result.data,
          totalTrades: result.data?.totalTrades,
          totalTeams: result.data?.totalTeams,
          fullResult: result // Log the full result for debugging
        })
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch trade market data')
        }

        const { data } = result
        
        console.log('Trade Market Page: Setting state with data:', {
          teamsCount: data.teams?.length,
          playersCount: Object.keys(data.allPlayers || {}).length,
          transactionsCount: data.transactions?.length,
          tradedPicksCount: data.tradedPicks?.length,
          rankingsCount: Object.keys(data.dynastyRankings || {}).length,
          currentWeek: data.currentWeek,
          fullData: data // Log the full data for debugging
        })
        
        setTeams(data.teams || [])
        setAllPlayers(data.allPlayers || {})
        setTransactions(data.transactions || [])
        setTradedPicks(data.tradedPicks || [])
        setDynastyRankings(data.dynastyRankings || {})

        console.log('Trade Market Data Loaded:', {
          totalTrades: data.totalTrades,
          totalTeams: data.totalTeams,
          leagueId: data.leagueId
        })

      } catch (err) {
        console.error('Trade Market Page: Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load trade market data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [leagueId])

  // Process trades and calculate values
  const tradeAnalysis = useMemo(() => {
    console.log('Trade Market Page: Processing trade analysis with:', {
      loading,
      hasRankings: !!dynastyRankings && Object.keys(dynastyRankings).length > 0,
      transactionsCount: transactions.length,
      teamsCount: teams.length
    })
    
    if (loading || !dynastyRankings || Object.keys(dynastyRankings).length === 0) {
      console.log('Trade Market Page: Skipping trade analysis - missing data')
      return []
    }

    const analyzedTrades: TradeAnalysis[] = []

    console.log('Trade Market Page: Processing', transactions.length, 'transactions')

    transactions.forEach((trade, index) => {
      console.log(`Trade Market Page: Processing trade ${index + 1}:`, {
        transactionId: trade.transaction_id,
        type: trade.type,
        rosterIds: trade.roster_ids,
        hasAdds: !!trade.adds,
        hasDrops: !!trade.drops,
        hasDraftPicks: !!trade.draft_picks
      })
      
      const tradeTeams = trade.roster_ids.map((rosterId: number) => {
        const team = teams.find(t => t.rosterId === rosterId)
        const teamName = team?.teamName || `Team ${rosterId}`
        const ownerName = team?.ownerName || 'Unknown'

        // Process players received
        const playersReceived: PlayerValue[] = []
        if (trade.adds) {
          Object.keys(trade.adds).forEach(playerId => {
            if (trade.adds[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) {
                playersReceived.push(playerValue)
              }
            }
          })
        }

        // Process players sent
        const playersSent: PlayerValue[] = []
        if (trade.drops) {
          Object.keys(trade.drops).forEach(playerId => {
            if (trade.drops[playerId] === rosterId) {
              const playerValue = processPlayerForTrade(playerId, allPlayers, dynastyRankings)
              if (playerValue) {
                playersSent.push(playerValue)
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
                                 picksReceived.reduce((sum, p) => sum + p.finalValue, 0)
        const totalValueSent = playersSent.reduce((sum, p) => sum + p.value, 0) + 
                              picksSent.reduce((sum, p) => sum + p.finalValue, 0)
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

      const totalTradeValue = tradeTeams.reduce((sum, team) => sum + team.totalValueReceived, 0)
      const winner = tradeTeams.reduce((max, team) => team.netValueGain > max.netValueGain ? team : max).rosterId

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

    console.log('Trade Market Page: Trade analysis complete:', {
      analyzedTradesCount: analyzedTrades.length
    })

    return analyzedTrades
  }, [transactions, teams, allPlayers, dynastyRankings, loading])

  // Calculate trader statistics using utility function
  const traderStats = useMemo(() => {
    return calculateTraderStats(tradeAnalysis)
  }, [tradeAnalysis])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-slate-400">Loading Trade Market...</div>
          </div>
        </div>
      </div>
    )
  }

  if (noLeagueId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-yellow-400 font-mono mb-6">TRADE MARKET</h1>
            <p className="text-slate-400 mb-6">No league ID found. Please enter your Sleeper league ID:</p>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <input
                type="text"
                placeholder="Enter league ID"
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    if (input.value.trim()) {
                      setLeagueId(input.value.trim())
                      localStorage.setItem('cachedLeagueId', input.value.trim())
                      setNoLeagueId(false)
                      setLoading(true)
                    }
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Enter league ID"]') as HTMLInputElement
                  if (input?.value.trim()) {
                    setLeagueId(input.value.trim())
                    localStorage.setItem('cachedLeagueId', input.value.trim())
                    setNoLeagueId(false)
                    setLoading(true)
                  }
                }}
                className="bg-yellow-400 text-black hover:bg-yellow-300"
              >
                Load League
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test')
                    const result = await response.json()
                    console.log('Test API result:', result)
                    alert(`Test API: ${result.success ? 'Success' : 'Failed'}\nSupabase: ${result.supabase?.hasError ? 'Error' : 'OK'}`)
                  } catch (err) {
                    console.error('Test API error:', err)
                    alert('Test API failed')
                  }
                }}
                className="bg-blue-400 text-black hover:bg-blue-300"
              >
                Test API
              </Button>
            </div>
            <Button 
              onClick={() => router.back()}
              className="bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">{error}</div>
            <div className="mb-6">
              <p className="text-slate-400 mb-2">No league ID found. Please enter your Sleeper league ID:</p>
              <div className="flex items-center justify-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter league ID"
                  className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement
                      if (input.value.trim()) {
                        setLeagueId(input.value.trim())
                        localStorage.setItem('cachedLeagueId', input.value.trim())
                      }
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Enter league ID"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      setLeagueId(input.value.trim())
                      localStorage.setItem('cachedLeagueId', input.value.trim())
                    }
                  }}
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                >
                  Load League
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/test')
                      const result = await response.json()
                      console.log('Test API result:', result)
                      alert(`Test API: ${result.success ? 'Success' : 'Failed'}\nSupabase: ${result.supabase?.hasError ? 'Error' : 'OK'}`)
                    } catch (err) {
                      console.error('Test API error:', err)
                      alert('Test API failed')
                    }
                  }}
                  className="bg-blue-400 text-black hover:bg-blue-300"
                >
                  Test API
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => router.back()}
              className="bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono">TRADE MARKET</h1>
              <p className="text-sm sm:text-base text-slate-400">Dynasty-based trade analysis and valuations</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">{tradeAnalysis.length}</div>
                <div className="text-xs sm:text-sm text-gray-400">Total Trades</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.playersReceived.length + team.playersSent.length, 0), 0)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Players Traded</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-400">
                  {tradedPicks.length + tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.picksReceived.length + team.picksSent.length, 0), 0)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Draft Picks</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-yellow-400">
                  {Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0))}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Total Value</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="leaderboard" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400 text-xs sm:text-sm px-2 sm:px-3">
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400 text-xs sm:text-sm px-2 sm:px-3">
              Charts
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400 text-xs sm:text-sm px-2 sm:px-3">
              Recent Trades
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400 text-xs sm:text-sm px-2 sm:px-3">
              Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono text-lg flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>TRADE LEADERBOARD</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {traderStats.map((trader, index) => (
                    <div key={trader.rosterId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-700 border border-slate-600 rounded-lg space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="text-lg sm:text-xl font-bold text-yellow-400">#{index + 1}</div>
                        <UserAvatar
                          avatarId={teams.find(t => t.rosterId === trader.rosterId)?.ownerAvatar}
                          displayName={trader.ownerName}
                          username={trader.ownerName}
                          size={40}
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-base sm:text-lg font-semibold text-slate-100 truncate">{trader.teamName}</div>
                          <div className="text-xs sm:text-sm text-gray-400 truncate">{trader.ownerName}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end space-x-4 sm:space-x-6">
                        <div className="text-center">
                          <div className="text-xs sm:text-sm text-gray-400">Trades</div>
                          <div className="text-sm sm:text-lg font-semibold text-slate-100">{trader.totalTrades}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs sm:text-sm text-gray-400">Avg/Trade</div>
                          <div className={`text-sm sm:text-lg font-semibold ${trader.avgValuePerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatValue(trader.avgValuePerTrade)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs sm:text-sm text-gray-400">Total Value</div>
                          <div className={`text-sm sm:text-lg font-semibold ${trader.totalValueGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatValue(trader.totalValueGained)}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${GRADE_COLORS[trader.grade as keyof typeof GRADE_COLORS]}`}>
                          {trader.grade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <TradeCharts traderStats={traderStats} teams={teams} />
          </TabsContent>

          <TabsContent value="trades" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>RECENT TRADES</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {tradeAnalysis.map((trade) => (
                    <div key={trade.transactionId} className="p-6 bg-slate-700 border border-slate-600 rounded-lg">
                      <div className="flex items-center justify-between mb-4 text-sm text-gray-400">
                        <span>{trade.season} Week {trade.week} • {trade.date}</span>
                        <span className="text-blue-400 font-semibold">Total Value: {Math.round(trade.totalTradeValue)}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {trade.teams.map((team) => (
                          <div key={team.rosterId} className={`p-4 rounded-lg border ${
                            team.rosterId === trade.winner 
                              ? 'bg-green-400/10 border-green-400' 
                              : 'bg-slate-600 border-slate-500'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-lg font-semibold text-slate-100">{team.teamName}</div>
                              <div className={`text-lg font-semibold ${
                                team.netValueGain >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatValue(team.netValueGain)}
                              </div>
                            </div>
                            
                            {team.playersReceived.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm text-gray-400 mb-2">Received:</div>
                                <div className="flex flex-wrap gap-2">
                                  {team.playersReceived.map((player, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-green-400/20 text-green-400">
                                      {player.playerName} ({Math.round(player.value)})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {team.picksReceived.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-2">
                                  {team.picksReceived.map((pick, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-blue-400/20 text-blue-400">
                                      {pick.season} R{pick.round} ({Math.round(pick.finalValue)})
                                      {pick.bonus > 0 && <span className="text-xs ml-1">+{Math.round(pick.bonus)}</span>}
                                    </Badge>
                                  ))}
                                </div>
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
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-blue-400 font-mono text-lg">TRADE INSIGHTS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Most Active Trader:</span>
                      <span className="text-slate-100 font-semibold">
                        {traderStats.length > 0 ? traderStats[0].ownerName : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Best Trader:</span>
                      <span className="text-green-400 font-semibold">
                        {traderStats.length > 0 ? traderStats[0].ownerName : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Worst Trader:</span>
                      <span className="text-red-400 font-semibold">
                        {traderStats.length > 0 ? traderStats[traderStats.length - 1].ownerName : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Average Trade Value:</span>
                      <span className="text-slate-100 font-semibold">
                        {tradeAnalysis.length > 0 ? Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0) / tradeAnalysis.length) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-purple-400 font-mono text-lg">VALUATION SYSTEM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-2">Player Values (Dynasty SF Rankings)</h4>
                      <div className="space-y-1">
                        {getValuationSystemDescription().playerValues.tiers.map((tier, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-300">{tier.split(':')[0]}:</span>
                            <span className="text-slate-100">{tier.split(':')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-2">Draft Pick Values</h4>
                      <div className="space-y-1">
                        {getValuationSystemDescription().draftPickValues.values.map((value, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-300">{value.split(':')[0]}:</span>
                            <span className="text-slate-100">{value.split(':')[1]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {getValuationSystemDescription().draftPickValues.timeDiscount}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-2">2027 Class Bonus</h4>
                      <div className="text-xs text-slate-400 mb-2">
                        {getValuationSystemDescription().classBonus.description}
                      </div>
                      <div className="space-y-1">
                        {getValuationSystemDescription().classBonus.bonuses.map((bonus, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-slate-300">{bonus.split(':')[0]}:</span>
                            <span className="text-slate-100">{bonus.split(':')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 