'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { TeamLogo } from '@/components/team-logo'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { Target, TrendingUp } from 'lucide-react'
import type { TeamData, MatchupData } from './types'
import { getRankColor } from './utils'

const GRADE_COLORS = {
  'A+': 'bg-green-500/20 text-green-400 border-green-400/30',
  A: 'bg-green-500/20 text-green-400 border-green-400/30',
  'B+': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'C+': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  C: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
  D: 'bg-red-500/20 text-red-400 border-red-400/30',
  F: 'bg-red-500/20 text-red-400 border-red-400/30',
}

interface MatchupViewProps {
  selectedTeam: TeamData
  opponent: TeamData
  teamMatchup: MatchupData
  currentWeek: number
  leaguePositionRankings: Record<number, Record<string, number>>
  sortedTeams: TeamData[]
}

export function MatchupView({
  selectedTeam,
  opponent,
  teamMatchup,
  currentWeek,
  leaguePositionRankings,
  sortedTeams,
}: MatchupViewProps) {
  const teamPoints = teamMatchup.actualPoints || 0
  const oppPoints = teamMatchup.opponentActualPoints || 0
  const isWinning = teamPoints > oppPoints
  const pointDiff = Math.abs(teamPoints - oppPoints)

  // Calculate matchup rating helper
  const getMatchupRating = (opponentTeam: string): string => {
    const toughDefenses = ['BAL', 'SF', 'BUF', 'DAL', 'PIT', 'CLE', 'NYJ', 'PHI']
    const eliteMatchups = ['ARI', 'CAR', 'DEN', 'LV', 'NYG', 'WAS', 'ATL', 'IND']
    const goodMatchups = ['GB', 'KC', 'LAC', 'MIA', 'TB', 'HOU']

    if (toughDefenses.includes(opponentTeam)) return 'Tough'
    if (eliteMatchups.includes(opponentTeam)) return 'Elite'
    if (goodMatchups.includes(opponentTeam)) return 'Good'
    return Math.random() > 0.5 ? 'Great' : 'Average'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Elite':
        return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'Great':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
      case 'Good':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'Average':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
      case 'Tough':
        return 'text-red-400 bg-red-400/10 border-red-400/30'
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/30'
    }
  }

  // Generate opponent team for a player (mock - would use NFL schedule in real implementation)
  const getPlayerOpponent = (player: any): { team: string; isHome: boolean } => {
    const nflTeams = [
      'ARI',
      'ATL',
      'BAL',
      'BUF',
      'CAR',
      'CHI',
      'CIN',
      'CLE',
      'DAL',
      'DEN',
      'DET',
      'GB',
      'HOU',
      'IND',
      'JAX',
      'KC',
      'LAC',
      'LAR',
      'LV',
      'MIA',
      'MIN',
      'NE',
      'NO',
      'NYG',
      'NYJ',
      'PHI',
      'PIT',
      'SEA',
      'SF',
      'TB',
      'TEN',
      'WAS',
    ]
    const seed = player.team
      .split('')
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    const opponentIndex = (seed + player.rank) % nflTeams.length
    const opponentTeam = nflTeams[opponentIndex]
    const isHome = seed % 2 === 0
    return { team: opponentTeam, isHome }
  }

  return (
    <>
      {/* Matchup Header */}
      <Card className="bg-gradient-to-r from-slate-700 to-slate-600 border-slate-500">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-yellow-400 font-mono text-lg mb-1">Week {currentWeek} Matchup</h3>
            <p className="text-slate-400 text-sm">Head to Head Analysis</p>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Your Team */}
            <div className="text-center">
              <UserAvatar
                avatarId={selectedTeam.ownerAvatar}
                displayName={selectedTeam.ownerName}
                username={selectedTeam.ownerUsername}
                size={64}
                className="mx-auto mb-3 ring-2 ring-yellow-400/50"
              />
              <div className="font-bold text-white text-lg mb-1">{selectedTeam.teamName}</div>
              <Badge className={GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}>
                {selectedTeam.grade}
              </Badge>
              <div
                className={`text-3xl font-bold mt-3 ${isWinning ? 'text-green-400' : 'text-red-400'}`}
              >
                {teamPoints.toFixed(1)}
              </div>
            </div>

            {/* VS Indicator */}
            <div className="text-center">
              <div className="text-slate-400 font-mono text-2xl font-bold mb-2">VS</div>
              {teamPoints > 0 && oppPoints > 0 && (
                <div className={`text-sm ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
                  {isWinning ? '+' : '-'}
                  {pointDiff.toFixed(1)}
                </div>
              )}
            </div>

            {/* Opponent Team */}
            <div className="text-center">
              <UserAvatar
                avatarId={opponent.ownerAvatar}
                displayName={opponent.ownerName}
                username={opponent.ownerUsername}
                size={64}
                className="mx-auto mb-3 ring-2 ring-blue-400/50"
              />
              <div className="font-bold text-white text-lg mb-1">{opponent.teamName}</div>
              <Badge className={GRADE_COLORS[opponent.grade as keyof typeof GRADE_COLORS]}>
                {opponent.grade}
              </Badge>
              <div
                className={`text-3xl font-bold mt-3 ${!isWinning ? 'text-green-400' : 'text-red-400'}`}
              >
                {oppPoints.toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Comparison Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Position Group Comparisons */}
        <Card className="bg-slate-700 border-slate-600">
          <CardHeader>
            <CardTitle className="text-blue-400 text-sm">POSITION MATCHUPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['QB', 'RB', 'WR', 'TE', 'FLEX'].map((pos) => {
                const yourRank = leaguePositionRankings[selectedTeam.rosterId]?.[pos] || 12
                const oppRank = leaguePositionRankings[opponent.rosterId]?.[pos] || 12
                const advantage = yourRank < oppRank

                return (
                  <div key={pos} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Badge
                        className={`${getRankColor(yourRank)} font-mono text-xs w-8 justify-center`}
                      >
                        {yourRank}
                      </Badge>
                      <span className="text-slate-300 text-sm font-mono">{pos}</span>
                    </div>
                    {advantage ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : yourRank === oppRank ? (
                      <div className="w-4 h-0.5 bg-yellow-400"></div>
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
                    )}
                    <Badge
                      className={`${getRankColor(oppRank)} font-mono text-xs w-8 justify-center`}
                    >
                      {oppRank}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overall Stats Comparison */}
        <Card className="bg-slate-700 border-slate-600">
          <CardHeader>
            <CardTitle className="text-green-400 text-sm">SEASON STATS COMPARISON</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Record:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-100 font-mono">
                    {selectedTeam.wins}-{selectedTeam.losses}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-slate-100 font-mono">
                    {opponent.wins}-{opponent.losses}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Points For:</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono ${selectedTeam.pointsFor > opponent.pointsFor ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {Math.round(selectedTeam.pointsFor)}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span
                    className={`font-mono ${opponent.pointsFor > selectedTeam.pointsFor ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {Math.round(opponent.pointsFor)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">PPG:</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono ${
                      selectedTeam.pointsFor /
                        Math.max(selectedTeam.wins + selectedTeam.losses, 1) >
                      opponent.pointsFor / Math.max(opponent.wins + opponent.losses, 1)
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {Math.round(
                      selectedTeam.pointsFor / Math.max(selectedTeam.wins + selectedTeam.losses, 1)
                    )}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span
                    className={`font-mono ${
                      opponent.pointsFor / Math.max(opponent.wins + opponent.losses, 1) >
                      selectedTeam.pointsFor / Math.max(selectedTeam.wins + selectedTeam.losses, 1)
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {Math.round(opponent.pointsFor / Math.max(opponent.wins + opponent.losses, 1))}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">League Rank:</span>
                <div className="flex items-center space-x-2">
                  <Badge
                    className={`${getRankColor(sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1)} font-mono text-xs`}
                  >
                    #{sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                  </Badge>
                  <span className="text-slate-400">vs</span>
                  <Badge
                    className={`${getRankColor(sortedTeams.findIndex((t) => t.rosterId === opponent.rosterId) + 1)} font-mono text-xs`}
                  >
                    #{sortedTeams.findIndex((t) => t.rosterId === opponent.rosterId) + 1}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start/Sit Helper */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-yellow-400 text-sm flex items-center">
            <Target className="h-4 w-4 mr-2" />
            START/SIT HELPER - WEEK {currentWeek}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-xs mb-4">
            Your roster with Week {currentWeek} opponent matchups
          </p>

          {/* Group by position */}
          {['QB', 'RB', 'WR', 'TE'].map((position) => {
            const positionPlayers = selectedTeam.players.filter((p) => p.position === position)
            if (positionPlayers.length === 0) return null

            return (
              <div key={position} className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      position === 'QB'
                        ? 'bg-blue-500'
                        : position === 'RB'
                          ? 'bg-green-500'
                          : position === 'WR'
                            ? 'bg-yellow-500'
                            : 'bg-purple-500'
                    }`}
                  >
                    {position}
                  </div>
                  <h4 className="text-slate-200 font-mono text-sm font-semibold">
                    {position} OPTIONS ({positionPlayers.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {positionPlayers
                    .sort((a, b) => a.rank - b.rank)
                    .map((player, idx) => {
                      const { team: opponentTeam, isHome } = getPlayerOpponent(player)
                      const matchupRating = getMatchupRating(opponentTeam)
                      const ratingColor = getRatingColor(matchupRating)

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-600 rounded-lg border border-slate-500 hover:border-yellow-400/50 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Player Info */}
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <PlayerHeadshot
                                headshotUrl={player.headshot_url}
                                playerName={player.playerName}
                                size={32}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="text-slate-100 font-semibold text-sm truncate">
                                    {player.playerName}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-slate-500/20 flex-shrink-0"
                                  >
                                    #{player.rank}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                  <span className="text-slate-400">{player.team}</span>
                                  <span className="text-slate-500">•</span>
                                  <div className="flex items-center space-x-1">
                                    {isHome ? (
                                      <>
                                        <span className="text-green-400">vs</span>
                                        <TeamLogo team={opponentTeam} size={16} />
                                        <span className="text-slate-300">{opponentTeam}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-blue-400">@</span>
                                        <TeamLogo team={opponentTeam} size={16} />
                                        <span className="text-slate-300">{opponentTeam}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Matchup Rating */}
                            <div className="flex-shrink-0">
                              <Badge
                                className={`${ratingColor} border font-mono text-xs px-2 py-1`}
                              >
                                {matchupRating}
                              </Badge>
                            </div>
                          </div>

                          {/* Position-specific advice */}
                          {idx === 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-500">
                              <div className="flex items-start space-x-2">
                                <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-300">
                                  <span className="text-green-400 font-semibold">START:</span> Top
                                  ranked {position} on your roster
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}

          <div className="mt-4 p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-blue-400 mb-1">PRO TIP:</p>
                <p>
                  Green matchups (vs) indicate home games. Blue matchups (@) are away games.
                  Elite/Great ratings suggest strong start candidates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Players Matchup */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="text-purple-400 text-sm">KEY PLAYERS MATCHUP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Best Players */}
            <div>
              <h4 className="text-yellow-400 font-mono text-xs mb-3">{selectedTeam.teamName}</h4>
              <div className="space-y-2">
                {selectedTeam.players.slice(0, 5).map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-600 rounded"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        playerName={player.playerName}
                        size={28}
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 text-sm font-semibold truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • {player.team}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-slate-500/20">
                      #{player.rank}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Opponent's Best Players */}
            <div>
              <h4 className="text-blue-400 font-mono text-xs mb-3">{opponent.teamName}</h4>
              <div className="space-y-2">
                {opponent.players.slice(0, 5).map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-600 rounded"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        playerName={player.playerName}
                        size={28}
                      />
                      <div className="min-w-0">
                        <div className="text-slate-100 text-sm font-semibold truncate">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.position} • {player.team}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-slate-500/20">
                      #{player.rank}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
