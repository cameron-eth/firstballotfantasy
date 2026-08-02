'use client'

import { useMemo, useState } from 'react'
import { Compass, LayoutGrid, List as ListIcon } from 'lucide-react'
import {
  COMPETITIVE_STATES,
  type CompetitiveStateKey,
  type LeaguePlacements,
} from './competitiveState'
import type { TeamData } from './types'

type SortKey = 'now' | 'future'

// Plot geometry (SVG user units).
const X0 = 34
const X1 = 248
const Y0 = 14 // top
const Y1 = 206 // bottom

const fx = (now: number) => X0 + (now / 100) * (X1 - X0)
const fy = (future: number) => Y1 - (future / 100) * (Y1 - Y0)

function clamp(value: number, min: number, max: number): number {
  return min <= max ? Math.min(Math.max(value, min), max) : (min + max) / 2
}

// Which quadrant label sits where. The median divider (mx/my) moves based on the
// league's actual data, so each label is centered within its own quadrant's real
// bounds rather than pinned to the plot's absolute corners — otherwise a skewed
// median leaves labels sitting outside the region they're supposed to name.
const CORNER_DEFS: Array<{ key: CompetitiveStateKey; vertical: 'top' | 'bottom'; side: 'left' | 'right' }> = [
  { key: 'rebuild', vertical: 'top', side: 'left' },
  { key: 'juggernaut', vertical: 'top', side: 'right' },
  { key: 'purgatory', vertical: 'bottom', side: 'left' },
  { key: 'contender', vertical: 'bottom', side: 'right' },
]

function cornerLayout(mx: number, my: number) {
  return CORNER_DEFS.map((c) => ({
    ...c,
    x:
      c.side === 'left'
        ? clamp((X0 + mx) / 2, X0 + 4, mx - 4)
        : clamp((mx + X1) / 2, mx + 4, X1 - 4),
    y: c.vertical === 'top' ? Y0 + 11 : Y1 - 5,
  }))
}

interface CompetitiveStateMapProps {
  placements: LeaguePlacements
  teams: TeamData[]
  selectedRosterId: number
}

