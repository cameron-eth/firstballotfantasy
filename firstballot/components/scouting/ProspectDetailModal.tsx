'use client'

import React from 'react'
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
  onSaveNotes: (id: number, notes: string) => void
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
  onSaveNotes,
  getProspectGrade,
  getDraftPick,
  getProspectTier,
  calculateProspectValue,
  getPositionColor,
}: ProspectDetailModalProps) {
  const [localNotes, setLocalNotes] = React.useState(prospect?.notes || '')

  React.useEffect(() => {
    setLocalNotes(prospect?.notes || '')
  }, [prospect])

  if (!prospect) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Card className="bg-slate-900 border-slate-700/50 w-full max-w-2xl overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-slate-800/50">
          <CardTitle className="text-white flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-400">
                 #{prospect.rank}
               </div>
               <div>
                 <div className="text-xl font-black">{prospect.name}</div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-widest">{prospect.school}</div>
               </div>
            </div>
            <Button variant="ghost" onClick={onClose} className="hover:bg-white/5">
              <X className="h-5 w-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={`${getPositionColor(prospect.position)}/30 text-slate-200 border border-slate-500/30 text-[10px] uppercase font-black tracking-widest`}
              >
                {getProspectGrade(prospect)}
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/5 text-[10px] uppercase font-black">
                {getDraftPick(prospect)} ROUND
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/5 text-[10px] uppercase font-black">
                {getProspectTier(prospect.rank, prospect.tier)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Analysis Card 1 */}
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] text-slate-500 uppercase font-mono mb-3 tracking-widest">Market Valuation</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Index Score</span>
                    <span className="text-blue-400 font-black font-mono">
                      {calculateProspectValue(prospect.rank, prospect.position)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Positional Rank</span>
                    <span className="text-white font-black font-mono">#{prospect.rank}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.max(10, 100 - (prospect.rank * 2))}%` }} />
                  </div>
                </div>
              </div>

              {/* Analysis Card 2 */}
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] text-slate-500 uppercase font-mono mb-3 tracking-widest">Roster Alignment</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Position Need</span>
                    <Badge
                      className={
                        positionNeeds[prospect.position] > 0
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-black'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30 text-[9px] font-black'
                      }
                    >
                      {positionNeeds[prospect.position] > 0 ? 'CRITICAL' : 'STABLE'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">System Fit</span>
                    <span className="text-emerald-400 font-black font-mono text-xs">ELITE (94%)</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Customization: Personal Scouting Report */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
               <div className="flex justify-between items-center mb-3">
                 <div className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Personal Scouting Report</div>
                 <Button 
                   size="sm" 
                   variant="ghost" 
                   className="h-6 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-tighter"
                   onClick={() => onSaveNotes(prospect.id, localNotes)}
                 >
                   Save Analysis
                 </Button>
               </div>
               <textarea
                 className="w-full bg-slate-900/50 border border-white/5 rounded-lg p-3 text-xs text-slate-300 font-mono min-h-[100px] focus:outline-none focus:border-blue-500/30 placeholder:text-slate-700 transition-colors"
                 placeholder="Enter personal notes, draft strategy, or trait analysis..."
                 value={localNotes}
                 onChange={(e) => setLocalNotes(e.target.value)}
               />
            </div>

            <div className="flex gap-3">
              <Button
                className="bg-blue-500 text-slate-900 hover:bg-blue-400 font-black text-[10px] uppercase tracking-widest flex-1 h-10 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                onClick={onAddToDraftBoard}
              >
                Add to Draft Board
              </Button>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-400 hover:border-slate-500 bg-transparent flex-1 h-10 text-[10px] uppercase font-black tracking-widest"
                onClick={onClose}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
