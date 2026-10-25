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

  return (
    <>
      {/* League Standings */}
      <Card className="rounded-none border-0 border-b border-white/10 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-white font-semibold text-lg">Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="region"
            aria-label="League records"
            tabIndex={0}
            className="max-h-[360px] overflow-y-auto overscroll-y-contain space-y-2 focus-visible:outline focus-visible:outline-blue-400"
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
    </>
  )
}
