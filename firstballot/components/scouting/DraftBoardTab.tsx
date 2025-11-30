'use client'

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
  return (
    <div className="relative">
      <Card className="bg-slate-800/90 border border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Custom Draft Board</span>
            <div className="flex items-center space-x-2">
              <Badge className="bg-gradient-to-r from-blue-500/30 to-indigo-500/20 text-blue-200 border-blue-400/40 font-mono border">
                {draftBoard.length} Prospects
              </Badge>
              {draftBoard.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearDraftBoard}
                  className="border-slate-600 text-gray-300 hover:bg-red-500 hover:border-red-500 hover:text-white bg-transparent transition-all"
                >
                  Clear Board
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available Prospects */}
            <div className="lg:col-span-1">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <School className="h-5 w-5 mr-2 text-amber-400" />
                Add Prospects
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

              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
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

            {/* Draft Board */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                Your Personal Rankings
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Drag prospects to reorder your board. Click the × to remove.
              </p>

              {draftBoard.length === 0 ? (
                <Card className="bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-xl">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2 text-lg">Your draft board is empty</p>
                    <p className="text-slate-500 text-sm">
                      Click on prospects from the left to add them to your custom board
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {draftBoard.map((prospect, index) => (
                    <DraftBoardItem
                      key={prospect.id}
                      prospect={prospect}
                      index={index}
                      onRemove={() => onRemoveFromDraftBoard(prospect.id)}
                      onDragStart={(e) => onBoardDragStart(e, prospect, index)}
                      onDragOver={(e) => onBoardDragOver(e, index)}
                      onDrop={(e) => onBoardDrop(e, index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
