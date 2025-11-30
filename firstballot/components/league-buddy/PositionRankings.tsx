'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { Trophy } from 'lucide-react'
import { TeamCard } from './TeamCard'
import type { TeamData } from './types'
import { getContenderTier, getTierColor, getRankColor } from './utils'

interface PositionRankingsProps {
  teams: TeamData[]
  selectedTeam: TeamData | null
  leaguePositionRankings: Record<number, Record<string, number>>
  onTeamSelect: (team: TeamData) => void
}

export function PositionRankings({
  teams,
  selectedTeam,
  leaguePositionRankings,
  onTeamSelect,
}: PositionRankingsProps) {
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-t-xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] rounded-t-xl"></div>

        <CardTitle className="relative text-yellow-400 font-mono flex items-center space-x-3">
          <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
            <Trophy className="h-6 w-6" />
          </div>
          <span className="text-xl">TEAM RANKINGS</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-600">
                    <th className="text-left p-3 text-slate-200 font-mono text-sm min-w-[200px]">
                      Team
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[120px]">
                      Contender Tier
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[100px]">
                      Starter Rank
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                      QB
                      <br />
                      Rank
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                      RB
                      <br />
                      Rank
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                      WR
                      <br />
                      Rank
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                      TE
                      <br />
                      Rank
                    </th>
                    <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                      FLEX
                      <br />
                      Rank
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams
                    .filter((team) => team && team.rosterId)
                    .map((team, index) => {
                      const teamRankings = leaguePositionRankings[team.rosterId] || {}
                      return (
                        <TeamCard
                          key={team.rosterId}
                          team={team}
                          rank={index + 1}
                          isSelected={selectedTeam?.rosterId === team.rosterId}
                          onSelect={onTeamSelect}
                          positionRankings={teamRankings}
                          getContenderTier={getContenderTier}
                          getTierColor={getTierColor}
                          getRankColor={getRankColor}
                          variant="desktop"
                        />
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {sortedTeams
            .filter((team) => team && team.rosterId)
            .map((team, index) => {
              const teamRankings = leaguePositionRankings[team.rosterId] || {}
              return (
                <TeamCard
                  key={team.rosterId}
                  team={team}
                  rank={index + 1}
                  isSelected={selectedTeam?.rosterId === team.rosterId}
                  onSelect={onTeamSelect}
                  positionRankings={teamRankings}
                  getContenderTier={getContenderTier}
                  getTierColor={getTierColor}
                  getRankColor={getRankColor}
                  variant="mobile"
                />
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}
