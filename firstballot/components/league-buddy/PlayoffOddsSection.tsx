'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target } from 'lucide-react'
import type { TeamData } from './types'
import { calculatePlayoffOdds } from './utils/playoffOdds'

interface ScheduleMap {
  [week: number]: {
    [rosterId: number]: number // opponent rosterId
  }
}

interface PlayoffOddsSectionProps {
  teams: TeamData[]
  currentWeek: number
  totalWeeks?: number
  playoffSpots?: number
  schedule?: ScheduleMap
}

export function PlayoffOddsSection({
  teams,
  currentWeek,
  totalWeeks = 14,
  playoffSpots,
  schedule,
}: PlayoffOddsSectionProps) {
  const playoffOdds = useMemo(() => {
    if (teams.length === 0) return []
    return calculatePlayoffOdds(teams, currentWeek, totalWeeks, playoffSpots, schedule)
  }, [teams, currentWeek, totalWeeks, playoffSpots, schedule])

  const getProbabilityColor = (probability: number) => {
    if (probability >= 90) return 'text-green-400'
    if (probability >= 70) return 'text-yellow-400'
    if (probability >= 40) return 'text-orange-400'
    if (probability >= 10) return 'text-red-400'
    return 'text-gray-400'
  }

  const getProbabilityBg = (probability: number) => {
    if (probability >= 90) return 'bg-green-500/20 border-green-500/30'
    if (probability >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
    if (probability >= 40) return 'bg-orange-500/20 border-orange-500/30'
    if (probability >= 10) return 'bg-red-500/20 border-red-500/30'
    return 'bg-gray-500/20 border-gray-500/30'
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <CardTitle className="text-white font-mono">PLAYOFF ODDS</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Target className="h-4 w-4" />
            <span className="font-mono">
              Week {currentWeek}/{totalWeeks}
            </span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Playoff probability based on current record and points for
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Team</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Record</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">PF</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">
                  P(Playoffs)
                </th>
              </tr>
            </thead>
            <tbody>
              {playoffOdds.map((team, index) => (
                <tr
                  key={team.teamName}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    index < (playoffSpots || Math.ceil(teams.length / 2)) ? 'bg-green-950/10' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono w-6">#{team.rank}</span>
                      <span className="text-white font-semibold text-sm">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-white font-mono text-sm">
                      {team.wins}-{team.losses}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-gray-300 font-mono text-sm">
                      {team.pointsFor.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-mono font-semibold text-sm ${getProbabilityColor(
                        team.playoffProbability
                      )}`}
                    >
                      {team.playoffProbability >= 99.99
                        ? '100.00'
                        : team.playoffProbability < 0.01
                          ? '0.00'
                          : team.playoffProbability.toFixed(2)}
                      %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono mb-1">Playoff Spots</div>
            <div className="text-lg font-bold text-yellow-400 font-mono">
              {playoffSpots || Math.ceil(teams.length / 2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono mb-1">Locks</div>
            <div className="text-lg font-bold text-green-400 font-mono">
              {playoffOdds.filter((t) => t.playoffProbability >= 99).length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono mb-1">In Contention</div>
            <div className="text-lg font-bold text-yellow-400 font-mono">
              {
                playoffOdds.filter((t) => t.playoffProbability >= 10 && t.playoffProbability < 99)
                  .length
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono mb-1">Eliminated</div>
            <div className="text-lg font-bold text-gray-400 font-mono">
              {playoffOdds.filter((t) => t.playoffProbability < 1).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
