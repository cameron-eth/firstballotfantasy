'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PlayerData } from '../types'
import { StrategyCard } from './StrategyCard'

export function RosterCardStack({
  players,
  position,
  outgoing,
  onToggle,
  onTrade,
}: {
  players: PlayerData[]
  position: string
  outgoing: string[]
  onToggle: (id: string) => void
  onTrade?: (player: PlayerData) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const index = Math.max(
    0,
    players.findIndex((p) => p.playerId === selectedId)
  )
  const player = players[index]
  if (!player)
    return <p className="py-4 text-center text-xs text-slate-500">No {position} players rostered</p>
  const cycle = (direction: number) =>
    setSelectedId(players[(index + direction + players.length) % players.length].playerId)
  const leaving = outgoing.includes(player.playerId)
  return (
    <div role="group" aria-label={`${position} roster stack`}>
      <div className="relative pb-4">
        {players.length > 2 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-0 top-5 rounded-[20px] border border-slate-600 bg-slate-900"
          />
        )}
        {players.length > 1 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 bottom-2 top-3 rounded-[20px] border border-slate-500 bg-slate-800"
          />
        )}
        <StrategyCard
          key={player.playerId}
          name={player.playerName}
          position={player.position}
          team={player.team}
          image={
            player.headshot_url ||
            `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`
          }
          rookie={player.isRookie}
          outgoing={leaving}
          label={leaving ? 'Planned departure' : 'Current roster'}
          action={leaving ? 'Keep' : 'Move out'}
          onAction={() => onToggle(player.playerId)}
        />
      </div>
      {onTrade && (
        <button
          type="button"
          className="mb-3 w-full rounded-lg border border-blue-400/30 px-3 py-2 text-xs text-blue-200 hover:bg-blue-400/10"
          onClick={() => onTrade(player)}
        >
          Show trade targets
        </button>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          aria-label={`Previous ${position} player`}
          disabled={players.length < 2}
          onClick={() => cycle(-1)}
          className="rounded-lg border border-slate-600 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span aria-live="polite" aria-atomic="true" className="text-center text-xs text-slate-400">
          <span className="sr-only">{player.playerName}, </span>
          {index + 1} / {players.length} rostered
        </span>
        <button
          type="button"
          aria-label={`Next ${position} player`}
          disabled={players.length < 2}
          onClick={() => cycle(1)}
          className="rounded-lg border border-slate-600 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
