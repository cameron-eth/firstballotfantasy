'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { CompactSelect } from '@/components/ui/compact-select'
import { ScoutingSectionHeader } from './ScoutingSectionHeader'
import type { CareerOutcome } from '@/lib/history-outcomes'
import { bandSummary, surprises, toHitPoints, type HitPoint } from '@/lib/hits-misses'
import type { Prospect } from './types'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load history')
  return response.json()
}

/** Same tones as the outcome pill: hits emerald, on track sky, misses rose. */
const DOT: Record<number, string> = {
  1: '#fb7185',
  2: '#fda4af',
  3: '#7dd3fc',
  4: '#34d399',
  5: '#6ee7b7',
}
const MAX_RATIO = 3
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)

function PointTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: HitPoint }[]
}) {
  const p = active ? payload?.[0]?.payload : undefined
  if (!p) return null
  return (
    <div className="rounded-xl border border-blue-300/30 bg-slate-950/95 px-3 py-2 text-xs text-slate-300 shadow-2xl">
      <p className="font-semibold text-white">{p.name}</p>
      <p>
        {p.position} · {p.year} class · grade {p.grade.toFixed(1)}
      </p>
      <p style={{ color: DOT[p.bars] }}>
        {p.label} · {p.ratio.toFixed(1)}× expected
      </p>
    </div>
  )
}

function SurpriseList({
  title,
  tone,
  players,
}: {
  title: string
  tone: string
  players: HitPoint[]
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className={cn('text-sm font-semibold', tone)}>{title}</h3>
      {players.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">None in this view.</p>
      ) : (
        <ol className="mt-2 space-y-1.5 text-sm">
          {players.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3">
              <span className="truncate text-slate-200">
                {p.name}{' '}
                <span className="text-xs text-slate-500">
                  {p.position} · {p.year}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-xs text-slate-400">
                grade {p.grade.toFixed(0)} ·{' '}
                <span style={{ color: DOT[p.bars] }}>{p.ratio.toFixed(1)}×</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Did high scouting grades become NFL hits? Every graded, rated player plotted grade vs outcome. */
export function HitsMissesTab() {
  const [position, setPosition] = useState('ALL')
  const [year, setYear] = useState('all')
  const { data: players = [], error } = useSWR<Prospect[]>(
    '/api/prospects?draft_year=all&scope=history',
    fetcher
  )
  const { data: results } = useSWR<{
    season: number
    week: number
    outcomes: Record<string, CareerOutcome>
  }>('/api/history-outcomes', fetcher)
  const all = useMemo(
    () => (results ? toHitPoints(players, results.outcomes) : []),
    [players, results]
  )
  const years = [...new Set(all.map((p) => p.year))].sort((a, b) => b - a)
  const points = all.filter(
    (p) =>
      (position === 'ALL' || p.position === position) && (year === 'all' || String(p.year) === year)
  )
  const bands = bandSummary(points)
  const { hits, misses } = surprises(points)

  return (
    <div className="space-y-4">
      <ScoutingSectionHeader
        title="Hits and misses"
        description="Scouting grade against what each player went on to produce"
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1"
              aria-label="Position"
            >
              {['ALL', 'QB', 'RB', 'WR', 'TE'].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  aria-pressed={position === pos}
                  onClick={() => setPosition(pos)}
                  className={cn(
                    'min-h-8 rounded-lg px-3 text-xs font-medium transition-colors',
                    position === pos
                      ? 'bg-blue-400/20 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {pos === 'ALL' ? 'All' : pos}
                </button>
              ))}
            </div>
            <CompactSelect
              label="Class"
              value={year}
              onChange={setYear}
              options={[
                { value: 'all', label: 'All classes' },
                ...years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />
          </div>
        }
        secondary={
          <p className="text-xs text-slate-400">
            {points.length} graded players with a rated NFL outcome
            {results ? ` · through ${results.season} week ${results.week}` : ''} · Outcome is
            production versus players drafted at a similar rookie ADP
          </p>
        }
      />
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          History could not be loaded.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {bands.map((band) => (
          <div key={band.label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <dt className="text-xs text-slate-400">
              Graded {band.label} <span className="text-slate-600">· {band.n}</span>
            </dt>
            <dd className="mt-2 flex items-baseline gap-4">
              <span>
                <span className="text-2xl font-semibold tabular-nums text-emerald-200">
                  {pct(band.hitRate)}
                </span>
                <span className="ml-1 text-xs text-slate-400">hits</span>
              </span>
              <span>
                <span className="text-lg font-semibold tabular-nums text-rose-300">
                  {pct(band.missRate)}
                </span>
                <span className="ml-1 text-xs text-slate-400">misses</span>
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <section
        aria-label="Scouting grade versus outcome"
        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
      >
        <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: DOT[5] }} />
            Hit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: DOT[3] }} />
            On track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: DOT[1] }} />
            Miss
          </span>
          <span className="ml-auto">Dashed line: produced exactly as expected</span>
        </div>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 16, bottom: 28, left: 4 }}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="grade"
                name="Scouting grade"
                domain={[40, 100]}
                ticks={[40, 50, 60, 70, 80, 90, 100]}
                allowDataOverflow
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="#334155"
                label={{
                  value: 'Scouting grade',
                  position: 'bottom',
                  fill: '#94a3b8',
                  fontSize: 11,
                  offset: 10,
                }}
              />
              <YAxis
                type="number"
                dataKey={(p: HitPoint) => Math.min(p.ratio, MAX_RATIO)}
                name="Outcome"
                domain={[0, MAX_RATIO]}
                ticks={[0, 0.5, 1, 1.5, 2, 3]}
                tickFormatter={(v: number) => `${v}×`}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="#334155"
                width={40}
              />
              <ReferenceLine y={1} stroke="#64748b" strokeDasharray="4 4" />
              <Tooltip content={<PointTooltip />} cursor={{ stroke: '#334155' }} />
              <Scatter data={points} isAnimationActive={false}>
                {points.map((p) => (
                  <Cell key={p.id} fill={DOT[p.bars]} fillOpacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <SurpriseList
          title="Biggest hits below the median grade"
          tone="text-emerald-200"
          players={hits}
        />
        <SurpriseList
          title="Biggest misses at or above the median grade"
          tone="text-rose-300"
          players={misses}
        />
      </div>
    </div>
  )
}
