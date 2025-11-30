'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { Prospect } from './types'

interface ProspectDetailModalProps {
  prospect: Prospect | null
  positionNeeds: Record<string, number>
  onClose: () => void
  onAddToDraftBoard: () => void
  getProspectGrade: (prospect: Prospect) => string
  getDraftPick: (prospect: Prospect) => string
  getProspectTier: (rank: number, tier?: string | null) => string
  calculateProspectValue: (rank: number, position?: string) => number
  getPositionColor: (position: string) => string
}

export function ProspectDetailModal({
  prospect,
  positionNeeds,
  onClose,
  onAddToDraftBoard,
  getProspectGrade,
  getDraftPick,
  getProspectTier,
  calculateProspectValue,
  getPositionColor,
}: ProspectDetailModalProps) {
  if (!prospect) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>{prospect.name}</span>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Badge
                className={`${getPositionColor(prospect.position)}/30 text-slate-200 border border-slate-500/30`}
              >
                {getProspectGrade(prospect)}
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                {getDraftPick(prospect)}
              </Badge>
              <Badge variant="outline" className="text-green-400 border-green-400/50">
                {getProspectTier(prospect.rank, prospect.tier)}
              </Badge>
              <Badge variant="outline" className="text-gray-400">
                {prospect.school}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Dynasty Valuation</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Dynasty Value</span>
                    <span className="text-blue-400 font-bold">
                      {calculateProspectValue(prospect.rank, prospect.position)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rank</span>
                    <span className="text-blue-400 font-bold">#{prospect.rank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tier</span>
                    <span className="text-green-400">
                      {getProspectTier(prospect.rank, prospect.tier)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Scouting Grade</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Overall</span>
                    <span className="text-blue-400 font-bold">
                      {prospect.overall_grade?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Grade Tier</span>
                    <span className="text-green-400">{prospect.grade_tier || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Position</span>
                    <span className="text-blue-400">{prospect.position}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Roster Fit</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Position Need</span>
                    <Badge
                      className={
                        positionNeeds[prospect.position] > 0
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }
                    >
                      {positionNeeds[prospect.position] > 0 ? 'High' : 'Low'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Age Fit</span>
                    <span className="text-green-400">Excellent</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Draft Projection</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Projected Round</span>
                    <span className="text-purple-400 font-bold">{getDraftPick(prospect)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Position Rank</span>
                    <span className="text-blue-400">#{prospect.rank}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 flex-1"
                onClick={onAddToDraftBoard}
              >
                Add to Draft Board
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-gray-300 hover:border-blue-400 bg-transparent"
              >
                Compare to Roster
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
