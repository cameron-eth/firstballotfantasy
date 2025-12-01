'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, School, TrendingUp } from 'lucide-react'
import { AddProspectItem, DraftBoardItem } from './ProspectCard'
import type { Prospect } from './types'

interface DraftBoardTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  filteredProspects: Prospect[]
  draftBoard: Prospect[]
  onAddToDraftBoard: (prospect: Prospect) => void
  onRemoveFromDraftBoard: (prospectId: number) => void
  onBoardDragStart: (e: React.DragEvent, prospect: Prospect, index: number) => void
  onBoardDragOver: (e: React.DragEvent, index: number) => void
  onBoardDrop: (e: React.DragEvent, index: number) => void
  onClearDraftBoard: () => void
}

// Utility function to get tier from prospect
function getTier(prospect: Prospect): string {
  if (prospect.tier) return prospect.tier
  const rank = prospect.rank
  if (rank <= 5) return 'Tier 1'
  if (rank <= 12) return 'Tier 2'
  if (rank <= 18) return 'Tier 3'
  if (rank <= 25) return 'Tier 4'
  return 'Tier 5'
}

export function DraftBoardTab({
  loading,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  filteredProspects,
  draftBoard,
  onAddToDraftBoard,
  onRemoveFromDraftBoard,
  onBoardDragStart,
  onBoardDragOver,
  onBoardDrop,
  onClearDraftBoard,
}: DraftBoardTabProps) {
  // Draft board filter state
  const [boardPositionFilter, setBoardPositionFilter] = useState('all')
  const [boardTierFilter, setBoardTierFilter] = useState('all')

  // Filter draft board based on filters
  const filteredDraftBoard = useMemo(() => {
    let filtered = draftBoard

    if (boardPositionFilter !== 'all') {
      filtered = filtered.filter((prospect) => prospect.position === boardPositionFilter)
    }

    if (boardTierFilter !== 'all') {
      filtered = filtered.filter((prospect) => getTier(prospect) === boardTierFilter)
    }

    return filtered
  }, [draftBoard, boardPositionFilter, boardTierFilter])

  return (
    <div className="relative">
      <Card className="bg-transparent border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-white flex items-center justify-between">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Custom Draft Board
            </span>
            <div className="flex items-center space-x-2">
              <Badge className="bg-slate-800 border-slate-700 text-slate-300 font-mono border">
                {filteredDraftBoard.length} / {draftBoard.length} Prospects
              </Badge>
              {draftBoard.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearDraftBoard}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Clear Board
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Available Prospects */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-3 h-full">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <School className="h-4 w-4 text-amber-400" />
                  </div>
                  Add Prospects
                </h3>
                <div className="mb-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search prospects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-950 border-slate-800 text-white rounded-lg focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-full bg-slate-950 border-slate-800 rounded-lg text-white focus:border-blue-500/50 focus:ring-blue-500/20">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
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

                <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-500">Loading...</p>
                    </div>
                  ) : (
                    filteredProspects.slice(0, 50).map((prospect) => {
                      const isOnBoard = draftBoard.some((p) => p.id === prospect.id)
                      return (
                        <AddProspectItem
                          key={prospect.id}
                          prospect={prospect}
                          isOnBoard={isOnBoard}
                          onClick={() => onAddToDraftBoard(prospect)}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Draft Board */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-3 h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                    </div>
                    Your Personal Rankings
                  </h3>
                </div>

                {/* Draft Board Filters */}
                <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                  {/* Position Filter */}
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Position</div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant={boardPositionFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setBoardPositionFilter('all')}
                        className={
                          boardPositionFilter === 'all'
                            ? 'bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)] h-7 text-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                        }
                      >
                        All
                      </Button>
                      {['QB', 'RB', 'WR', 'TE'].map((pos) => (
                        <Button
                          key={pos}
                          size="sm"
                          variant={boardPositionFilter === pos ? 'default' : 'outline'}
                          onClick={() => setBoardPositionFilter(pos)}
                          className={
                            boardPositionFilter === pos
                              ? 'bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)] h-7 text-xs'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                          }
                        >
                          {pos}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Tier Filter */}
                  <div>
                    <div className="text-xs text-slate-400 mb-1 text-left sm:text-right">Tier</div>
                    <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                      <Button
                        size="sm"
                        variant={boardTierFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setBoardTierFilter('all')}
                        className={
                          boardTierFilter === 'all'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)] h-7 text-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                        }
                      >
                        All
                      </Button>
                      {['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'].map((tier) => (
                        <Button
                          key={tier}
                          size="sm"
                          variant={boardTierFilter === tier ? 'default' : 'outline'}
                          onClick={() => setBoardTierFilter(tier)}
                          className={
                            boardTierFilter === tier
                              ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)] h-7 text-xs'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                          }
                        >
                          {tier}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Drag prospects to reorder your board. Click the × to remove.
                </p>

                {draftBoard.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-slate-600" />
                    </div>
                    <p className="text-slate-400 mb-1 text-base font-medium">
                      Your draft board is empty
                    </p>
                    <p className="text-slate-500 text-xs">
                      Click on prospects from the left to add them to your custom board
                    </p>
                  </div>
                ) : filteredDraftBoard.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                      <Search className="h-6 w-6 text-slate-600" />
                    </div>
                    <p className="text-slate-400 mb-1 text-base font-medium">
                      No prospects match your filters
                    </p>
                    <p className="text-slate-500 text-xs">
                      Try adjusting your position or tier filters
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto space-y-1.5 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {filteredDraftBoard.map((prospect, index) => {
                      // Find the original index in the unfiltered draftBoard for drag operations
                      const originalIndex = draftBoard.findIndex((p) => p.id === prospect.id)
                      return (
                        <DraftBoardItem
                          key={prospect.id}
                          prospect={prospect}
                          index={originalIndex}
                          onRemove={() => onRemoveFromDraftBoard(prospect.id)}
                          onDragStart={(e) => onBoardDragStart(e, prospect, originalIndex)}
                          onDragOver={(e) => onBoardDragOver(e, originalIndex)}
                          onDrop={(e) => onBoardDrop(e, originalIndex)}
                          isDiamondTier={true}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
