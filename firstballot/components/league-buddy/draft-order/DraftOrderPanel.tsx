'use client'

import { useMemo, useState } from 'react'
import { Gavel, Crown, Loader2 } from 'lucide-react'
import type { TeamData } from '../types'
import type { MaxPointsForEntry } from './maxPointsFor'
import { buildDraftOrder, formatGap, formatRecord, type DraftOrderMetric } from './draftOrderBoard'

const ACCENT = '#fbbf24' // yellow-400, the app's draft-capital accent

interface DraftOrderPanelProps {
  teams: TeamData[]
  maxPointsFor: Record<number, MaxPointsForEntry>
  /** Regular-season weeks that have been scored; 0 means Max PF has no data yet. */
  weeksCounted: number
  /** The season these totals cover, shown so the board can't be read as last year's. */
  season: string
  loading: boolean
  selectedRosterId: number
}

const METRICS: Array<{ key: DraftOrderMetric; label: string }> = [
  { key: 'record', label: 'Record' },
  { key: 'maxpf', label: 'Max PF' },
]

export function DraftOrderPanel({
  teams,
  maxPointsFor,
  weeksCounted,
  season,
  loading,
  selectedRosterId,
}: DraftOrderPanelProps) {
  const [metric, setMetric] = useState<DraftOrderMetric>('record')

  const rows = useMemo(
    () => buildDraftOrder(teams, maxPointsFor, metric),
    [teams, maxPointsFor, metric]
  )

  // Max PF needs at least one scored week to mean anything; until then every team
  // sits at zero and the board would be an arbitrary shuffle presented as a race.
  const maxPfReady = weeksCounted > 0
  const showingUnreadyMaxPf = metric === 'maxpf' && !maxPfReady && !loading

  const leader = rows[0]
  const mine = rows.find((row) => row.rosterId === selectedRosterId)
  // Before any game is decided every team is 0-0, so the record board is really just
  // the points-scored tiebreaker. Say so rather than letting it read as a projection.
  const noGamesDecided = rows.every((row) => row.wins + row.losses + row.ties === 0)
  const altMetricName = metric === 'maxpf' ? 'Record' : 'Max PF'

  return (
    <div
      className="rounded-lg px-4 py-3 border bg-slate-900/40"
      style={{ borderColor: `${ACCENT}40` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gavel className="h-3 w-3" style={{ color: ACCENT }} />
        <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">
          Draft Order
        </span>
        <span className="text-slate-600 text-[10px]">· race to the 1.01</span>

        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-slate-800/60 p-0.5 border border-slate-700/50">
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetric(option.key)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase transition-colors ${
                metric === option.key
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center text-slate-500 text-xs font-mono">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Scoring every lineup…
        </div>
      ) : showingUnreadyMaxPf ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          Max PF unlocks once Week 1 scores post.
        </div>
      ) : (
        <>
          {/* ── Who holds the pick, and where you sit ── */}
          {leader && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-slate-800/40 px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Crown className="h-3 w-3 flex-shrink-0" style={{ color: ACCENT }} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  1.01
                </span>
                <span className="text-xs font-semibold text-slate-100 truncate">
                  {leader.teamName}
                </span>
              </div>
              {mine && (
                <div className="text-[11px] text-slate-400 ml-auto">
                  {mine.pick === 1 ? (
                    <span style={{ color: ACCENT }}>You hold the 1.01</span>
                  ) : (
                    <>
                      You pick{' '}
                      <span className="font-mono font-semibold text-slate-200">{mine.label}</span>
                      <span className="text-slate-600"> · </span>
                      <span className="font-mono">{formatGap(mine, metric)}</span>
                      <span className="text-slate-600"> from the 1.01</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {metric === 'record' && noGamesDecided && (
            <p className="mb-2 text-[10px] text-slate-500">
              No games decided yet — this order is the points-scored tiebreak.
            </p>
          )}

          {/* ── Full board ── */}
          <div className="space-y-2">
            <div className="grid grid-cols-[34px_1fr_auto_auto_auto] gap-2 px-2 text-[9px] font-mono uppercase text-slate-500">
              <span>Pick</span>
              <span>Team</span>
              <span className="text-right">Rec</span>
              <span className="text-right">Max PF</span>
              <span className="text-right">By {altMetricName}</span>
            </div>

            <div className="divide-y divide-slate-800">
              {rows.map((row) => {
                const isMine = row.rosterId === selectedRosterId
                const holdsPick = row.pick === 1
                // A three-slot move between the two orderings is the interesting
                // signal: it means record and roster ceiling disagree about this team.
                const swung = Math.abs(row.altPick - row.pick) >= 3

                return (
                  <div key={row.rosterId} className="relative">
                    {/* Spotlight the pick itself; every other row stays flat so the race
                        bar below is the only thing encoding distance. */}
                    {holdsPick && (
                      <div
                        className="absolute inset-0 rounded pointer-events-none"
                        style={{ backgroundColor: `${ACCENT}14` }}
                      />
                    )}
                    {/* Race bar: how close this team is to the 1.01 under the active metric.
                        Full width = holds the pick. Kept to a hairline at the bottom edge —
                        as a full-height fill it read as a background glitch behind the text. */}
                    <div
                      className="absolute bottom-0 left-0 h-[2px] rounded-full pointer-events-none"
                      style={{
                        width: `${Math.max(0, Math.min(1, row.raceShare)) * 100}%`,
                        backgroundColor: holdsPick ? ACCENT : `${ACCENT}4d`,
                      }}
                    />
                    <div
                      className={`relative grid grid-cols-[34px_1fr_auto_auto_auto] items-center gap-2 rounded px-2 py-1.5 ${
                        isMine ? 'bg-slate-800/60' : ''
                      }`}
                      style={isMine ? { boxShadow: `inset 0 0 0 1px ${ACCENT}66` } : undefined}
                    >
                      <span
                        className="text-[10px] font-mono tabular-nums"
                        style={{ color: holdsPick ? ACCENT : undefined }}
                      >
                        <span className={holdsPick ? 'font-bold' : 'text-slate-500'}>
                          {row.label}
                        </span>
                      </span>

                      <div className="min-w-0 flex items-center gap-1.5">
                        <span
                          className={`text-xs truncate ${
                            isMine ? 'font-semibold text-slate-100' : 'text-slate-400'
                          }`}
                        >
                          {row.teamName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 flex-shrink-0 hidden sm:inline">
                          {formatGap(row, metric)}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono tabular-nums text-right ${
                          metric === 'record' ? 'text-slate-200 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {formatRecord(row.wins, row.losses, row.ties)}
                      </span>

                      <span
                        className={`text-[10px] font-mono tabular-nums text-right w-14 ${
                          metric === 'maxpf' ? 'text-slate-200 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {maxPfReady ? row.maxPointsFor.toFixed(1) : '—'}
                      </span>

                      <span
                        className="text-[10px] font-mono tabular-nums text-right w-9"
                        style={{ color: swung ? ACCENT : undefined }}
                      >
                        <span className={swung ? '' : 'text-slate-600'}>{row.altLabel}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
            Max PF is what each roster <em>would</em> have scored starting its best lineup every
            week — benching your starters doesn&apos;t move it. The{' '}
            <span className="font-mono">By {altMetricName}</span> column is where each team would
            pick under the other rule.
            {maxPfReady && (
              <>
                {' '}
                Through {weeksCounted} {weeksCounted === 1 ? 'week' : 'weeks'}
                {season ? ` of ${season}` : ''}.
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
