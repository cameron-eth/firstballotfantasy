"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
import { leagueCache } from '@/lib/league-cache'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function TradeMarketContent() {
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

  // Try to get league ID from multiple sources using unified cache
  useEffect(() => {
    // First try URL params
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
      setLeagueId(urlLeagueId)
      return
    }
    
    // Then try unified league cache
    const cachedLeagueId = leagueCache.getLeagueId()
    if (cachedLeagueId) {
      
      setLeagueId(cachedLeagueId)
      return
    }
    
    
    setNoLeagueId(true)
    setLoading(false)
  }, [searchParams])

  // Fetch all necessary data using the new API endpoint
  useEffect(() => {
    const fetchData = async () => {
      if (!leagueId) {
  
        return
      }
      
      
      setNoLeagueId(false) // Reset the no league ID state when we have a league ID

      try {
        setLoading(true)
        setError(null)
        
        // Use the new trade market API endpoint
        const apiUrl = `/api/trade-market?leagueId=${leagueId}`

        const response = await fetch(apiUrl)
        

        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Trade Market Page: API error response:', errorText)
          throw new Error(`Failed to fetch trade market data: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch trade market data')
        }

        const { data } = result
        

        
        setTeams(data.teams || [])
        setAllPlayers(data.allPlayers || {})
        setTransactions(data.transactions || [])
        setTradedPicks(data.tradedPicks || [])
        setDynastyRankings(data.dynastyRankings || {})



      } catch (err) {

        setError(err instanceof Error ? err.message : 'Failed to load trade market data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [leagueId])

  // Process trades and calculate values
  const tradeAnalysis = useMemo(() => {

    
    if (loading || !dynastyRankings || Object.keys(dynastyRankings).length === 0) {

      return []
    }

    const analyzedTrades: TradeAnalysis[] = []



    transactions.forEach((trade, index) => {

      
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

      const totalTradeValue = tradeTeams.reduce(
        (sum: number, team: typeof tradeTeams[number]) => sum + team.totalValueReceived,
        0
      )
      const winner = tradeTeams.reduce(
        (max: typeof tradeTeams[number], team: typeof tradeTeams[number]) =>
          team.netValueGain > max.netValueGain ? team : max
      ).rosterId

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
            <h1 className="text-3xl font-bold text-yellow-400/90 font-mono mb-6">TRADE MARKET</h1>
            <p className="text-slate-400 mb-6">No league ID found. Please enter your Sleeper league ID:</p>
            <div className="flex items-center justify-center space-x-2 mb-6">
              <input
                type="text"
                placeholder="Enter league ID"
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
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
                    leagueCache.setLeagueId(input.value.trim())
                    setNoLeagueId(false)
                    setLoading(true)
                  }
                }}
                className="bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/25"
              >
                Load League
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test')
                    const result = await response.json()

                    alert(`Test API: ${result.success ? 'Success' : 'Failed'}\nSupabase: ${result.supabase?.hasError ? 'Error' : 'OK'}`)
                  } catch (err) {

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
        {/* Enhanced Header */}
        <div className="relative mb-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] rounded-xl"></div>
          
          <div className="relative p-6 sm:p-8">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to League</span>
                <span className="sm:hidden">Back</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30">
                  Dynasty SF
                </Badge>
                <Badge variant="outline" className="bg-blue-400/10 text-blue-400 border-blue-400/30">
                  Live Data
                </Badge>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                  <BarChart3 className="h-8 w-8 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400 font-mono tracking-tight">
                    TRADE MARKET
                  </h1>
                  <p className="text-slate-400 font-medium">Dynasty Trade Analysis & Valuations</p>
                </div>
              </div>
              
              {/* Quick Stats Bar */}
              <div className="flex justify-center items-center space-x-2 sm:space-x-4 md:space-x-6 text-sm overflow-x-auto">
                <div className="text-center flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{tradeAnalysis.length}</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Trades</div>
                </div>
                <div className="w-px h-6 sm:h-8 bg-slate-600 flex-shrink-0"></div>
                <div className="text-center flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-blue-400">{traderStats.length}</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Active Traders</div>
                </div>
                <div className="w-px h-6 sm:h-8 bg-slate-600 flex-shrink-0"></div>
                <div className="text-center flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-purple-400">
                    {Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0))}
                  </div>
                  <div className="text-slate-400 text-xs sm:text-sm">Total Value</div>
                </div>
                <div className="w-px h-6 sm:h-8 bg-slate-600 flex-shrink-0 hidden sm:block"></div>
                <div className="text-center flex-shrink-0 hidden sm:block">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400">
                    {traderStats.length > 0 ? Math.round(traderStats.slice(0, 3).reduce((sum, trader) => sum + trader.marketShareByValue, 0)) : 0}%
                  </div>
                  <div className="text-slate-400 text-xs sm:text-sm">Top 3 Share</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Stats */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-400/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-400">{tradeAnalysis.length}</div>
                  <div className="text-sm text-slate-400">Total Trades</div>
                  <div className="text-xs text-green-400/70">
                    {tradeAnalysis.length > 0 ? '+' + Math.round(tradeAnalysis.length / 12 * 100) + '% avg' : 'No data'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-400/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-blue-400">
                    {tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.playersReceived.length + team.playersSent.length, 0), 0)}
                  </div>
                  <div className="text-sm text-slate-400">Players Moved</div>
                  <div className="text-xs text-blue-400/70">
                    {tradeAnalysis.length > 0 ? Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.playersReceived.length + team.playersSent.length, 0), 0) / tradeAnalysis.length) + ' per trade' : 'No data'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-400/10 rounded-lg">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-purple-400">
                    {tradedPicks.length + tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.picksReceived.length + team.picksSent.length, 0), 0)}
                  </div>
                  <div className="text-sm text-slate-400">Draft Picks</div>
                  <div className="text-xs text-purple-400/70">
                    {(tradedPicks.length + tradeAnalysis.reduce((sum, trade) => sum + trade.teams.reduce((s, team) => s + team.picksReceived.length + team.picksSent.length, 0), 0)) > 0 ? 'Future assets' : 'No picks traded'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-yellow-400">
                    {Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0))}
                  </div>
                  <div className="text-sm text-slate-400">Total Value</div>
                  <div className="text-xs text-yellow-400/70">
                    {tradeAnalysis.length > 0 ? Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0) / tradeAnalysis.length) + ' avg/trade' : 'No data'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-400/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-orange-400">
                    {traderStats.length > 0 ? Math.round(traderStats.slice(0, 3).reduce((sum, trader) => sum + trader.marketShareByValue, 0)) : 0}%
                  </div>
                  <div className="text-sm text-slate-400">Market Concentration</div>
                  <div className="text-xs text-orange-400/70">
                    Top 3 traders control
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Navigation Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger 
              value="leaderboard" 
              className="text-slate-300 data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-400/30 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg border border-transparent transition-all duration-200 hover:text-yellow-400/70"
            >
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Board</span>
            </TabsTrigger>
            <TabsTrigger 
              value="charts" 
              className="text-slate-300 data-[state=active]:bg-blue-400/10 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400/30 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg border border-transparent transition-all duration-200 hover:text-blue-400/70"
            >
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Charts</span>
              <span className="sm:hidden">Charts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trades" 
              className="text-slate-300 data-[state=active]:bg-green-400/10 data-[state=active]:text-green-400 data-[state=active]:border-green-400/30 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg border border-transparent transition-all duration-200 hover:text-green-400/70"
            >
              <Calendar className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Trades</span>
              <span className="sm:hidden">Trades</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              className="text-slate-300 data-[state=active]:bg-purple-400/10 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400/30 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg border border-transparent transition-all duration-200 hover:text-purple-400/70"
            >
              <Target className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Analysis</span>
              <span className="sm:hidden">Analyze</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-yellow-400 font-mono text-xl flex items-center space-x-3">
                    <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <span>TRADE LEADERBOARD</span>
                  </CardTitle>
                  <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                    {traderStats.length} Active Traders
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {traderStats.map((trader, index) => {
                    const team = teams.find(t => t.rosterId === trader.rosterId)
                    const isTopTrader = index < 3
                    const winRate = team ? (team.wins / Math.max(team.wins + team.losses, 1)) * 100 : 0
                    const cardClasses = isTopTrader 
                      ? 'bg-gradient-to-r from-yellow-400/5 to-green-400/5 border-yellow-400/30 hover:border-yellow-400/50' 
                      : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 hover:border-slate-600'
                    
                    return (
                      <div 
                        key={trader.rosterId} 
                        className={`relative p-3 sm:p-4 rounded-lg border transition-all duration-200 hover:scale-[1.01] ${cardClasses}`}
                      >
                        {/* Rank Badge */}
                        <div className="absolute -top-2 -left-2">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                            index === 0 ? 'bg-yellow-400 text-black' :
                            index === 1 ? 'bg-slate-400 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-slate-600 text-slate-300'
                          }`}>
                            {index + 1}
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          <div className="space-y-3">
                            {/* User Info Row */}
                            <div className="flex items-center space-x-3">
                              <UserAvatar
                                avatarId={team?.ownerAvatar}
                                displayName={trader.ownerName}
                                username={trader.ownerName}
                                size={40}
                                className="flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-base font-semibold text-slate-100 truncate">{trader.teamName}</div>
                                    <div className="text-sm text-slate-400 truncate">{trader.ownerName}</div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {isTopTrader && (
                                      <Badge variant="outline" className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs">
                                        Top
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className={`text-sm px-2 py-1 ${GRADE_COLORS[trader.grade as keyof typeof GRADE_COLORS]}`}>
                                      {trader.grade}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-600/30">
                              <div className="text-center">
                                <div className="text-xs text-slate-400 mb-1">Trades</div>
                                <div className="text-lg font-bold text-slate-100">{trader.totalTrades}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-400 mb-1">Avg/Trade</div>
                                <div className={`text-lg font-bold ${trader.avgValuePerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatValue(trader.avgValuePerTrade)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-400 mb-1">Total</div>
                                <div className={`text-lg font-bold ${trader.totalValueGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatValue(trader.totalValueGained)}
                                </div>
                              </div>
                            </div>

                            {/* Market Share & Team Info */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-600/30">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs bg-purple-400/10 text-purple-400 border-purple-400/30">
                                  {trader.marketShareByValue.toFixed(1)}% Share
                                </Badge>
                                {team && (
                                  <Badge variant="outline" className="text-xs bg-slate-600/50 text-slate-300 border-slate-500">
                                    {team.wins}-{team.losses}
                                  </Badge>
                                )}
                              </div>
                              {team && (
                                <span className="text-xs text-slate-400">
                                  {Math.round(winRate)}% Win Rate
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex sm:items-center justify-between">
                          {/* Left side - User info */}
                          <div className="flex items-center space-x-4 flex-1">
                            <UserAvatar
                              avatarId={team?.ownerAvatar}
                              displayName={trader.ownerName}
                              username={trader.ownerName}
                              size={48}
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="text-lg font-semibold text-slate-100 truncate">{trader.teamName}</div>
                                {isTopTrader && (
                                  <Badge variant="outline" className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs">
                                    Top Trader
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-slate-400 truncate">{trader.ownerName}</div>
                              {team && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs bg-slate-600/50 text-slate-300 border-slate-500">
                                    {team.wins}-{team.losses}
                                  </Badge>
                                  <span className="text-xs text-slate-400">
                                    {Math.round(winRate)}% Win Rate
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Right side - Stats */}
                          <div className="flex items-center space-x-6">
                            <div className="text-center">
                              <div className="text-xs text-slate-400">Trades</div>
                              <div className="text-lg font-bold text-slate-100">{trader.totalTrades}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">Avg/Trade</div>
                              <div className={`text-lg font-bold ${trader.avgValuePerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatValue(trader.avgValuePerTrade)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">Total Value</div>
                              <div className={`text-lg font-bold ${trader.totalValueGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatValue(trader.totalValueGained)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">Market Share</div>
                              <div className="text-lg font-bold text-purple-400">
                                {trader.marketShareByValue.toFixed(1)}%
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${GRADE_COLORS[trader.grade as keyof typeof GRADE_COLORS]}`}>
                              {trader.grade}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <TradeCharts traderStats={traderStats} teams={teams} tradeAnalysis={tradeAnalysis} />
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
            {/* Grading System Overview */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono text-xl flex items-center space-x-3">
                  <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                    <Target className="h-6 w-6" />
                  </div>
                  <span>TRADER GRADING SYSTEM</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Grade Scale Visualization */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Grade Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {[
                        { grade: 'A+', min: 50, color: 'yellow', desc: 'Elite Trader' },
                        { grade: 'A/A-', min: 20, color: 'yellow', desc: 'Excellent' },
                        { grade: 'B+/B/B-', min: 0, color: 'green', desc: 'Good Trader' },
                        { grade: 'C+/C/C-', min: -30, color: 'blue', desc: 'Average' },
                        { grade: 'D', min: -50, color: 'orange', desc: 'Poor' },
                        { grade: 'F', min: -999, color: 'red', desc: 'Very Poor' }
                      ].map((item, index) => (
                        <div key={index} className={`p-3 rounded-lg border-2 ${
                          item.color === 'yellow' ? 'bg-yellow-400/10 border-yellow-400/30' :
                          item.color === 'green' ? 'bg-green-400/10 border-green-400/30' :
                          item.color === 'blue' ? 'bg-blue-400/10 border-blue-400/30' :
                          item.color === 'orange' ? 'bg-orange-400/10 border-orange-400/30' :
                          'bg-red-400/10 border-red-400/30'
                        }`}>
                          <div className={`text-lg font-bold text-center ${
                            item.color === 'yellow' ? 'text-yellow-400' :
                            item.color === 'green' ? 'text-green-400' :
                            item.color === 'blue' ? 'text-blue-400' :
                            item.color === 'orange' ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {item.grade}
                          </div>
                          <div className="text-xs text-slate-300 text-center mt-1">{item.desc}</div>
                          <div className="text-xs text-slate-400 text-center">
                            {item.min > -999 ? `${item.min}+` : '<-50'} value
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">League Grade Distribution</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
                      {['A+', 'A', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].map(grade => {
                        const count = traderStats.filter(trader => trader.grade === grade).length
                        const percentage = traderStats.length > 0 ? (count / traderStats.length) * 100 : 0
                        return (
                          <div key={grade} className="text-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <Badge variant="outline" className={`mb-2 ${GRADE_COLORS[grade as keyof typeof GRADE_COLORS]}`}>
                              {grade}
                            </Badge>
                            <div className="text-2xl font-bold text-slate-100">{count}</div>
                            <div className="text-xs text-slate-400">{percentage.toFixed(1)}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Enhanced Trade Insights */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-blue-400 font-mono text-lg flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>MARKET INSIGHTS</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Top Performers */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Top Performers</h4>
                      
                      {(() => {
                        // Find the best trader based on a combination of avg value per trade and total value
                        // Only consider traders with at least 2 trades to avoid outliers
                        const eligibleTraders = traderStats.filter(trader => trader.totalTrades >= 2)
                        
                        if (eligibleTraders.length === 0) {
                          return (
                            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
                              <div className="text-slate-400">No eligible traders (minimum 2 trades required)</div>
                            </div>
                          )
                        }

                        // Calculate composite score: 70% avg per trade + 30% total value (normalized)
                        const maxTotalValue = Math.max(...eligibleTraders.map(t => t.totalValueGained))
                        const maxAvgValue = Math.max(...eligibleTraders.map(t => t.avgValuePerTrade))
                        
                        const scoredTraders = eligibleTraders.map(trader => ({
                          ...trader,
                          compositeScore: (
                            (trader.avgValuePerTrade / Math.max(maxAvgValue, 1)) * 0.7 +
                            (trader.totalValueGained / Math.max(maxTotalValue, 1)) * 0.3
                          ) * 100
                        })).sort((a, b) => b.compositeScore - a.compositeScore)

                        const bestTrader = scoredTraders[0]
                        const bestAvgTrader = eligibleTraders.reduce((best, current) => 
                          current.avgValuePerTrade > best.avgValuePerTrade ? current : best
                        )
                        const mostValueTrader = eligibleTraders.reduce((best, current) => 
                          current.totalValueGained > best.totalValueGained ? current : best
                        )

                        return (
                          <>
                            {/* Best Overall Trader */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-400/5 to-green-400/5 rounded-lg border border-yellow-400/20">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm">👑</div>
                                <div>
                                  <div className="text-slate-100 font-semibold">
                                    {bestTrader.ownerName}
                                  </div>
                                  <div className="text-xs text-slate-400">Best Overall Trader</div>
                                  <div className="text-xs text-yellow-400">
                                    {formatValue(bestTrader.avgValuePerTrade)} avg • {formatValue(bestTrader.totalValueGained)} total
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-yellow-400 font-bold text-sm">
                                  {bestTrader.compositeScore.toFixed(1)} score
                                </div>
                                <Badge variant="outline" className={`text-xs ${GRADE_COLORS[bestTrader.grade as keyof typeof GRADE_COLORS]}`}>
                                  {bestTrader.grade}
                                </Badge>
                              </div>
                            </div>

                            {/* Best Average and Most Value in smaller cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center justify-between p-3 bg-blue-400/5 rounded-lg border border-blue-400/20">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-slate-100 font-medium text-sm">
                                      {bestAvgTrader.ownerName}
                                    </div>
                                    <div className="text-xs text-slate-400">Best Avg/Trade</div>
                                  </div>
                                </div>
                                <div className="text-blue-400 font-bold text-sm">
                                  {formatValue(bestAvgTrader.avgValuePerTrade)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-green-400/5 rounded-lg border border-green-400/20">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                                    <Trophy className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-slate-100 font-medium text-sm">
                                      {mostValueTrader.ownerName}
                                    </div>
                                    <div className="text-xs text-slate-400">Most Total Value</div>
                                  </div>
                                </div>
                                <div className="text-green-400 font-bold text-sm">
                                  {formatValue(mostValueTrader.totalValueGained)}
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      })()}

                      {(() => {
                        // Find the worst trader based on composite score (same logic but reversed)
                        const eligibleTraders = traderStats.filter(trader => trader.totalTrades >= 2)
                        
                        if (eligibleTraders.length === 0) {
                          return null
                        }

                        // Use the same composite scoring but find the lowest score
                        const maxTotalValue = Math.max(...eligibleTraders.map(t => t.totalValueGained))
                        const maxAvgValue = Math.max(...eligibleTraders.map(t => t.avgValuePerTrade))
                        
                        const scoredTraders = eligibleTraders.map(trader => ({
                          ...trader,
                          compositeScore: (
                            (trader.avgValuePerTrade / Math.max(maxAvgValue, 1)) * 0.7 +
                            (trader.totalValueGained / Math.max(maxTotalValue, 1)) * 0.3
                          ) * 100
                        })).sort((a, b) => a.compositeScore - b.compositeScore) // Sort ascending for worst

                        const worstTrader = scoredTraders[0]

                        return (
                          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-red-400 rounded-full flex items-center justify-center text-white font-bold text-sm">⚠️</div>
                              <div>
                                <div className="text-slate-100 font-semibold">
                                  {worstTrader.ownerName}
                                </div>
                                <div className="text-xs text-slate-400">Needs Improvement</div>
                                <div className="text-xs text-red-400">
                                  {formatValue(worstTrader.avgValuePerTrade)} avg • {formatValue(worstTrader.totalValueGained)} total
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold text-sm">
                                {worstTrader.compositeScore.toFixed(1)} score
                              </div>
                              <Badge variant="outline" className={`text-xs ${GRADE_COLORS[worstTrader.grade as keyof typeof GRADE_COLORS]}`}>
                                {worstTrader.grade}
                              </Badge>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Market Stats */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Market Statistics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
                          <div className="text-xl font-bold text-blue-400">
                            {tradeAnalysis.length > 0 ? Math.round(tradeAnalysis.reduce((sum, trade) => sum + trade.totalTradeValue, 0) / tradeAnalysis.length) : 0}
                          </div>
                          <div className="text-xs text-slate-400">Avg Trade Value</div>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
                          <div className="text-xl font-bold text-purple-400">
                            {traderStats.length > 0 ? traderStats.filter(t => t.totalValueGained > 0).length : 0}
                          </div>
                          <div className="text-xs text-slate-400">Winning Traders</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Valuation System */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-purple-400 font-mono text-lg flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>VALUATION SYSTEM</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Player Values */}
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-3 flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Player Values (Dynasty SF Rankings)</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getValuationSystemDescription().playerValues.tiers.map((tier, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <span className="text-slate-300 font-medium">{tier.split(':')[0]}</span>
                            <Badge variant="outline" className="bg-purple-400/10 text-purple-400 border-purple-400/30">
                              {tier.split(':')[1]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Draft Pick Values */}
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-3 flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Draft Pick Values</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getValuationSystemDescription().draftPickValues.values.map((value, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <span className="text-slate-300 font-medium">{value.split(':')[0]}</span>
                            <Badge variant="outline" className="bg-blue-400/10 text-blue-400 border-blue-400/30">
                              {value.split(':')[1]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-blue-400/5 rounded-lg border border-blue-400/20">
                        <div className="text-xs text-blue-400 flex items-center space-x-2">
                          <Target className="h-3 w-3" />
                          <span>{getValuationSystemDescription().draftPickValues.timeDiscount}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 2027 Class Bonus */}
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-3 flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>2027 Class Bonus</span>
                      </h4>
                      <div className="p-3 bg-green-400/5 rounded-lg border border-green-400/20 mb-3">
                        <div className="text-sm text-green-400">
                          {getValuationSystemDescription().classBonus.description}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getValuationSystemDescription().classBonus.bonuses.map((bonus, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                            <span className="text-slate-300 font-medium">{bonus.split(':')[0]}</span>
                            <Badge variant="outline" className="bg-green-400/10 text-green-400 border-green-400/30">
                              {bonus.split(':')[1]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* How Grades Are Calculated */}
                    <div>
                      <h4 className="text-slate-200 font-semibold mb-3 flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>How Trader Grades Work</span>
                      </h4>
                      <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span><strong className="text-yellow-400">Total Value Gained:</strong> Sum of all net value from your trades</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span><strong className="text-blue-400">Grade Scale:</strong> A+ (50+), A (30+), B (0+), C (-30+), D (-50+), F (below -50)</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span><strong className="text-green-400">Positive Values:</strong> You gained more value than you gave up</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span><strong className="text-red-400">Negative Values:</strong> You gave up more value than you received</span>
                          </div>
                        </div>
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

// Main component wrapped in Suspense
export default function TradeMarketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 text-lg">Loading trade market...</div>
        </div>
      </div>
    }>
      <TradeMarketContent />
    </Suspense>
  )
}