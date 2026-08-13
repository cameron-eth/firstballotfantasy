'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PlayerValue } from '@/lib/trade-utils'
import { normalizeName, resolveHeadshot } from './utils'

export function TradePlayerCard({
  name,
  playerId,
  delta,
  ownerName,
  type,
  allPlayers,
  dynastyRankings,
  cachedValuation,
}: {
  name: string
  playerId?: string | null
  delta: number
  ownerName: string
  type: 'buy-low' | 'sell-high'
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  cachedValuation?: PlayerValue | null
}) {
  const [imageError, setImageError] = useState(false)
  const headshot = resolveHeadshot(name, playerId, allPlayers, dynastyRankings)
  const rawPlayer = playerId ? allPlayers[playerId] : null
  const rankingEntry =
    dynastyRankings[name] || dynastyRankings[normalizeName(name)]
  const position = rawPlayer?.position || rankingEntry?.position || cachedValuation?.position || 'FLEX'
  const team = rawPlayer?.team || rankingEntry?.team || cachedValuation?.team || 'NFL'
  const value = cachedValuation?.value ?? 0
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isBuyLow = type === 'buy-low'
  const deltaColor = isBuyLow ? 'text-emerald-400' : 'text-blue-400'
  const deltaBg = isBuyLow
    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'

  return (
    <div className="group relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300">
      {/* Position badge — top-left */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-lg font-mono font-bold text-primary drop-shadow-lg">
          {position}
        </span>
      </div>

      {/* Delta badge — top-right */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${deltaBg}`}
        >
          +{delta.toFixed(1)}
        </span>
      </div>

      {/* Image area */}
      <div className="relative h-32 bg-secondary/30 flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-[1]" />
        {!imageError && headshot ? (
          <Image
            src={headshot}
            alt={name}
            width={120}
            height={120}
            className="object-contain object-bottom scale-110 group-hover:scale-115 transition-transform duration-500 relative z-0"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground/20">
              {initials}
            </span>
        </div>
        )}
        {/* Owner badge — bottom of image */}
        <div className="absolute bottom-1.5 left-2 z-10">
          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-secondary/80 text-muted-foreground border border-border/50 backdrop-blur-sm">
            {ownerName}
          </span>
        </div>
      </div>

      {/* Info area */}
      <div className="p-3">
        <h3 className="font-mono text-sm font-bold text-foreground tracking-tight truncate mb-0.5">
          {name}
        </h3>
        <p className="text-[10px] text-muted-foreground mb-2">{team}</p>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-primary">
              {value.toFixed(1)}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">
              Val
            </span>
        </div>
          <div className={`text-xs font-mono font-bold ${deltaColor}`}>
            +{delta.toFixed(1)}
            <span className="text-[9px] ml-0.5 opacity-70">
              {isBuyLow ? 'surplus' : 'profit'}
            </span>
      </div>
        </div>
      </div>
    </div>
  )
}
