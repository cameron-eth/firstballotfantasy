'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { boardsToProspects } from '@/lib/draftboard-classes'
import type { Draftboard } from '@/types/draftboard'
import type { Prospect } from '@/components/scouting/types'
import type { Target } from '@/lib/team-scenarios'
import { StrategyCard } from './StrategyCard'

export function useBoardFit(enabled: boolean, prospects: Prospect[], horizon?: number) {
  const { user } = useAuth()
  const [year, setYear] = useState('')
  const {
    data = [],
    error,
    isLoading,
    mutate,
  } = useSWR(
    enabled && user ? ['/api/draftboard', user.id] : null,
    async ([url]: [string, string]): Promise<Draftboard[]> => {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load your saved board.')
      return (await response.json()).boards ?? []
    }
  )
  const players = boardsToProspects(data, prospects)
  const years = [...new Set(players.map((p) => String(p.draft_year)))].sort()
  const activeYear = horizon ? String(horizon) : years.includes(year) ? year : (years[0] ?? '')
  return {
    user,
    error,
    isLoading,
    refresh: mutate,
    years,
    activeYear,
    setYear,
    players: players.filter((p) => String(p.draft_year) === activeYear),
  }
}

export function BoardFitStack({
  players,
  position,
  eligible,
  targets,
  full,
  onAdd,
}: {
  players: Prospect[]
  position: string
  eligible?: string[]
  targets: Target[]
  full: boolean
  onAdd: (target: Target) => void
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const matches = players.filter(
    (p) =>
      (eligible ?? [position]).includes(p.position) &&
      !targets.some((t) => t.id === `prospect:${p.id}`)
  )
  const index = Math.max(
    0,
    matches.findIndex((p) => p.id === selectedId)
  )
  const player = matches[index]
  if (!player)
    return (
      <p className="border-t border-dashed border-slate-700 pt-3 text-xs text-slate-500">
        No unplanned {position} on this board
      </p>
    )
  return (
    <div className="space-y-2 border-t border-dashed border-blue-400/30 pt-4">
      <div className="flex items-center justify-between text-xs text-blue-200">
        <span>
          On your board · {index + 1} / {matches.length}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`Previous ${position} board prospect`}
            disabled={matches.length < 2}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-30"
            onClick={() => setSelectedId(matches[(index - 1 + matches.length) % matches.length].id)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`Next ${position} board prospect`}
            disabled={matches.length < 2}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-30"
            onClick={() => setSelectedId(matches[(index + 1) % matches.length].id)}
          >
            →
          </button>
        </div>
      </div>
      <StrategyCard
        name={player.name}
        position={player.position}
        team={player.school}
        image={player.headshot_url}
        label={`Board #${players.findIndex((p) => p.id === player.id) + 1} · ${player.draft_year}`}
        action={full ? 'Plan full' : 'Add to plan'}
        disabled={full}
        onAction={() =>
          onAdd({
            id: `prospect:${player.id}`,
            name: player.name,
            position: player.position,
            team: player.school,
            image: player.headshot_url ?? null,
            kind: 'draft',
            year: player.draft_year ?? undefined,
          })
        }
      />
    </div>
  )
}
