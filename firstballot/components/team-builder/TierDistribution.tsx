'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TierStats } from '@/types/team-builder'

interface TierDistributionProps {
  tierDistribution: Record<string, TierStats>
}

export function TierDistribution({ tierDistribution }: TierDistributionProps) {
  return (
    <Card className="bg-slate-800 border-slate-700 mb-8">
      <CardHeader>
        <CardTitle className="text-white font-mono">TIER DISTRIBUTION</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(tierDistribution).map(([tier, stats]) => (
            <div key={tier} className="text-center">
              <div className="text-2xl font-mono text-white mb-1">{stats.percentage}%</div>
              <div className="text-sm text-gray-400 font-mono">{tier}</div>
              <div className="text-xs text-yellow-400 font-mono">{stats.players} players</div>
              <div className="text-xs text-green-400 font-mono">{stats.avgPPG} PPG</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
