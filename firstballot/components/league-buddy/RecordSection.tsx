'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerCard } from '@/components/player-card'
import { NGSStatsTable } from '@/components/ngs-stats-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface BreakoutBustPlayer {
  player_name: string
  position: string
  season: number
  recent_team: string
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  surprise_factor: number
  performance_ratio: number
  tier_upgrade: boolean
  tier_downgrade: boolean
  age: number
  prospect_tier: string
  draft_round: string
  player_id?: string
}

type StatType = 'passing' | 'rushing' | 'receiving'

export function RecordSection() {
  const [activeTab, setActiveTab] = useState<'breakouts' | 'busts' | 'stats'>('breakouts')
  const [breakoutCandidates, setBreakoutCandidates] = useState<BreakoutBustPlayer[]>([])
  const [bustCandidates, setBustCandidates] = useState<BreakoutBustPlayer[]>([])
  const [statType, setStatType] = useState<StatType>('passing')
  const [season, setSeason] = useState('2025')
  const [statsData, setStatsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'breakouts' || activeTab === 'busts') {
      fetchBreakoutBustData()
    } else {
      fetchStats()
    }
  }, [activeTab, statType, season])

  const fetchBreakoutBustData = async () => {
    try {
      setLoading(true)
      setError(null)

      const breakoutResponse = await fetch('/api/breakout-bust?type=breakout&limit=50')
      if (!breakoutResponse.ok) {
        throw new Error('Failed to fetch breakout data')
      }
      const breakoutResult = await breakoutResponse.json()
      const breakoutData = breakoutResult.data || []

      const bustResponse = await fetch('/api/breakout-bust?type=bust&limit=50')
      if (!bustResponse.ok) {
        throw new Error('Failed to fetch bust data')
      }
      const bustResult = await bustResponse.json()
      const bustData = bustResult.data || []

      setBreakoutCandidates(breakoutData)
      setBustCandidates(bustData)
    } catch (err) {
      console.error('Error fetching breakout/bust data:', err)
      setError('Failed to load breakout and bust data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/ngs-stats?type=${statType}&season=${season}&limit=100&sort=fantasy_points&order=desc`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      const result = await response.json()
      setStatsData(result.data || [])
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      setError(error.message)
    } finally {
      setStatsLoading(false)
    }
  }

  const transformPlayerForCard = (player: BreakoutBustPlayer, isBreakout: boolean = true) => ({
    name: player.player_name,
    tier: player.prospect_tier || 'Unknown',
    ppg: Number(player.fantasy_ppg?.toFixed(1)) || 0,
    predicted: Number(player.predicted_fantasy_ppg?.toFixed(1)) || 0,
    error:
      player.prediction_error > 0
        ? `+${player.prediction_error.toFixed(1)}`
        : player.prediction_error.toFixed(1),
    team: player.recent_team || 'N/A',
    playerId: player.player_id,
    position: player.position,
    statusTag: isBreakout ? 'Strong Start' : 'Average',
  })

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-mono font-bold text-yellow-400 mb-2">RECORD & STATS</h2>
        <p className="text-green-400 text-sm">
          Breakout/bust analysis and comprehensive player statistics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
          <TabsTrigger
            value="breakouts"
            className="text-slate-300 data-[state=active]:bg-green-400 data-[state=active]:text-slate-900"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Breakouts
          </TabsTrigger>
          <TabsTrigger
            value="busts"
            className="text-slate-300 data-[state=active]:bg-red-400 data-[state=active]:text-slate-900"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Busts
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="text-slate-300 data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakouts" className="space-y-6 mt-6">
          {loading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-green-400 font-mono">LOADING BREAKOUT DATA...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
                <button
                  onClick={fetchBreakoutBustData}
                  className="bg-green-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
                >
                  RETRY
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono">BREAKOUT SUMMARY</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {breakoutCandidates.length}
                      </div>
                      <div className="text-sm text-gray-400">Total Breakouts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        +{breakoutCandidates[0]?.surprise_factor.toFixed(1) || '0'}
                      </div>
                      <div className="text-sm text-gray-400">Max Surprise Factor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {breakoutCandidates.filter((p) => p.tier_upgrade).length}
                      </div>
                      <div className="text-sm text-gray-400">Tier Upgrades</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {(
                          breakoutCandidates.reduce((sum, p) => sum + p.fantasy_ppg, 0) /
                            breakoutCandidates.length || 0
                        ).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Avg Actual PPG</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono">BREAKOUT CANDIDATES</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {breakoutCandidates.slice(0, 15).map((player, index) => (
                      <div key={index} className="relative">
                        <PlayerCard player={transformPlayerForCard(player, true)} />
                        <div className="absolute top-2 right-2 bg-green-400 text-slate-900 px-2 py-1 rounded text-xs font-mono font-bold">
                          +{player.surprise_factor.toFixed(1)}
                        </div>
                        <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Season:</span>
                            <span className="text-white">{player.season}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Age:</span>
                            <span className="text-white">{player.age || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Draft:</span>
                            <span className="text-white">{player.draft_round || 'Undrafted'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ratio:</span>
                            <span className="text-green-400">
                              {player.performance_ratio?.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                          {player.tier_upgrade && (
                            <div className="mt-1 text-center">
                              <span className="text-green-400 text-xs">↗ TIER UPGRADE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="busts" className="space-y-6 mt-6">
          {loading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-red-400 font-mono">LOADING BUST DATA...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
                <button
                  onClick={fetchBreakoutBustData}
                  className="bg-red-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
                >
                  RETRY
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 font-mono">BUST SUMMARY</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{bustCandidates.length}</div>
                      <div className="text-sm text-gray-400">Total Busts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {bustCandidates[0]?.surprise_factor.toFixed(1) || '0'}
                      </div>
                      <div className="text-sm text-gray-400">Worst Surprise Factor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {bustCandidates.filter((p) => p.tier_downgrade).length}
                      </div>
                      <div className="text-sm text-gray-400">Tier Downgrades</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {(
                          bustCandidates.reduce((sum, p) => sum + p.fantasy_ppg, 0) /
                            bustCandidates.length || 0
                        ).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Avg Actual PPG</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 font-mono">BUST CANDIDATES</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bustCandidates.slice(0, 15).map((player, index) => (
                      <div key={index} className="relative">
                        <PlayerCard player={transformPlayerForCard(player, false)} />
                        <div className="absolute top-2 right-2 bg-red-400 text-slate-900 px-2 py-1 rounded text-xs font-mono font-bold">
                          {player.surprise_factor.toFixed(1)}
                        </div>
                        <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Season:</span>
                            <span className="text-white">{player.season}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Age:</span>
                            <span className="text-white">{player.age || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">Draft:</span>
                            <span className="text-white">{player.draft_round || 'Undrafted'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ratio:</span>
                            <span className="text-red-400">
                              {player.performance_ratio?.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                          {player.tier_downgrade && (
                            <div className="mt-1 text-center">
                              <span className="text-red-400 text-xs">↘ TIER DOWNGRADE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Season</label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="2025" className="text-white">
                    2025
                  </SelectItem>
                  <SelectItem value="2024" className="text-white">
                    2024
                  </SelectItem>
                  <SelectItem value="2023" className="text-white">
                    2023
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Stat Type</label>
              <Select value={statType} onValueChange={(value) => setStatType(value as StatType)}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="passing" className="text-white">
                    Passing
                  </SelectItem>
                  <SelectItem value="rushing" className="text-white">
                    Rushing
                  </SelectItem>
                  <SelectItem value="receiving" className="text-white">
                    Receiving
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {statsLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-yellow-400 font-mono">LOADING STATS...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
                <button
                  onClick={fetchStats}
                  className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
                >
                  RETRY
                </button>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable data={statsData} statType={statType} season={season} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
