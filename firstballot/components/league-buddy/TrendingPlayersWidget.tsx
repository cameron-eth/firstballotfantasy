'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Flame, TrendingUp } from 'lucide-react'
import type { TrendingPlayer } from './types'

const POSITION_BADGE: Record<string, string> = {
  QB: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  RB: 'bg-green-500/20 text-green-400 border-green-500/40',
  WR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  TE: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  K: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  DEF: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
}

interface TrendingPlayersWidgetProps {
  trendingPlayers: TrendingPlayer[]
  limit?: number
}

export function TrendingPlayersWidget({ trendingPlayers, limit = 6 }: TrendingPlayersWidgetProps) {
  const topAdds = useMemo(
    () =>
      [...trendingPlayers]
        .sort((a, b) => b.addCount - a.addCount)
        .slice(0, limit),
    [trendingPlayers, limit]
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Flame className="h-4 w-4 text-red-400" />
        <h3 className="text-red-400 font-mono text-sm font-bold uppercase">Trending Adds</h3>
        <span className="text-muted-foreground/60 text-[10px] font-mono ml-auto">league-wide</span>
      </div>

      {topAdds.length === 0 ? (
        <div className="text-muted-foreground text-xs text-center py-8">
          No trending player data available.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {topAdds.map((p) => (
            <div key={p.playerId} className="flex items-center gap-2 px-4 py-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 border font-mono ${POSITION_BADGE[p.position] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40'}`}
              >
                {p.position}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{p.playerName}</div>
                <div className="text-[10px] text-muted-foreground">{p.team}</div>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 flex-shrink-0">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-mono font-bold tabular-nums">{p.addCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
