'use client'
import { useState } from 'react'
import Link from 'next/link'
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

export function BoardFitControls({
  board,
  loading,
  failed,
  retry,
  onYearChange,
}: {
  board: ReturnType<typeof useBoardFit>
  loading: boolean
  failed: boolean
  retry: () => void
  onYearChange?: (year: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <span className="font-medium text-white">Your board → roster fit</span>
      {board.user && (board.isLoading || loading) ? (
        <span>Loading your board…</span>
      ) : board.error || failed ? (
        <button onClick={retry} className="text-red-300">
          Board unavailable · Retry
        </button>
      ) : !board.user ? (
        <span>Sign in to see your saved board here.</span>
      ) : !board.years.length ? (
        <span>No saved prospects yet.</span>
      ) : (
        <>
          <select
            aria-label="Board draft class"
            value={board.activeYear}
            onChange={(e) =>
              onYearChange ? onYearChange(Number(e.target.value)) : board.setYear(e.target.value)
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {!board.years.includes(board.activeYear) && (
              <option value={board.activeYear}>{board.activeYear} · no saved prospects</option>
            )}
            {board.years.map((year) => (
              <option key={year} value={year}>
                {year} board
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            Preview by position · add a player to include them in planned depth
          </span>
        </>
      )}
      <Link
        href="/scouting-portal?tab=draftboard"
        className="ml-auto text-blue-300 hover:underline"
      >
        Edit board ↗
      </Link>
    </div>
  )
}

export function BoardFitStack({
  players,
  position,
  targets,
  full,
  onAdd,
}: {
  players: Prospect[]
  position: string
  targets: Target[]
  full: boolean
  onAdd: (target: Target) => void
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const matches = players.filter((p) => p.position === position)
  const index = Math.max(
    0,
    matches.findIndex((p) => p.id === selectedId)
  )
  const player = matches[index]
  if (!player)
    return (
      <p className="border-t border-dashed border-slate-700 pt-3 text-xs text-slate-500">
        No {position} on this board
      </p>
    )
  const added = targets.some((target) => target.id === `prospect:${player.id}`)
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
        action={added ? 'In plan' : full ? 'Plan full' : 'Add to plan'}
        disabled={added || full}
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
