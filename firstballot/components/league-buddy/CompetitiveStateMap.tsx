'use client'

import { Compass } from 'lucide-react'
import {
  COMPETITIVE_STATES,
  type CompetitiveStateKey,
  type LeaguePlacements,
} from './competitiveState'
import type { TeamData } from './types'

// Plot geometry (SVG user units).
const X0 = 34
const X1 = 248
const Y0 = 14 // top
const Y1 = 206 // bottom

const fx = (now: number) => X0 + (now / 100) * (X1 - X0)
const fy = (future: number) => Y1 - (future / 100) * (Y1 - Y0)

// Which quadrant label sits in each corner.
const CORNERS: Array<{ key: CompetitiveStateKey; x: number; y: number; anchor: 'start' | 'end' }> = [
  { key: 'rebuild', x: X0 + 4, y: Y0 + 11, anchor: 'start' },
  { key: 'juggernaut', x: X1 - 4, y: Y0 + 11, anchor: 'end' },
  { key: 'purgatory', x: X0 + 4, y: Y1 - 5, anchor: 'start' },
  { key: 'contender', x: X1 - 4, y: Y1 - 5, anchor: 'end' },
]

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
  const selected = placements.placements[selectedRosterId]
  if (!selected) return null

  const meta = COMPETITIVE_STATES[selected.state]
  const mx = fx(placements.nowMedian)
  const my = fy(placements.futureMedian)

  const teamName = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? ''

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
      </div>

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

            {/* Corner labels */}
            {CORNERS.map((c) => (
              <text
                key={c.key}
                x={c.x}
                y={c.y}
                textAnchor={c.anchor}
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
    </div>
  )
}
