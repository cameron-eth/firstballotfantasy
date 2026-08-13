'use client'

import { useMemo } from 'react'
import { ArrowLeftRight, Gavel, Radio, UserPlus } from 'lucide-react'
import { buildActivityFeed, type ActivityFeedItem } from './utils'
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
  const diffMin = Math.floor((Date.now() - timestamp) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return `${Math.floor(diffHr / 24)}d`
}

/** One-line summary of a move: the headline player plus how many others came with it. */
function summarize(item: ActivityFeedItem): string {
  const [firstAdd] = item.adds
  const [firstDrop] = item.drops
  const headline = firstAdd?.playerName ?? firstDrop?.playerName ?? 'Roster move'
  const team = firstAdd?.teamName ?? firstDrop?.teamName ?? ''
  const others = item.adds.length + item.drops.length - 1

  const suffix = others > 0 ? ` +${others}` : ''
  return team ? `${headline}${suffix} · ${team}` : `${headline}${suffix}`
}

interface LeagueActivityBannerProps {
  transactions: SleeperTransaction[]
  teams: TeamData[]
  allPlayers: Record<string, any>
  limit?: number
}

/**
 * League activity as a single scrolling strip rather than a stacked feed — recent moves
 * are ambient context, so they get one line across the top instead of a column of cards.
 */
export function LeagueActivityBanner({
  transactions,
  teams,
  allPlayers,
  limit = 12,
}: LeagueActivityBannerProps) {
  const feed = useMemo(
    () => buildActivityFeed(transactions, teams, allPlayers).slice(0, limit),
    [transactions, teams, allPlayers, limit]
  )

  if (feed.length === 0) return null

  return (
    <div className="flex items-stretch rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-r border-border flex-shrink-0 bg-cyan-400/5">
        <Radio className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
          League Activity
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto px-3 py-2">
        {feed.map((item) => {
          const meta = TYPE_META[item.type]
          const Icon = meta.icon
          return (
            <div key={item.id} className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon className={`h-3 w-3 flex-shrink-0 ${meta.color}`} />
              <span className={`text-[10px] font-mono uppercase ${meta.color}`}>{meta.label}</span>
              <span className="text-xs text-foreground">{summarize(item)}</span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {relativeTime(item.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
