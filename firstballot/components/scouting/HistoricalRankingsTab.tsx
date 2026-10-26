'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { CompactSelect } from '@/components/ui/compact-select'
import { Input } from '@/components/ui/input'
import { ScoutingSectionHeader } from './ScoutingSectionHeader'
import { CareerOutcomeMeter } from './CareerOutcomeMeter'
import { gradeOrder, type CareerOutcome } from '@/lib/history-outcomes'
import type { Prospect } from './types'
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load history')
  return response.json()
}
export function HistoricalRankingsTab() {
  const [year, setYear] = useState('all')
  const [position, setPosition] = useState('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(30)
  const {
    data: players = [],
    isLoading,
    error,
    mutate,
  } = useSWR<Prospect[]>('/api/prospects?draft_year=all&scope=history', fetcher)
  const { data: results, error: outcomeError } = useSWR<{
    season: number
    week: number
    outcomes: Record<string, CareerOutcome>
  }>('/api/history-outcomes', fetcher)
  const years = [
    ...new Set(players.map((p) => p.draft_year).filter((y): y is number => y != null)),
  ].sort((a, b) => b - a)
  const visible = players
    .filter(
      (p) =>
        (year === 'all' || String(p.draft_year) === year) &&
        (position === 'all' || p.position === position) &&
        `${p.name} ${p.school}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort(gradeOrder)
  const asOf = results
    ? `Through ${results.season} · Week ${results.week}`
    : 'Outcome data unavailable'
  return (
    <div>
      <ScoutingSectionHeader
        title="Class history"
        description="Original scouting grades · career outcomes at a glance"
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Search historical players"
              placeholder="Find a player…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setLimit(30)
              }}
              className="h-9 w-48 text-xs"
            />
            <CompactSelect
              label="Historical class"
              value={year}
              onChange={(v) => {
                setYear(v)
                setLimit(30)
              }}
              options={[
                { value: 'all', label: 'All classes' },
                ...years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />
            <CompactSelect
              label="Position"
              value={position}
              onChange={(v) => {
                setPosition(v)
                setLimit(30)
              }}
              options={[
                { value: 'all', label: 'All positions' },
                ...['QB', 'RB', 'WR', 'TE'].map((p) => ({ value: p, label: p })),
              ]}
            />
          </div>
        }
        secondary={
          <p className="text-xs text-slate-400">
            {visible.length} players · Highest grade first · {asOf} · Tap the signal bars for
            outcomes{outcomeError ? ' · Outcome data could not be loaded' : ''}
          </p>
        }
      />
      {isLoading && (
        <p role="status" className="py-8 text-slate-400">
          Loading class history…
        </p>
      )}
      {error && (
        <div role="alert" className="py-8">
          History could not be loaded.{' '}
          <button className="text-blue-300 underline" onClick={() => void mutate()}>
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && !visible.length && (
        <p className="py-8 text-slate-400">No players match these filters.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {visible.slice(0, limit).map((p) => (
          <PlayerTradingCard
            key={p.id}
            name={p.name}
            position={p.position}
            team={p.school}
            image={
              p.headshot_url ||
              (p.espn_id
                ? `https://a.espncdn.com/i/headshots/nfl/players/full/${p.espn_id}.png`
                : null)
            }
            imageHeight="h-48"
            compact
            badge={`${p.draft_year} class${p.grade_tier ? ` · ${p.grade_tier}` : ''}`}
          >
            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
              <div>
                <span className="text-xs text-slate-400">Scouting grade</span>
                <strong className="ml-2 text-lg text-white">
                  {p.overall_grade == null ? '—' : p.overall_grade.toFixed(1)}
                </strong>
              </div>
              <CareerOutcomeMeter
                name={p.name}
                outcome={results?.outcomes[`${p.espn_id}:${p.draft_year}`]}
                asOf={asOf}
              />
            </div>
          </PlayerTradingCard>
        ))}
      </div>
      {visible.length > limit && (
        <button
          className="mx-auto mt-6 block rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-200"
          onClick={() => setLimit((v) => v + 30)}
        >
          Show more players
        </button>
      )}
    </div>
  )
}
