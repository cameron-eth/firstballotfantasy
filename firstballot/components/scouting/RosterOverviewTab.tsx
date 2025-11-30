'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import type { Prospect } from './types'

interface RosterPlayer {
  id: string
  name: string
  position: string
  team: string
  age: number
  experience: number
  value: number
  isProspect?: boolean
  prospectData?: Prospect
  sleeper_id?: string
  search_rank?: number
  fantasy_pos_rank?: number
  injury_status?: string
  fantasy_ppg?: number
  games_played?: number
  positionalRank?: number
}

interface RosterOverviewTabProps {
  roster: RosterPlayer[]
  positionNeeds: Record<string, number>
  rosterWithPositionalRanks: (RosterPlayer & { positionalRank: number })[]
  onProspectSelect: (prospect: Prospect) => void
}

export function RosterOverviewTab({
  roster,
  positionNeeds,
  rosterWithPositionalRanks,
  onProspectSelect,
}: RosterOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Roster Overview */}
      <div className="relative">
        <Card className="bg-slate-800 border border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Roster Overview</span>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {roster.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['QB', 'RB', 'WR', 'TE'].map((pos) => {
                const count = roster.filter((p) => p.position === pos).length
                const avgAge =
                  roster.filter((p) => p.position === pos).reduce((sum, p) => sum + p.age, 0) /
                    count || 0
                const avgValue =
                  roster.filter((p) => p.position === pos).reduce((sum, p) => sum + p.value, 0) /
                    count || 0
                return (
                  <div key={pos} className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold mb-2">
                      {pos}
                    </div>
                    <div className="text-white font-bold text-lg">{count}</div>
                    <div className="text-gray-400 text-xs">Avg Age: {avgAge.toFixed(1)}</div>
                    <div className="text-blue-400 text-xs font-semibold">
                      Avg Value: {avgValue.toFixed(0)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Positional Needs */}
            <div className="mt-4 bg-slate-700 rounded-lg p-3">
              <h3 className="text-white font-semibold text-sm mb-2">Positional Needs</h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(positionNeeds).map(([pos, need]) => (
                  <Badge
                    key={pos}
                    className={`${need > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'} text-xs`}
                  >
                    {pos}: {need}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Roster Strength Summary */}
            <div className="mt-4 bg-slate-700 rounded-lg p-3">
              <h3 className="text-white font-semibold text-sm mb-2">Roster Strength</h3>
              <div className="space-y-2">
                {['QB', 'RB', 'WR', 'TE'].map((position) => {
                  const positionPlayers = rosterWithPositionalRanks.filter(
                    (p) => p.position === position
                  )
                  if (positionPlayers.length === 0) return null

                  const totalValue = positionPlayers.reduce((sum, p) => sum + p.value, 0)
                  const avgRank =
                    positionPlayers.reduce((sum, p) => sum + p.positionalRank, 0) /
                    positionPlayers.length
                  const topPlayer = positionPlayers.sort((a, b) => b.value - a.value)[0]

                  return (
                    <div key={position} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                        <span className="text-gray-300">{position}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-blue-400">Total: {totalValue.toFixed(0)}</span>
                        <span className="text-slate-300">Avg Rank: {avgRank.toFixed(1)}</span>
                        <span className="text-gray-400">Top: {topPlayer.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Players by Position */}
            <div className="mt-4">
              <h3 className="text-white font-semibold text-sm mb-2">Top Players by Position</h3>
              <div className="space-y-2">
                {['QB', 'RB', 'WR', 'TE'].map((position) => {
                  const topPlayer = rosterWithPositionalRanks
                    .filter((p) => p.position === position)
                    .sort((a, b) => b.value - a.value)[0]

                  if (!topPlayer) return null

                  return (
                    <div
                      key={position}
                      className="flex items-center justify-between p-2 bg-slate-700 rounded text-xs hover:bg-slate-600 transition-colors cursor-pointer"
                      onClick={() =>
                        topPlayer.isProspect && onProspectSelect(topPlayer.prospectData!)
                      }
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge className="bg-slate-500/30 text-slate-200 text-xs border border-slate-500/30">
                          {position}
                        </Badge>
                        <Badge className="bg-slate-400/30 text-slate-200 text-xs border border-slate-400/30">
                          #{topPlayer.positionalRank}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-semibold flex items-center gap-1">
                            <span className="truncate">{topPlayer.name}</span>
                            {!topPlayer.isProspect && topPlayer.fantasy_ppg && (
                              <Badge className="bg-green-500/20 text-green-300 text-[10px] border border-green-500/30 font-mono flex-shrink-0">
                                {topPlayer.fantasy_ppg.toFixed(1)} PPG
                              </Badge>
                            )}
                          </div>
                          <div className="text-gray-400">{topPlayer.team}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-blue-400 font-mono font-semibold">
                          {topPlayer.value}
                        </div>
                        <div className="text-gray-400 text-xs">Value</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Roster Area */}
      <div className="relative lg:col-span-3">
        <Card className="bg-slate-800 border border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Current Roster</span>
              <div className="text-sm text-gray-400">
                Drag prospects from the Prospects tab to add them to your roster
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {['QB', 'RB', 'WR', 'TE'].map((position) => {
                const positionPlayers = rosterWithPositionalRanks.filter(
                  (p) => p.position === position
                )
                return (
                  <div key={position} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-slate-500/30 text-slate-200 border border-slate-500/30">
                        {position}
                      </Badge>
                      <span className="text-gray-400 text-sm">
                        {positionPlayers.length} players
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {positionPlayers.map((player) => (
                        <div
                          key={player.id}
                          className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
                            player.isProspect
                              ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10'
                              : 'bg-slate-800/80 border-slate-600/50'
                          }`}
                          onClick={() =>
                            player.isProspect && onProspectSelect(player.prospectData!)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  player.isProspect
                                    ? 'bg-gradient-to-br from-amber-500/40 to-yellow-500/30'
                                    : 'bg-slate-700'
                                }`}
                              >
                                {player.isProspect ? (
                                  <Users className="h-4 w-4 text-amber-300" />
                                ) : (
                                  <Users className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-semibold text-sm flex items-center gap-1">
                                  <span className="truncate">{player.name}</span>
                                  {player.isProspect && (
                                    <Badge className="bg-amber-500/20 text-amber-300 text-[10px] border-amber-500/30 px-1 flex-shrink-0">
                                      2026
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {player.isProspect
                                    ? `${player.prospectData?.school} • #${player.prospectData?.rank}`
                                    : `${player.team} • Age ${player.age}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-blue-300 font-bold text-sm">{player.value}</div>
                              <div className="text-gray-500 text-[10px]">value</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
