'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamLogo } from '@/components/team-logo'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { PlayerNGSStats } from '@/components/player-ngs-stats'
import { Activity, Star, ShoppingCart, Flame, TrendingDown } from 'lucide-react'
import type { TeamData } from './types'

const POSITION_COLORS = {
  QB: 'bg-blue-500',
  RB: 'bg-green-500',
  WR: 'bg-yellow-500',
  TE: 'bg-purple-500',
  K: 'bg-gray-500',
  DEF: 'bg-red-500',
}

interface RosterSectionProps {
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  teams: TeamData[]
}

export function RosterSection({ selectedTeam, sortedTeams, teams }: RosterSectionProps) {
  return (
    <>
      {/* Position Strengths */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-blue-400 font-mono text-lg mb-4">POSITION STRENGTHS</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">QB:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.QB}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">RB:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.RB}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">WR:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.WR}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">TE:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.TE}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">FLEX:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.FLEX}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-slate-300 font-mono">SFLX:</span>
            <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.SFLX}</span>
          </div>
        </div>
      </div>

      {/* NGS Player Insights */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-yellow-400" />
          <h3 className="text-yellow-400 font-mono text-xl font-bold">NGS PLAYER INSIGHTS</h3>
        </div>

        {/* Insights Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Most Efficient Players */}
          <Card className="bg-slate-800 border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                MOST EFFICIENT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTeam.players
                .filter((p) => p.fantasy_ppg && p.fantasy_ppg > 8)
                .sort((a, b) => (b.fantasy_ppg || 0) - (a.fantasy_ppg || 0))
                .slice(0, 3)
                .map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.playerName}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold text-sm truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • #{player.rank}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-green-400 font-bold font-mono">
                        {player.fantasy_ppg?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500">PPG</div>
                    </div>
                  </div>
                ))}
              {selectedTeam.players.filter((p) => p.fantasy_ppg && p.fantasy_ppg > 8).length ===
                0 && (
                <div className="text-slate-500 text-sm text-center py-4">
                  No high performers yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade Bait */}
          <Card className="bg-slate-800 border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                TRADE BAIT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTeam.players
                .filter((p) => p.rank >= 50 && p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg > 5)
                .sort((a, b) => (b.fantasy_ppg || 0) - (a.fantasy_ppg || 0))
                .slice(0, 3)
                .map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.playerName}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold text-sm truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • #{player.rank}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className="!bg-blue-500/20 !text-blue-400 text-xs">SELL HIGH</Badge>
                    </div>
                  </div>
                ))}
              {selectedTeam.players.filter(
                (p) => p.rank >= 50 && p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg > 5
              ).length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">No trade targets</div>
              )}
            </CardContent>
          </Card>

          {/* Breakout Candidates */}
          <Card className="bg-slate-800 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                <Flame className="h-4 w-4" />
                BREAKOUT WATCH
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTeam.players
                .filter((p) => p.age && p.age <= 24 && p.rank <= 150)
                .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                .slice(0, 3)
                .map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.playerName}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold text-sm truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • {player.age}yo
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className="!bg-purple-500/20 !text-purple-400 text-xs">HOLD</Badge>
                    </div>
                  </div>
                ))}
              {selectedTeam.players.filter((p) => p.age && p.age <= 24 && p.rank <= 150).length ===
                0 && <div className="text-slate-500 text-sm text-center py-4">No young talent</div>}
            </CardContent>
          </Card>

          {/* Underperformers */}
          <Card className="bg-slate-800 border-red-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                UNDERPERFORMING
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTeam.players
                .filter((p) => p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg < 8)
                .sort((a, b) => (a.fantasy_ppg || 0) - (b.fantasy_ppg || 0))
                .slice(0, 3)
                .map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.playerName}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold text-sm truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • #{player.rank}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-red-400 font-bold font-mono">
                        {player.fantasy_ppg?.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500">PPG</div>
                    </div>
                  </div>
                ))}
              {selectedTeam.players.filter(
                (p) => p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg < 8
              ).length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">All performing well!</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Team Roster */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-green-400 font-mono text-lg mb-4">FULL ROSTER</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedTeam.players.map((player, index) => (
            <Card
              key={index}
              className="p-3 bg-slate-700 border-slate-600 hover:border-green-400/50 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-3">
                <PlayerHeadshot
                  headshotUrl={player.headshot_url}
                  espnId={player.espn_id}
                  playerName={player.playerName}
                  size={40}
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-slate-100 truncate">{player.playerName}</h4>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-1 py-0 ${POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]} text-white`}
                    >
                      {player.position}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{player.team}</span>
                    <span>#{player.rank}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-xs bg-slate-600/20 text-slate-300 border-slate-600"
                    >
                      {player.tier}
                    </Badge>
                    {player.age && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-400/20 text-blue-400 border-blue-400"
                      >
                        {player.age}yo
                      </Badge>
                    )}
                    {(player.injury_status || player.injury_start_date) && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          !player.injury_status && player.injury_start_date
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : player.injury_status?.toLowerCase() === 'out' ||
                                player.injury_status?.toLowerCase() === 'ir'
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : player.injury_status?.toLowerCase() === 'doubtful'
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                                : player.injury_status?.toLowerCase() === 'questionable'
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                  : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                        }`}
                      >
                        {player.injury_status || 'Injured'}
                      </Badge>
                    )}
                    {player.isOnBye && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50"
                      >
                        BYE
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* NGS Advanced Metrics */}
              <div className="pt-3 border-t border-slate-600">
                <PlayerNGSStats
                  playerName={player.playerName}
                  position={player.position}
                  compact={true}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Team Insights */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-green-400 font-mono text-lg mb-4">TEAM INSIGHTS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-sm">BEST PLAYER</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <PlayerHeadshot
                  headshotUrl={selectedTeam.trends.bestPlayer.headshot_url}
                  espnId={selectedTeam.trends.bestPlayer.espn_id}
                  playerName={selectedTeam.trends.bestPlayer.playerName}
                  size={48}
                />
                <div>
                  <h4 className="font-semibold text-slate-100">
                    {selectedTeam.trends.bestPlayer.playerName}
                  </h4>
                  <p className="text-sm text-gray-400">
                    #{selectedTeam.trends.bestPlayer.rank} •{' '}
                    {selectedTeam.trends.bestPlayer.position}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 text-sm">BREAKOUT CANDIDATE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <PlayerHeadshot
                  headshotUrl={selectedTeam.trends.breakoutCandidate.headshot_url}
                  espnId={selectedTeam.trends.breakoutCandidate.espn_id}
                  playerName={selectedTeam.trends.breakoutCandidate.playerName}
                  size={48}
                />
                <div>
                  <h4 className="font-semibold text-slate-100">
                    {selectedTeam.trends.breakoutCandidate.playerName}
                  </h4>
                  <p className="text-sm text-gray-400">
                    #{selectedTeam.trends.breakoutCandidate.rank} •{' '}
                    {selectedTeam.trends.breakoutCandidate.position}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 text-sm">SLEEPER PICK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <PlayerHeadshot
                  headshotUrl={selectedTeam.trends.sleeperPick.headshot_url}
                  espnId={selectedTeam.trends.sleeperPick.espn_id}
                  playerName={selectedTeam.trends.sleeperPick.playerName}
                  size={48}
                />
                <div>
                  <h4 className="font-semibold text-slate-100">
                    {selectedTeam.trends.sleeperPick.playerName}
                  </h4>
                  <p className="text-sm text-gray-400">
                    #{selectedTeam.trends.sleeperPick.rank} •{' '}
                    {selectedTeam.trends.sleeperPick.position}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Analysis */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-purple-400 font-mono text-lg mb-4">TEAM ANALYSIS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-green-400 text-sm">TEAM STRENGTHS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tier 1 Players:</span>
                  <span className="text-green-400 font-semibold">
                    {selectedTeam.players.filter((p) => p.tier === 'Tier 1').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tier 2 Players:</span>
                  <span className="text-blue-400 font-semibold">
                    {selectedTeam.players.filter((p) => p.tier === 'Tier 2').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Young Players (≤25):</span>
                  <span className="text-purple-400 font-semibold">
                    {selectedTeam.players.filter((p) => p.age && p.age <= 25).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Top 50 Players:</span>
                  <span className="text-green-400 font-semibold">
                    {selectedTeam.players.filter((p) => p.rank <= 50).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-orange-400 text-sm">SEASON PROJECTIONS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Projected Record:</span>
                  <span className="text-green-400 font-bold">
                    {(() => {
                      const totalGames = selectedTeam.wins + selectedTeam.losses
                      const currentWinRate = totalGames > 0 ? selectedTeam.wins / totalGames : 0.5
                      const adjustedWinRate = Math.min(
                        0.85,
                        Math.max(0.15, currentWinRate + (selectedTeam.gradeScore - 50) / 200)
                      )
                      const projectedWins = Math.round(adjustedWinRate * 14)
                      const projectedLosses = 14 - projectedWins
                      return `${projectedWins}-${projectedLosses}`
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Projected Finish:</span>
                  <span className="text-blue-400 font-bold">
                    {(() => {
                      const teamRank =
                        sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
                      const gradeAdjustment =
                        selectedTeam.gradeScore > 70 ? -1 : selectedTeam.gradeScore < 30 ? 1 : 0
                      const projectedRank = Math.max(
                        1,
                        Math.min(teams.length, teamRank + gradeAdjustment)
                      )
                      return `${projectedRank}${projectedRank === 1 ? 'st' : projectedRank === 2 ? 'nd' : projectedRank === 3 ? 'rd' : 'th'}`
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Playoff Chance:</span>
                  <span className="text-purple-400 font-bold">
                    {(() => {
                      const teamRank =
                        sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
                      const totalTeams = teams.length
                      const playoffSpots = Math.max(4, Math.ceil(totalTeams / 2))

                      let baseChance = 0
                      if (teamRank <= playoffSpots / 2) baseChance = 85
                      else if (teamRank <= playoffSpots) baseChance = 65
                      else if (teamRank <= playoffSpots + 2) baseChance = 35
                      else baseChance = 15

                      const gradeBonus = (selectedTeam.gradeScore - 50) * 0.5
                      const finalChance = Math.max(5, Math.min(95, baseChance + gradeBonus))
                      return `${Math.round(finalChance)}%`
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