export function CompetitiveStateMap({
  placements,
  teams,
  selectedRosterId,
}: CompetitiveStateMapProps) {
  const [view, setView] = useState<'map' | 'list'>('list')
  const [sortKey, setSortKey] = useState<SortKey>('now')

  const teamName = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? ''

  const ranked = useMemo(() => {
    return Object.values(placements.placements).sort((a, b) =>
      sortKey === 'now' ? b.nowScore - a.nowScore : b.futureScore - a.futureScore
    )
  }, [placements.placements, sortKey])

  const selected = placements.placements[selectedRosterId]
  if (!selected) return null

  const meta = COMPETITIVE_STATES[selected.state]
  const mx = fx(placements.nowMedian)
  const my = fy(placements.futureMedian)
  const corners = cornerLayout(mx, my)

  // Render non-selected dots first, selected last so it sits on top.
  const others = Object.values(placements.placements).filter(
    (p) => p.rosterId !== selectedRosterId
  )

  return (
    <div
      className="rounded-lg px-4 py-3 border bg-slate-900/40"
      style={{ borderColor: `${meta.accent}40` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Compass className="h-3 w-3" style={{ color: meta.accent }} />
        <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">
          Franchise Outlook
        </span>
        <span className="text-slate-600 text-[10px]">· relative to league</span>

        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-slate-800/60 p-0.5 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setView('map')}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase transition-colors ${
              view === 'map' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutGrid className="h-2.5 w-2.5" /> Map
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase transition-colors ${
              view === 'list' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ListIcon className="h-2.5 w-2.5" /> List
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[24px_1fr_auto_auto_auto] gap-2 px-2 text-[9px] font-mono uppercase text-slate-500">
            <span>#</span>
            <span>Team</span>
            <button
              type="button"
              onClick={() => setSortKey('now')}
              className={`text-right hover:text-slate-300 ${sortKey === 'now' ? 'text-slate-300' : ''}`}
            >
              Win-Now {sortKey === 'now' ? '▾' : ''}
            </button>
            <button
              type="button"
              onClick={() => setSortKey('future')}
              className={`text-right hover:text-slate-300 ${sortKey === 'future' ? 'text-slate-300' : ''}`}
            >
              Future {sortKey === 'future' ? '▾' : ''}
            </button>
            <span className="text-right">Age</span>
          </div>
          <div className="divide-y divide-slate-800">
            {ranked.map((p, idx) => {
              const isSelected = p.rosterId === selectedRosterId
              const rowMeta = COMPETITIVE_STATES[p.state]
              return (
                <div
                  key={p.rosterId}
                  className={`grid grid-cols-[24px_1fr_auto_auto_auto] items-center gap-2 rounded px-2 py-1.5 ${
                    isSelected ? 'bg-slate-800/80 ring-1 ring-inset' : ''
                  }`}
                  style={isSelected ? { boxShadow: `inset 0 0 0 1px ${rowMeta.accent}66` } : undefined}
                >
                  <span className="text-slate-500 text-[10px] font-mono tabular-nums">{idx + 1}</span>
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rowMeta.accent }}
                    />
                    <span
                      className={`text-xs truncate ${isSelected ? 'font-semibold text-slate-100' : 'text-slate-400'}`}
                    >
                      {teamName(p.rosterId)}
                    </span>
                    <span
                      className="text-[9px] font-mono uppercase flex-shrink-0"
                      style={{ color: rowMeta.accent }}
                    >
                      {rowMeta.label}
                    </span>
                  </div>
                  <span className="text-slate-300 text-xs font-mono tabular-nums text-right">
                    {p.nowScore}
                  </span>
                  <span className="text-slate-300 text-xs font-mono tabular-nums text-right">
                    {p.futureScore}
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono tabular-nums text-right">
                    {p.avgAge > 0 ? p.avgAge.toFixed(1) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* ── Quadrant map ── */}
        <div className="w-full md:w-[58%] flex-shrink-0">
          <svg viewBox="0 0 262 224" className="w-full" role="img" aria-label="Competitive state map">
            {/* Quadrant tints */}
            <rect x={X0} y={Y0} width={mx - X0} height={my - Y0} fill={COMPETITIVE_STATES.rebuild.accent} opacity={0.05} />
            <rect x={mx} y={Y0} width={X1 - mx} height={my - Y0} fill={COMPETITIVE_STATES.juggernaut.accent} opacity={0.06} />
            <rect x={X0} y={my} width={mx - X0} height={Y1 - my} fill={COMPETITIVE_STATES.purgatory.accent} opacity={0.05} />
            <rect x={mx} y={my} width={X1 - mx} height={Y1 - my} fill={COMPETITIVE_STATES.contender.accent} opacity={0.05} />

            {/* Plot border */}
            <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke="#334155" strokeWidth={1} rx={3} />

            {/* Median crosshair */}
            <line x1={mx} y1={Y0} x2={mx} y2={Y1} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
            <line x1={X0} y1={my} x2={X1} y2={my} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

            {/* Corner labels — centered within each quadrant's actual (median-split) bounds */}
            {corners.map((c) => (
              <text
                key={c.key}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                className="font-mono"
                fontSize={7}
                fill={COMPETITIVE_STATES[c.key].accent}
                opacity={selected.state === c.key ? 0.95 : 0.45}
                fontWeight={selected.state === c.key ? 700 : 400}
              >
                {COMPETITIVE_STATES[c.key].label.toUpperCase()}
              </text>
            ))}

            {/* Other teams */}
            {others.map((p) => (
              <circle
                key={p.rosterId}
                cx={fx(p.nowScore)}
                cy={fy(p.futureScore)}
                r={3}
                fill={COMPETITIVE_STATES[p.state].accent}
                opacity={0.45}
              >
                <title>{`${teamName(p.rosterId)} · ${COMPETITIVE_STATES[p.state].label}`}</title>
              </circle>
            ))}

            {/* Selected team */}
            <circle cx={fx(selected.nowScore)} cy={fy(selected.futureScore)} r={7} fill="none" stroke={meta.accent} strokeWidth={1.5} opacity={0.5}>
              <title>{`${teamName(selectedRosterId)} · ${meta.label}`}</title>
            </circle>
            <circle cx={fx(selected.nowScore)} cy={fy(selected.futureScore)} r={4.5} fill={meta.accent} stroke="#0f172a" strokeWidth={1.5}>
              <title>{`${teamName(selectedRosterId)} · ${meta.label}`}</title>
            </circle>

            {/* Axis labels */}
            <text x={(X0 + X1) / 2} y={Y1 + 14} textAnchor="middle" className="font-mono" fontSize={7} fill="#64748b">
              WIN-NOW VALUE →
            </text>
            <text x={11} y={(Y0 + Y1) / 2} textAnchor="middle" className="font-mono" fontSize={7} fill="#64748b" transform={`rotate(-90 11 ${(Y0 + Y1) / 2})`}>
              FUTURE / YOUTH →
            </text>
          </svg>
        </div>

        {/* ── State readout (the "why" + scores; the headline state lives in the header) ── */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
            <span className="text-slate-500 text-[9px] font-mono uppercase tracking-wider">
              What it means
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed mb-3">{meta.description}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/60 rounded-md px-2.5 py-1.5 border border-slate-700/50">
              <div className="text-slate-500 text-[9px] font-mono uppercase">Win-Now</div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-200 text-sm font-bold font-mono">{selected.nowScore}</span>
                <span className="text-slate-600 text-[9px] font-mono">/100</span>
                <span className={`text-[9px] font-mono ml-auto ${selected.nowScore >= placements.nowMedian ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {selected.nowScore >= placements.nowMedian ? 'above' : 'below'} med
                </span>
              </div>
            </div>
            <div className="bg-slate-900/60 rounded-md px-2.5 py-1.5 border border-slate-700/50">
              <div className="text-slate-500 text-[9px] font-mono uppercase">Future</div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-200 text-sm font-bold font-mono">{selected.futureScore}</span>
                <span className="text-slate-600 text-[9px] font-mono">/100</span>
                <span className="text-slate-600 text-[9px] font-mono ml-auto">
                  {selected.avgAge > 0 ? `${selected.avgAge.toFixed(1)}y core` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
