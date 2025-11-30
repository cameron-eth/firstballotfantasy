'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { ComparisonList } from './ComparisonBadges'
import type { Prospect } from './types'

interface ComparisonsModalProps {
  prospect: Prospect | null
  onClose: () => void
  getProspectTier: (rank: number, tier?: string | null) => string
  getTierColor: (tier: string) => string
  getPositionColor: (position: string) => string
  hitRateData: Record<
    string,
    Record<
      string,
      { elite: number; tier1: number; tier2: number; startable: number; streamer: number }
    >
  >
}

export function ComparisonsModal({
  prospect,
  onClose,
  getProspectTier,
  getTierColor,
  getPositionColor,
  hitRateData,
}: ComparisonsModalProps) {
  if (!prospect) return null

  const tier = getProspectTier(prospect.rank, prospect.tier)
  const position = prospect.position
  const hitRate = hitRateData[position]?.[tier]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>{prospect.name}</span>
            <Button variant="ghost" onClick={onClose} className="hover:bg-red-500 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Prospect Header */}
            <div className="flex items-center space-x-4">
              <Badge
                className={`${getPositionColor(position)}/30 text-slate-200 border border-slate-500/30`}
              >
                {position}
              </Badge>
              <Badge className={getTierColor(tier)}>{tier}</Badge>
              <span className="text-gray-400">{prospect.school}</span>
            </div>

            {/* Hit Rate Analysis */}
            {hitRate && (
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Hit Rate Analysis:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Elite:</span>
                      <span className="text-yellow-400 font-semibold">{hitRate.elite}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tier 1:</span>
                      <span className="text-blue-400 font-semibold">{hitRate.tier1}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tier 2:</span>
                      <span className="text-green-400 font-semibold">{hitRate.tier2}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Startable:</span>
                      <span className="text-purple-400 font-semibold">{hitRate.startable}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Streamer:</span>
                      <span className="text-orange-400 font-semibold">{hitRate.streamer}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NFL Comparisons */}
            {prospect.nfl_comparisons && (
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">NFL Player Comparisons:</h4>
                <ComparisonList comparisons={prospect.nfl_comparisons} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
