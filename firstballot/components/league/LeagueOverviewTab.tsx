'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Trophy, Zap, Eye, Users, Clipboard } from 'lucide-react'
import { MatchupData, Transaction, TeamData } from '@/types/league'
import { CurrentLineup } from './CurrentLineup'

interface LeagueOverviewTabProps {
  currentMatchups: MatchupData[]
  currentWeek: number
  transactions: Transaction[]
  teams: TeamData[]
  allPlayers: Record<string, any>
  userRosterId?: number
  playerProjections?: Record<string, number>
}

export const LeagueOverviewTab = memo(function LeagueOverviewTab({
  currentMatchups,
  currentWeek,
  transactions,
  teams,
  allPlayers,
  userRosterId,
  playerProjections
}: LeagueOverviewTabProps) {
  // Find the user's current matchup
  const userMatchup = userRosterId ? currentMatchups.find(m => m.rosterId === userRosterId) : null
  return (
    <div className="relative">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded-lg blur-lg opacity-10"></div>
      
      <Card className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
        <CardHeader className="relative">
          <CardTitle className="relative text-white font-mono flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-400/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
              <Trophy className="h-6 w-6 text-yellow-400" />
            </div>
            <span className="text-xl font-bold">LEAGUE OVERVIEW</span>
          </div>
          {/* Action Buttons - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            <button 
              className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/40 backdrop-blur-sm hover:bg-yellow-400/20 text-yellow-400 font-mono text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 shadow-lg"
              onClick={() => window.location.href = '/trade-market'}
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline font-semibold">Trade Market</span>
              <span className="sm:hidden font-semibold">Trade</span>
            </button>
            <button 
              className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/40 backdrop-blur-sm hover:bg-yellow-400/20 text-yellow-400 font-mono text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 shadow-lg"
              onClick={() => window.location.href = '/scouting-portal'}
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline font-semibold">Scouting Portal</span>
              <span className="sm:hidden font-semibold">Scout</span>
            </button>
            <button 
              className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/40 backdrop-blur-sm hover:bg-yellow-400/20 text-yellow-400 font-mono text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 shadow-lg"
              onClick={() => window.location.href = '/draft-buddy'}
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline font-semibold">Draft Buddy</span>
              <span className="sm:hidden font-semibold">Draft</span>
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Team Standings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-3">
            <div className="p-2 bg-yellow-400/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <span>Team Standings</span>
          </h3>
          <div className="space-y-3">
            {teams
              .sort((a, b) => {
                if (a.wins !== b.wins) return b.wins - a.wins
                return b.pointsFor - a.pointsFor
              })
              .map((team, index) => (
                <div
                  key={team.rosterId}
                  className="group relative"
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/20 to-green-400/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                  
                  <div className="relative bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="text-2xl font-bold text-yellow-400 w-8 font-mono">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{team.teamName}</h4>
                          <p className="text-sm text-gray-400">{team.ownerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-white font-mono">
                            {team.wins}-{team.losses}
                          </div>
                          <div className="text-xs text-gray-400">
                            {team.pointsFor.toFixed(1)} PF
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono font-bold"
                        >
                          {team.grade}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Current Week Matchups */}
        {currentMatchups.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-3">
                <div className="p-2 bg-green-400/20 backdrop-blur-sm rounded-lg border border-green-400/30">
                  <Calendar className="h-5 w-5 text-green-400" />
                </div>
                <span>Week {currentWeek} Matchups</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {currentMatchups.slice(0, 4).map((matchup, index) => (
                  <div key={index} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400/20 to-yellow-400/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <Card className="relative bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 hover:border-green-400/50 transition-all duration-200">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-semibold text-white truncate mb-2 text-sm sm:text-base">{matchup.teamName}</div>
                            <div className="text-xs sm:text-sm text-gray-400 font-mono">
                              {matchup.actualPoints > 0 ? `${matchup.actualPoints.toFixed(1)} pts` : 'No score yet'}
                            </div>
                          </div>
                          <div className="mx-4 sm:mx-6 text-green-400 text-center flex-shrink-0 font-mono font-bold text-sm sm:text-base">VS</div>
                          <div className="flex-1 text-right min-w-0">
                            <div className="font-semibold text-white truncate text-right mb-2 text-sm sm:text-base">{matchup.opponentTeamName}</div>
                            <div className="text-xs sm:text-sm text-gray-400 text-right font-mono">
                              {matchup.opponentActualPoints > 0 ? `${matchup.opponentActualPoints.toFixed(1)} pts` : 'No score yet'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-400" />
                <span>Week {currentWeek} Matchups</span>
              </h3>
              <Card className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/50">
                <CardContent className="p-6 text-center">
                  <div className="text-gray-400">
                    {currentWeek === 1 ? (
                      <p>Season hasn't started yet. Matchups will appear here once games begin.</p>
                    ) : (
                      <p>No matchups found for Week {currentWeek}. This could be a bye week or the season hasn't started.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Current Week Lineup */}
          {userMatchup && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-3">
                <div className="p-2 bg-blue-400/20 backdrop-blur-sm rounded-lg border border-blue-400/30">
                  <Clipboard className="h-5 w-5 text-blue-400" />
                </div>
                <span>Your Week {currentWeek} Lineup</span>
              </h3>
              <CurrentLineup 
                matchup={userMatchup} 
                allPlayers={allPlayers}
                playerProjections={playerProjections}
              />
            </div>
          )}

          {/* Recent Transactions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-3">
              <div className="p-2 bg-yellow-400/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
                <Zap className="h-5 w-5 text-yellow-400" />
              </div>
              <span>Week {currentWeek} Transactions</span>
            </h3>
            
            <div className="flex flex-row gap-4 sm:gap-6 overflow-x-auto pb-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 min-w-[280px] sm:min-w-[320px]">
                  <Zap className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No transactions this week</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const teamNames = (tx.rosterIds || []).map(rosterId => {
                    const team = teams.find(t => t.rosterId === rosterId)
                    return team?.teamName || `Team ${rosterId}`
                  }).join(' & ')

                  const addedPlayers = tx.adds ? Object.keys(tx.adds).map(playerId => {
                    const player = allPlayers[playerId]
                    return player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`
                  }) : []
                  
                  const droppedPlayers = tx.drops ? Object.keys(tx.drops).map(playerId => {
                    const player = allPlayers[playerId]
                    return player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`
                  }) : []

                  return (
                    <div key={tx.transactionId} className="group relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/10 to-green-400/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                      <div 
                        className="relative bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 p-4 sm:p-5 rounded-lg min-w-[280px] sm:min-w-[320px] max-w-sm flex-shrink-0"
                      >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono font-bold">
                          {tx.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">Week {tx.week}</span>
                      </div>
                      
                      <div className="text-sm text-white mb-2">
                        <span className="font-semibold">{teamNames}</span>
                      </div>

                      {tx.type === 'trade' && (
                        <div className="text-gray-300 space-y-1">
                          {addedPlayers.length > 0 && (
                            <div className="text-xs">
                              <span className="text-green-400 font-semibold">Added:</span> <span>{addedPlayers.join(', ')}</span>
                            </div>
                          )}
                          {droppedPlayers.length > 0 && (
                            <div className="text-xs">
                              <span className="text-red-400 font-semibold">Dropped:</span> <span>{droppedPlayers.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {tx.type === 'free_agent' && (
                        <div className="space-y-1">
                          {addedPlayers.length > 0 && (
                            <div className="text-xs">
                              <span className="text-green-400 font-semibold">Signed:</span> <span className="text-gray-300">{addedPlayers.join(', ')}</span>
                            </div>
                          )}
                          {droppedPlayers.length > 0 && (
                            <div className="text-xs">
                              <span className="text-red-400 font-semibold">Dropped:</span> <span className="text-gray-300">{droppedPlayers.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {tx.type === 'waiver' && (
                        <div className="space-y-1">
                          {addedPlayers.length > 0 && (
                            <div className="text-xs">
                              <span className="text-yellow-400 font-semibold">Claimed:</span> <span className="text-gray-300">{addedPlayers.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-slate-600/50">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(tx.created).toLocaleDateString()}
                        </div>
                        <Badge variant="outline" className="text-xs px-1 py-0 bg-green-400/20 text-green-400 border-green-400/30 font-mono">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

