'use client'

import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
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
  const headshot = resolveHeadshot(name, playerId, allPlayers, dynastyRankings)
  const rawPlayer = playerId ? allPlayers[playerId] : null
  const rankingEntry = dynastyRankings[name] || dynastyRankings[normalizeName(name)]
  const position =
    rawPlayer?.position || rankingEntry?.position || cachedValuation?.position || 'FLEX'
  const team = rawPlayer?.team || rankingEntry?.team || cachedValuation?.team || 'NFL'
  const value = cachedValuation?.value ?? 0
  return (
    <PlayerTradingCard
      name={name}
      position={position}
      team={team}
      image={headshot}
      imageHeight="h-40"
      badge={type === 'buy-low' ? 'Buy-low candidate' : 'Sell-high candidate'}
      label={`Managed by ${ownerName}`}
    >
      <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
        <span>
          Value <strong className="text-white tabular-nums">{value.toFixed(1)}</strong>
        </span>
        <span className="text-emerald-300">
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)} {type === 'buy-low' ? 'surplus' : 'profit'}
        </span>
      </div>
    </PlayerTradingCard>
  )
}
