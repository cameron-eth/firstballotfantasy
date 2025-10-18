"use client"

import { memo, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"

interface PlayerData {
  playerId: string
  playerName: string
  position: string
  team: string
  rank: number
}

interface TeamData {
  rosterId: number
  teamName: string
  ownerName: string
  ownerAvatar?: string
  ownerUsername?: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  grade: string
  gradeScore: number
  players: PlayerData[]
}

interface TeamRankingsProps {
  teams: TeamData[]
  selectedTeam: TeamData | null
  onTeamSelect: (team: TeamData) => void
}

export const TeamRankings = memo(({ teams, selectedTeam, onTeamSelect }: TeamRankingsProps) => {
  // Sort teams by wins, then by points
  const sortedTeams = useMemo(() => {
    if (!teams || teams.length === 0) return []
    return [...teams].sort((a, b) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins
      }
      return b.pointsFor - a.pointsFor
    })
  }, [teams])

  // Calculate league position rankings
  const leaguePositionRankings = useMemo(() => {
    if (!sortedTeams || sortedTeams.length === 0) return {}
    
    const calculateLeaguePositionRankings = () => {
      const positions = ['QB', 'RB', 'WR', 'TE']
      const teamPositionScores: Record<string, Record<string, number>> = {}
      
      // Calculate position scores for each team
      sortedTeams.forEach(team => {
        if (!team || !team.rosterId || !team.players) return
        
        teamPositionScores[team.rosterId] = {}
        
        positions.forEach(position => {
          const positionPlayers = team.players.filter(p => p && p.position && p.position === position)
          if (positionPlayers.length === 0) {
            teamPositionScores[team.rosterId][position] = 999 // Worst possible score
          } else {
            // Use best player rank for QB, average of top 2 for skill positions
            const sortedRanks = positionPlayers.map(p => p.rank || 999).sort((a, b) => a - b)
            if (position === 'QB') {
              teamPositionScores[team.rosterId][position] = sortedRanks[0]
            } else {
              // Average of top 2 players for RB/WR/TE
              teamPositionScores[team.rosterId][position] = 
                (sortedRanks[0] + (sortedRanks[1] || sortedRanks[0])) / 2
            }
          }
        })
        
        // FLEX is based on overall team grade score
        teamPositionScores[team.rosterId]['FLEX'] = Math.max(0, 100 - (team.gradeScore || 0))
      })
      
      // Rank teams by position (1 = best position group in league)
      const positionRankings: Record<string, Record<string, number>> = {}
      
      const allPositions = [...positions, 'FLEX']
      allPositions.forEach(position => {
        const teamScores = sortedTeams
          .filter(team => team && team.rosterId && teamPositionScores[team.rosterId])
          .map(team => ({
            rosterId: team.rosterId,
            score: teamPositionScores[team.rosterId][position] || 999
          }))
          .sort((a, b) => a.score - b.score) // Lower score = better rank
        
        teamScores.forEach((teamScore, index) => {
          if (!positionRankings[teamScore.rosterId]) positionRankings[teamScore.rosterId] = {}
          positionRankings[teamScore.rosterId][position] = index + 1
        })
      })
      
      return positionRankings
    }
    
    try {
      return calculateLeaguePositionRankings()
    } catch (error) {
      console.error('Error calculating position rankings:', error)
      return {}
    }
  }, [sortedTeams])

  // Helper functions
  const getContenderTier = useCallback((grade: string, rank: number) => {
    if (['A+', 'A'].includes(grade) && rank <= 2) return 'Powerhouse'
    if (['A-', 'B+', 'B'].includes(grade) && rank <= 6) return 'Contender'
    if (['B-', 'C+', 'C'].includes(grade) && rank <= 10) return 'Pretender'
    return 'Rebuilder'
  }, [])
  
  const getTierColor = useCallback((tier: string) => {
    switch(tier) {
      case 'Powerhouse': return 'bg-green-900/80 text-green-200 border-green-700/50'
      case 'Contender': return 'bg-yellow-900/80 text-yellow-200 border-yellow-700/50'
      case 'Pretender': return 'bg-orange-900/80 text-orange-200 border-orange-700/50'
      case 'Rebuilder': return 'bg-red-900/80 text-red-200 border-red-700/50'
      default: return 'bg-gray-900/80 text-gray-200 border-gray-700/50'
    }
  }, [])
  
  const getRankColor = useCallback((rank: number) => {
    if (rank <= 3) return 'bg-green-900/70 text-green-100 border-green-700/40'
    if (rank <= 6) return 'bg-yellow-900/70 text-yellow-100 border-yellow-700/40'
    if (rank <= 9) return 'bg-orange-900/70 text-orange-100 border-orange-700/40'
    return 'bg-red-900/70 text-red-100 border-red-700/40'
  }, [])

  if (!sortedTeams || sortedTeams.length === 0) {
    return <div className="text-slate-400 text-center py-8">No team data available</div>
  }

  return (
    <div className="mb-6">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-600">
                  <th className="text-left p-3 text-slate-200 font-mono text-sm min-w-[200px]">Team</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[120px]">Contender Tier</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[100px]">Starter Rank</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">QB<br/>Rank</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">RB<br/>Rank</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">WR<br/>Rank</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">TE<br/>Rank</th>
                  <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">FLEX<br/>Rank</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.filter(team => team && team.rosterId).map((team, index) => {
                  try {
                    const contenderTier = getContenderTier(team.grade || 'F', index + 1)
                    const teamRankings = leaguePositionRankings[team.rosterId] || {}
                    const qbRank = teamRankings['QB'] || 12
                    const rbRank = teamRankings['RB'] || 12
                    const wrRank = teamRankings['WR'] || 12
                    const teRank = teamRankings['TE'] || 12
                    const flexRank = teamRankings['FLEX'] || 12
                  
                    return (
                      <tr 
                        key={team.rosterId} 
                        className={`border-t border-slate-600 hover:bg-slate-600/50 cursor-pointer transition-all ${
                          selectedTeam?.rosterId === team.rosterId ? 'bg-yellow-400/10 border-yellow-400' : ''
                        }`}
                        onClick={() => onTeamSelect(team)}
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <UserAvatar
                              avatarId={team.ownerAvatar}
                              displayName={team.ownerName}
                              username={team.ownerUsername}
                              size={32}
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 truncate">{team.teamName}</div>
                              <div className="text-xs text-gray-400 truncate">{team.ownerName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getTierColor(contenderTier)} font-mono text-xs px-3 py-1 border`}>
                            {contenderTier}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(index + 1)} font-mono text-sm px-2 py-1 border`}>
                            {index + 1}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(qbRank)} font-mono text-sm px-2 py-1 border`}>
                            {qbRank}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(rbRank)} font-mono text-sm px-2 py-1 border`}>
                            {rbRank}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(wrRank)} font-mono text-sm px-2 py-1 border`}>
                            {wrRank}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(teRank)} font-mono text-sm px-2 py-1 border`}>
                            {teRank}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${getRankColor(flexRank)} font-mono text-sm px-2 py-1 border`}>
                            {flexRank}
                          </Badge>
                        </td>
                      </tr>
                    )
                  } catch (error) {
                    console.error('Error rendering team row:', error, team)
                    return null
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {sortedTeams.filter(team => team && team.rosterId).map((team, index) => {
          try {
            const contenderTier = getContenderTier(team.grade || 'F', index + 1)
            const teamRankings = leaguePositionRankings[team.rosterId] || {}
            const qbRank = teamRankings['QB'] || 12
            const rbRank = teamRankings['RB'] || 12
            const wrRank = teamRankings['WR'] || 12
            const teRank = teamRankings['TE'] || 12
            const flexRank = teamRankings['FLEX'] || 12
          
            return (
              <Card 
                key={team.rosterId}
                className={`bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 cursor-pointer transition-all duration-200 ${
                  selectedTeam?.rosterId === team.rosterId ? 'ring-2 ring-yellow-400/50 border-yellow-400/50' : ''
                }`}
                onClick={() => onTeamSelect(team)}
              >
                <CardContent className="p-4">
                  {/* Team Header */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Badge variant="outline" className={`${getRankColor(index + 1)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}>
                        #{index + 1}
                      </Badge>
                      <UserAvatar
                        avatarId={team.ownerAvatar}
                        displayName={team.ownerName}
                        username={team.ownerUsername}
                        size={28}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 text-xs truncate">
                          {team.teamName.length > 18 ? team.teamName.substring(0, 15) + '...' : team.teamName}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {team.ownerName.length > 12 ? team.ownerName.substring(0, 9) + '...' : team.ownerName}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getTierColor(contenderTier)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}>
                      {contenderTier}
                    </Badge>
                  </div>

                  {/* Position Rankings Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-mono mb-1">QB</div>
                      <Badge variant="outline" className={`${getRankColor(qbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                        {qbRank}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-mono mb-1">RB</div>
                      <Badge variant="outline" className={`${getRankColor(rbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                        {rbRank}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-mono mb-1">WR</div>
                      <Badge variant="outline" className={`${getRankColor(wrRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                        {wrRank}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-mono mb-1">TE</div>
                      <Badge variant="outline" className={`${getRankColor(teRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                        {teRank}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-mono mb-1">FLEX</div>
                      <Badge variant="outline" className={`${getRankColor(flexRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                        {flexRank}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          } catch (error) {
            console.error('Error rendering mobile team card:', error, team)
            return null
          }
        })}
      </div>
    </div>
  )
})

TeamRankings.displayName = "TeamRankings"

