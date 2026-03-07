'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerNGSStats } from '@/components/player-ngs-stats'
import { Trophy } from 'lucide-react'
import { TeamData, PlayerData } from '@/types/league'
import { GRADE_COLORS } from '@/lib/league-utils'

interface TeamViewTabProps {
  userTeam: TeamData | null
  currentWeek: number
}

export const TeamViewTab = memo(function TeamViewTab({ userTeam, currentWeek }: TeamViewTabProps) {
  if (!userTeam) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No team data available</p>
      </div>
    )
  }

  return (
    <>
      {/* Team Header */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded-lg blur-lg opacity-10"></div>
        <div className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-lg p-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-yellow-400/20 backdrop-blur-sm rounded-2xl border-2 border-yellow-400/30 flex items-center justify-center">
                <span className="text-yellow-400 font-bold text-2xl font-mono">
                  {userTeam.teamName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white font-mono mb-2">
                  {userTeam.teamName}
                </h1>
                <div className="flex items-center space-x-4">
                  <Badge
                    variant="outline"
                    className="text-lg px-4 py-2 bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono font-bold"
                  >
                    {userTeam.rank}th Place
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-lg px-4 py-2 bg-green-400/20 text-green-400 border-green-400/30 font-mono font-bold"
                  >
                    Grade: {userTeam.grade}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-yellow-400 font-mono mb-1 font-semibold">RECORD</div>
              <div className="text-3xl font-bold text-white font-mono">
                {userTeam.wins}-{userTeam.losses}
              </div>
              <div className="text-sm text-gray-400 mt-2 font-mono">
                {userTeam.pointsFor.toFixed(1)} PF • {userTeam.pointsAgainst.toFixed(1)} PA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-mono text-2xl font-light flex items-center space-x-3">
            <div className="p-2 bg-foreground/10 rounded-lg border border-border">
              <Trophy className="h-6 w-6" />
            </div>
            <span>TEAM ROSTER</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userTeam.players.map((player: PlayerData) => (
              <Card
                key={player.playerId}
                className="bg-card border-border hover:border-foreground/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{player.playerName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {player.team} • {player.position}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-foreground/10 text-foreground border-border"
                    >
                      #{player.rank}
                    </Badge>
                  </div>

                  {/* NGS Stats */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <PlayerNGSStats
                      playerName={player.playerName}
                      position={player.position}
                      compact={true}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border">
                    <span className="text-muted-foreground">{player.tier}</span>
                    <span className="text-muted-foreground">Age {player.age}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
})
