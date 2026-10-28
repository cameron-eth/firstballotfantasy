'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { SELECTED_ROW, STICKY_HOVER, STICKY_SELECTED } from '@/lib/design/tones'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatTile } from '@/components/ui/stat-tile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  COMPETITIVE_STATES,
  type CompetitiveStateKey,
  type LeaguePlacements,
} from './competitiveState'
import type { TeamData } from './types'

type SortKey = 'power' | 'now' | 'future'

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
const CORNER_DEFS: Array<{
  key: CompetitiveStateKey
  vertical: 'top' | 'bottom'
  side: 'left' | 'right'
}> = [
  { key: 'rebuild', vertical: 'top', side: 'left' },
  { key: 'juggernaut', vertical: 'top', side: 'right' },
  { key: 'purgatory', vertical: 'bottom', side: 'left' },
  { key: 'contender', vertical: 'bottom', side: 'right' },
]

function cornerLayout(mx: number, _my: number) {
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
  /** Lineup-strength (power) score per roster (0–100, league best = 100). Drives the default sort. */
  powerScores: Record<number, number>
}

export function CompetitiveStateMap({
  placements,
  teams,
  selectedRosterId,
  powerScores,
}: CompetitiveStateMapProps) {
  const [view, setView] = useState<'map' | 'list'>('list')
  const [sortKey, setSortKey] = useState<SortKey>('power')

  const teamName = (rosterId: number) => teams.find((t) => t.rosterId === rosterId)?.teamName ?? ''

  const ranked = useMemo(() => {
    const score = (rosterId: number) => powerScores[rosterId] ?? 0
    return Object.values(placements.placements).sort((a, b) => {
      if (sortKey === 'now') return b.nowScore - a.nowScore
      if (sortKey === 'future') return b.futureScore - a.futureScore
      return score(b.rosterId) - score(a.rosterId)
    })
  }, [placements.placements, powerScores, sortKey])

  const selected = placements.placements[selectedRosterId]
  if (!selected) return null

  const meta = COMPETITIVE_STATES[selected.state]
  const mx = fx(placements.nowMedian)
  const my = fy(placements.futureMedian)
  const corners = cornerLayout(mx, my)

  // Render non-selected dots first, selected last so it sits on top.
  const others = Object.values(placements.placements).filter((p) => p.rosterId !== selectedRosterId)

  const head = (key: SortKey) =>
    cn('h-9 whitespace-nowrap px-3 text-xs', sortKey === key ? 'text-white' : 'text-slate-400')
  return (
    <section aria-label="Franchise outlook">
      <SectionHeader
        title="Franchise outlook"
        subtitle="Win-now value against future value, relative to the league"
        actions={
          <>
            {view === 'list' && (
              <SegmentedControl
                label="Sort outlook"
                value={sortKey}
                onChange={setSortKey}
                options={[
                  { value: 'power', label: 'Lineup' },
                  { value: 'now', label: 'Win-now' },
                  { value: 'future', label: 'Future' },
                ]}
              />
            )}
            <SegmentedControl
              label="Outlook view"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'List' },
                { value: 'map', label: 'Map' },
              ]}
            />
          </>
        }
      />

      {view === 'list' ? (
        <Table
          containerClassName="rounded-xl border border-line/60"
          region="Franchise outlook table"
        >
          <TableHeader className="[&_tr]:border-line/60">
            <TableRow className="hover:bg-transparent">
              <TableHead sticky className="h-9 px-3 text-xs text-slate-400">
                Team
              </TableHead>
              <TableHead numeric className={head('power')}>
                Lineup
              </TableHead>
              <TableHead numeric className={head('now')}>
                Win-now
              </TableHead>
              <TableHead numeric className={head('future')}>
                Future
              </TableHead>
              <TableHead numeric className="h-9 px-3 text-xs text-slate-400">
                Core age
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((p, idx) => {
              const isSelected = p.rosterId === selectedRosterId
              const rowMeta = COMPETITIVE_STATES[p.state]
              const cell = (key: SortKey) =>
                cn(
                  'px-3 py-2 text-sm',
                  sortKey === key ? 'font-semibold text-white' : 'text-slate-300'
                )
              return (
                <TableRow
                  key={p.rosterId}
                  className={cn(
                    'group border-line/40',
                    isSelected ? SELECTED_ROW : 'hover:bg-white/[0.03]'
                  )}
                >
                  <TableCell
                    sticky
                    className={cn(
                      'max-w-44 px-3 py-2 sm:max-w-none',
                      isSelected ? STICKY_SELECTED : STICKY_HOVER
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-500">
                        {idx + 1}
                      </span>
                      {/* On phones the state badge drops under the name to keep the column narrow. */}
                      <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span
                          className={cn(
                            'max-w-full truncate text-sm',
                            isSelected ? 'font-semibold text-white' : 'text-slate-200'
                          )}
                        >
                          {teamName(p.rosterId)}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-md border px-1.5 py-0.5 text-badge font-semibold leading-none',
                            rowMeta.border,
                            rowMeta.bg,
                            rowMeta.text
                          )}
                        >
                          {rowMeta.label}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell numeric className={cell('power')}>
                    {powerScores[p.rosterId] ?? '—'}
                  </TableCell>
                  <TableCell numeric className={cell('now')}>
                    {p.nowScore}
                  </TableCell>
                  <TableCell numeric className={cell('future')}>
                    {p.futureScore}
                  </TableCell>
                  <TableCell numeric className="px-3 py-2 text-sm text-slate-400">
                    {p.avgAge > 0 ? p.avgAge.toFixed(1) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line/60 bg-surface/40 p-4 md:flex-row">
          <div className="w-full flex-shrink-0 md:w-[58%]">
            <svg
              viewBox="0 0 262 224"
              className="w-full"
              role="img"
              aria-label="Competitive state map"
            >
              <rect
                x={X0}
                y={Y0}
                width={mx - X0}
                height={my - Y0}
                fill={COMPETITIVE_STATES.rebuild.accent}
                opacity={0.05}
              />
              <rect
                x={mx}
                y={Y0}
                width={X1 - mx}
                height={my - Y0}
                fill={COMPETITIVE_STATES.juggernaut.accent}
                opacity={0.06}
              />
              <rect
                x={X0}
                y={my}
                width={mx - X0}
                height={Y1 - my}
                fill={COMPETITIVE_STATES.purgatory.accent}
                opacity={0.05}
              />
              <rect
                x={mx}
                y={my}
                width={X1 - mx}
                height={Y1 - my}
                fill={COMPETITIVE_STATES.contender.accent}
                opacity={0.05}
              />
              <rect
                x={X0}
                y={Y0}
                width={X1 - X0}
                height={Y1 - Y0}
                fill="none"
                stroke="#334155"
                strokeWidth={1}
                rx={3}
              />
              <line
                x1={mx}
                y1={Y0}
                x2={mx}
                y2={Y1}
                stroke="#475569"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <line
                x1={X0}
                y1={my}
                x2={X1}
                y2={my}
                stroke="#475569"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              {corners.map((c) => (
                <text
                  key={c.key}
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  fontSize={9}
                  fill={COMPETITIVE_STATES[c.key].accent}
                  opacity={selected.state === c.key ? 0.95 : 0.5}
                  fontWeight={selected.state === c.key ? 600 : 400}
                >
                  {COMPETITIVE_STATES[c.key].label}
                </text>
              ))}
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
              <circle
                cx={fx(selected.nowScore)}
                cy={fy(selected.futureScore)}
                r={7}
                fill="none"
                stroke={meta.accent}
                strokeWidth={1.5}
                opacity={0.5}
              >
                <title>{`${teamName(selectedRosterId)} · ${meta.label}`}</title>
              </circle>
              <circle
                cx={fx(selected.nowScore)}
                cy={fy(selected.futureScore)}
                r={4.5}
                fill={meta.accent}
                stroke="#0f172a"
                strokeWidth={1.5}
              >
                <title>{`${teamName(selectedRosterId)} · ${meta.label}`}</title>
              </circle>
              <text x={(X0 + X1) / 2} y={Y1 + 15} textAnchor="middle" fontSize={9} fill="#94a3b8">
                Win-now value →
              </text>
              <text
                x={11}
                y={(Y0 + Y1) / 2}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
                transform={`rotate(-90 11 ${(Y0 + Y1) / 2})`}
              >
                Future value →
              </text>
            </svg>
          </div>
          <div className="w-full min-w-0 flex-1 space-y-3">
            <p className="text-sm text-slate-300">{meta.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Win-now"
                value={`${selected.nowScore}/100`}
                detail={
                  <span
                    className={
                      selected.nowScore >= placements.nowMedian ? 'text-positive' : 'text-negative'
                    }
                  >
                    {selected.nowScore >= placements.nowMedian ? 'Above' : 'Below'} league median
                  </span>
                }
              />
              <StatTile
                label="Future"
                value={`${selected.futureScore}/100`}
                detail={selected.avgAge > 0 ? `Core age ${selected.avgAge.toFixed(1)}` : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
