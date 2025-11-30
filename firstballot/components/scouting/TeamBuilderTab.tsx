'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, School, Users, Wrench, Crown, User } from 'lucide-react'
import { ProspectCard } from './ProspectCard'
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
}

interface TeamBuilderTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  filteredProspects: Prospect[]
  roster: RosterPlayer[]
  onDragStart: (e: React.DragEvent, prospect: Prospect) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onShowComps: (prospect: Prospect) => void
}

export function TeamBuilderTab({
  loading,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  filteredProspects,
  roster,
  onDragStart,
  onDragOver,
  onDrop,
  onShowComps,
}: TeamBuilderTabProps) {
  return (
    <div className="relative">
      <Card className="bg-slate-800/90 border border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-amber-400" />
              Team Builder - What If Scenarios
            </span>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-200 border-amber-400/40 font-mono border">
                {roster.length} Players
              </Badge>
              <Badge className="bg-gradient-to-r from-emerald-500/30 to-green-500/20 text-emerald-200 border-emerald-400/40 font-mono border">
                {roster.filter((p) => p.isProspect).length} Prospects
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available Prospects to Add */}
            <div className="lg:col-span-1">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <School className="h-5 w-5 mr-2 text-amber-400" />
                Add Prospects to Roster
              </h3>
              <div className="mb-4 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search prospects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700/80 border-slate-600 text-white rounded-xl"
                  />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full bg-slate-700/80 border-slate-600 rounded-xl text-white">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="all" className="text-white">
                      All Positions
                    </SelectItem>
                    <SelectItem value="QB" className="text-white">
                      QB
                    </SelectItem>
                    <SelectItem value="RB" className="text-white">
                      RB
                    </SelectItem>
                    <SelectItem value="WR" className="text-white">
                      WR
                    </SelectItem>
                    <SelectItem value="TE" className="text-white">
                      TE
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading prospects...</p>
                  </div>
                ) : (
                  filteredProspects.slice(0, 30).map((prospect) => (
                    <div
                      key={prospect.id}
                      className="cursor-move"
                      draggable
                      onDragStart={(e) => onDragStart(e, prospect)}
                    >
                      <ProspectCard
                        prospect={prospect}
                        onSelect={() => {}}
                        onCompare={() => onShowComps(prospect)}
                        variant="compact"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Current Roster with Prospects */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                Your Roster (Drag prospects here)
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Drag college prospects to simulate adding them to your roster.
              </p>

              {/* Drop Zone */}
              <div
                className="min-h-[400px] border-2 border-dashed border-slate-600 rounded-xl p-4 transition-colors hover:border-amber-500/50"
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                {roster.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <Users className="h-16 w-16 text-slate-500 mb-4" />
                    <p className="text-slate-400 text-lg mb-2">No roster loaded</p>
                    <p className="text-slate-500 text-sm">Connect to a league to see your roster</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {['QB', 'RB', 'WR', 'TE'].map((position) => {
                      const positionPlayers = roster.filter((p) => p.position === position)
                      if (positionPlayers.length === 0) return null

                      return (
                        <div key={position}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-slate-700/80 text-slate-200 border-slate-600">
                              {position}
                            </Badge>
                            <span className="text-slate-500 text-sm">
                              ({positionPlayers.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {positionPlayers.map((player) => (
                              <div
                                key={player.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  player.isProspect
                                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10'
                                    : 'bg-slate-800/80 border-slate-600/50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        player.isProspect
                                          ? 'bg-gradient-to-br from-amber-500/40 to-yellow-500/30'
                                          : 'bg-slate-700'
                                      }`}
                                    >
                                      {player.isProspect ? (
                                        <Crown className="h-4 w-4 text-amber-300" />
                                      ) : (
                                        <User className="h-4 w-4 text-slate-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-white font-semibold text-sm flex items-center gap-1">
                                        {player.name}
                                        {player.isProspect && (
                                          <Badge className="bg-amber-500/20 text-amber-300 text-[10px] border-amber-500/30 px-1">
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
                                  <div className="text-right">
                                    <div className="text-blue-300 font-bold text-sm">
                                      {player.value}
                                    </div>
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
                )}
              </div>

              {/* Team Stats Summary */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700/80 to-slate-800 border border-slate-600/50">
                  <div className="text-gray-400 text-xs mb-1">Total Value</div>
                  <div className="text-xl font-bold text-blue-300">
                    {roster.reduce((sum, p) => sum + p.value, 0).toFixed(0)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700/80 to-slate-800 border border-slate-600/50">
                  <div className="text-gray-400 text-xs mb-1">Avg Age</div>
                  <div className="text-xl font-bold text-white">
                    {(roster.reduce((sum, p) => sum + p.age, 0) / roster.length || 0).toFixed(1)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                  <div className="text-amber-400 text-xs mb-1">Prospects</div>
                  <div className="text-xl font-bold text-amber-300">
                    {roster.filter((p) => p.isProspect).length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700/80 to-slate-800 border border-slate-600/50">
                  <div className="text-gray-400 text-xs mb-1">Roster Size</div>
                  <div className="text-xl font-bold text-white">{roster.length}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
