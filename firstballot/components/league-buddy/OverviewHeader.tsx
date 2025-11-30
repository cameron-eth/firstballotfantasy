'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { Trophy, Eye, Users, Target, BarChart3 } from 'lucide-react'
import type { TeamData, MatchupData } from './types'

const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  A: 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  B: 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-500/20 text-green-500 border-green-500',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  C: 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-500/20 text-blue-500 border-blue-500',
  'D+': 'bg-orange-400/20 text-orange-400 border-orange-400',
  D: 'bg-orange-400/20 text-orange-400 border-orange-400',
  'D-': 'bg-red-400/20 text-red-400 border-red-400',
  F: 'bg-red-500/20 text-red-500 border-red-500',
}

interface OverviewHeaderProps {
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  playerRankings: Record<string, any>
  currentMatchups: MatchupData[]
  currentWeek: number
  onTradeMarketClick: () => void
  onScoutingPortalClick: () => void
  onDraftBuddyClick: () => void
  onPlayoffOddsClick: () => void
}

export function OverviewHeader({
  selectedTeam,
  sortedTeams,
  playerRankings,
  currentMatchups,
  currentWeek,
  onTradeMarketClick,
  onScoutingPortalClick,
  onDraftBuddyClick,
  onPlayoffOddsClick,
}: OverviewHeaderProps) {
  const userMatchup = currentMatchups.find((m) => m.rosterId === selectedTeam.rosterId)
  const pointDiff = userMatchup ? userMatchup.actualPoints - userMatchup.opponentActualPoints : 0
  const isWinning = pointDiff > 0
  const isTied = pointDiff === 0

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        {/* Header: Team Info + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-slate-700">
          <div className="flex items-center space-x-4">
            <UserAvatar
              avatarId={selectedTeam.ownerAvatar}
              displayName={selectedTeam.ownerName}
              username={selectedTeam.ownerUsername}
              size={48}
              className="ring-2 ring-yellow-400/30"
            />
            <div>
              <h2 className="text-xl font-bold text-yellow-400 font-mono mb-1">
                {selectedTeam.teamName}
              </h2>
              <div className="flex items-center space-x-3 text-sm">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}
                >
                  {selectedTeam.grade}
                </Badge>
                <span className="text-slate-400">
                  #{sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {selectedTeam.wins}-{selectedTeam.losses}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-yellow-400 font-mono text-xs">
                  {(() => {
                    const totalProjection = selectedTeam.players.reduce((sum, player) => {
                      const playerRank =
                        playerRankings[`${player.playerName}` as keyof typeof playerRankings]
                      return sum + (playerRank?.projection || 0)
                    }, 0)
                    return `${totalProjection.toFixed(1)} avg`
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
              onClick={onTradeMarketClick}
            >
              <Trophy className="h-4 w-4" />
              <span>Trade</span>
            </button>
            <button
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
              onClick={onScoutingPortalClick}
            >
              <Eye className="h-4 w-4" />
              <span>Scout</span>
            </button>
            <button
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
              onClick={onDraftBuddyClick}
            >
              <Users className="h-4 w-4" />
              <span>Draft</span>
            </button>
            <button
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
              onClick={onPlayoffOddsClick}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Playoff Odds</span>
            </button>
          </div>
        </div>

        {/* Matchup Score - Compact with Avatars */}
        {userMatchup ? (
          <div className="bg-slate-700/30 rounded-lg p-3 mt-3">
            <div className="text-center mb-2">
              <div className="text-slate-500 font-mono text-xs mb-1">WEEK {currentWeek}</div>
              <div
                className={`text-sm font-bold ${isWinning ? 'text-green-400' : isTied ? 'text-slate-300' : 'text-red-400'}`}
              >
                {isWinning ? 'WINNING' : isTied ? 'TIED' : 'LOSING'}
                {userMatchup.actualPoints > 0 && (
                  <span className="ml-2">by {Math.abs(pointDiff).toFixed(1)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Your Team */}
              <div className="flex flex-col items-center space-y-1 flex-1">
                <UserAvatar
                  avatarId={selectedTeam.ownerAvatar}
                  displayName={selectedTeam.ownerName}
                  username={selectedTeam.ownerUsername}
                  size={40}
                  className="ring-2 ring-yellow-400/50 flex-shrink-0"
                />
                <div className="text-center">
                  <div className="text-slate-400 text-xs font-mono mb-1">YOU</div>
                  <div className="text-xl font-bold text-slate-100 font-mono">
                    {userMatchup.actualPoints > 0 ? userMatchup.actualPoints.toFixed(1) : '0'}
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="text-slate-600 font-mono text-sm px-2 flex-shrink-0">VS</div>

              {/* Opponent Team */}
              <div className="flex flex-col items-center space-y-1 flex-1">
                <UserAvatar
                  avatarId={userMatchup.opponentAvatar}
                  displayName={userMatchup.opponentDisplayName || userMatchup.opponentTeamName}
                  username={userMatchup.opponentUsername || userMatchup.opponentTeamName}
                  size={40}
                  className="ring-2 ring-blue-400/50 flex-shrink-0"
                />
                <div className="text-center">
                  <div className="text-slate-400 text-xs font-mono mb-1 truncate">
                    {userMatchup.opponentTeamName.toUpperCase()}
                  </div>
                  <div className="text-xl font-bold text-slate-100 font-mono">
                    {userMatchup.opponentActualPoints > 0
                      ? userMatchup.opponentActualPoints.toFixed(1)
                      : '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No matchup for Week {currentWeek}</p>
          </div>
        )}

        {/* Mobile Action Buttons - Only visible on mobile */}
        <div className="md:hidden flex items-center justify-center space-x-3 mt-3 flex-wrap gap-2">
          <button
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
            onClick={onTradeMarketClick}
          >
            <Trophy className="h-4 w-4" />
            <span>Trade</span>
          </button>
          <button
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
            onClick={onScoutingPortalClick}
          >
            <Eye className="h-4 w-4" />
            <span>Scout</span>
          </button>
          <button
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
            onClick={onDraftBuddyClick}
          >
            <Users className="h-4 w-4" />
            <span>Draft</span>
          </button>
          <button
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
            onClick={onPlayoffOddsClick}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Playoff Odds</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
