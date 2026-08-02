'use client'

import { useMemo } from 'react'
import { ArrowLeftRight, UserPlus, Gavel, Radio } from 'lucide-react'
import { buildActivityFeed } from './utils'
import type { SleeperTransaction, TeamData } from './types'

const TYPE_META: Record<
  SleeperTransaction['type'],
  { label: string; icon: typeof ArrowLeftRight; color: string }
> = {
  trade: { label: 'Trade', icon: ArrowLeftRight, color: 'text-purple-400' },
  waiver: { label: 'Waiver', icon: Gavel, color: 'text-blue-400' },
  free_agent: { label: 'Free Agent', icon: UserPlus, color: 'text-emerald-400' },
}

function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

interface LeagueActivityFeedProps {
  transactions: SleeperTransaction[]
  teams: TeamData[]
  allPlayers: Record<string, any>
  limit?: number
}

export function LeagueActivityFeed({
  transactions,
  teams,
  allPlayers,
  limit = 8,
}: LeagueActivityFeedProps) {
  const feed = useMemo(
    () => buildActivityFeed(transactions, teams, allPlayers).slice(0, limit),
    [transactions, teams, allPlayers, limit]
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Radio className="h-4 w-4 text-cyan-400" />
        <h3 className="text-cyan-400 font-mono text-sm font-bold uppercase">League Activity</h3>
      </div>

      {feed.length === 0 ? (
        <div className="text-muted-foreground text-xs text-center py-8">
          No transactions yet this season.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {feed.map((item) => {
            const meta = TYPE_META[item.type]
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${meta.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-mono uppercase font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-muted-foreground/60 text-[10px] font-mono">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground space-y-0.5">
                    {item.adds.map((a, i) => (
                      <div key={`add-${item.id}-${i}`} className="truncate">
                        <span className="text-emerald-400 font-mono">+</span> {a.playerName}
                        <span className="text-muted-foreground"> · {a.teamName}</span>
                      </div>
                    ))}
                    {item.drops.map((d, i) => (
                      <div key={`drop-${item.id}-${i}`} className="truncate">
                        <span className="text-red-400 font-mono">−</span> {d.playerName}
                        <span className="text-muted-foreground"> · {d.teamName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
