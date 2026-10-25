'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TeamData } from './types'
import { TeamCard } from './TeamCard'
import { getRankColor } from './utils'
import type { LeaguePlacements } from './competitiveState'

interface LeagueStandingsSectionProps {
  teams: TeamData[]
  selectedTeam: TeamData
  leaguePositionRankings: Record<number, Record<string, number>>
  placements: LeaguePlacements
  onTeamSelect: (team: TeamData) => void
}

export function LeagueStandingsSection({
  teams,
  selectedTeam,
  leaguePositionRankings,
  placements,
  onTeamSelect,
}: LeagueStandingsSectionProps) {
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })

  // Calculate league averages
  const avgPoints = teams.reduce((sum, t) => sum + t.pointsFor, 0) / teams.length
  const avgWins = teams.reduce((sum, t) => sum + t.wins, 0) / teams.length
  const avgGradeScore = teams.reduce((sum, t) => sum + t.gradeScore, 0) / teams.length

  // Get grade from score
  const getGradeFromScore = (score: number): string => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B+'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C+'
    if (score >= 50) return 'C'
    return 'D'
  }

  // Find leaders
  const mostPointsTeam = sortedTeams[0]
  const bestRecordTeam = [...sortedTeams].sort((a, b) => b.wins - a.wins)[0]
  const highestGradedTeam = [...sortedTeams].sort((a, b) => b.gradeScore - a.gradeScore)[0]

  // Calculate user ranks
  const overallRank = sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const pointsRank =
    [...sortedTeams]
      .sort((a, b) => b.pointsFor - a.pointsFor)
      .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const gradeRank =
    [...sortedTeams]
      .sort((a, b) => b.gradeScore - a.gradeScore)
      .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1

  return (
    <>
      {/* League Standings */}
      <Card className="rounded-none border-0 border-b border-white/10 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-white font-semibold text-lg">LEAGUE STANDINGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="region"
            aria-label="League records"
            tabIndex={0}
            className="max-h-[60vh] overflow-y-auto overscroll-y-contain space-y-2 focus-visible:outline focus-visible:outline-blue-400"
          >
            {sortedTeams.map((team, idx) => {
              const rank = idx + 1
              const teamRankings = leaguePositionRankings[team.rosterId] || {}
              return (
                <TeamCard
                  key={team.rosterId}
                  team={team}
                  rank={rank}
                  isSelected={team.rosterId === selectedTeam.rosterId}
                  onSelect={onTeamSelect}
                  positionRankings={teamRankings}
                  placement={placements.placements[team.rosterId]}
                  getRankColor={getRankColor}
                  variant="compact"
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* League Stats */}
      <div className="divide-y divide-white/10">
        <Card className="rounded-none border-0 border-b border-white/10 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle className="text-green-400 text-sm">LEAGUE LEADERS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-slate-400">Most Points</div>
              <div className="font-semibold text-slate-100">
                {mostPointsTeam?.teamName} ({mostPointsTeam?.pointsFor.toFixed(1)})
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Best Record</div>
              <div className="font-semibold text-slate-100">
                {bestRecordTeam?.teamName} ({bestRecordTeam?.wins}-{bestRecordTeam?.losses})
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Highest Graded</div>
              <div className="font-semibold text-slate-100">
                {highestGradedTeam?.teamName} ({highestGradedTeam?.grade})
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-b border-white/10 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle className="text-blue-400 text-sm">YOUR RANK</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-slate-400">Overall</div>
              <div className="font-semibold text-slate-100">
                #{overallRank} of {teams.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Points Rank</div>
              <div className="font-semibold text-slate-100">#{pointsRank}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Grade Rank</div>
              <div className="font-semibold text-slate-100">#{gradeRank}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-b border-white/10 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle className="text-orange-400 text-sm">LEAGUE AVG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-slate-400">Avg Points</div>
              <div className="font-semibold text-slate-100">{avgPoints.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Avg Wins</div>
              <div className="font-semibold text-slate-100">{avgWins.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Avg Grade</div>
              <div className="font-semibold text-slate-100">{getGradeFromScore(avgGradeScore)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
