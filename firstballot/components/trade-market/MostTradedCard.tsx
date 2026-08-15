'use client'

import { useState } from 'react'
import type { MostTradedPlayer } from './types'
import { normalizeName, resolveHeadshot } from './utils'


export function MostTradedCard({
  player,
  rank,
  allPlayers,
  dynastyRankings,
}: {
  player: MostTradedPlayer
  rank: number
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}) {
  const [imageError, setImageError] = useState(false)
  const headshot = resolveHeadshot(player.name, player.playerId, allPlayers, dynastyRankings)
  const ranking =
    dynastyRankings[player.name] || dynastyRankings[normalizeName(player.name)]
  const raw = player.playerId ? allPlayers[player.playerId] : null
  const position = ranking?.position || raw?.position || ''
  const team = ranking?.team || raw?.team || ''
  const initials = player.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/40 via-card to-card transition-colors hover:border-blue-500/40">
      <span className="absolute top-2 right-2.5 z-10 text-[10px] font-mono text-muted-foreground">
        #{rank}
      </span>
      <div className="flex items-stretch gap-3 h-24">
        {/* Headshot */}
        <div className="relative w-24 flex-shrink-0 bg-gradient-to-b from-secondary/30 to-transparent">
          {!imageError && headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headshot}
              alt={player.name}
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-base font-mono text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex min-w-0 flex-col justify-center py-2 pr-3">
          <div className="truncate text-sm font-bold leading-tight text-foreground">
            {player.name}
          </div>
          {(position || team) && (
            <div className="mb-1.5 truncate text-[10px] font-mono uppercase text-muted-foreground">
              {position}
              {position && team ? ' · ' : ''}
              {team}
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black leading-none text-blue-400">
              {player.count}×
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">traded</span>
          </div>
        </div>
      </div>
    </div>
  )
}
