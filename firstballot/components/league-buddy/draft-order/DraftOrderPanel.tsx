'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SELECTED_ROW } from '@/lib/design/tones'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PickChip } from '../ui/PickChip'
import type { TeamData } from '../types'
import type { MaxPointsForEntry } from './maxPointsFor'
import {
  alternateMetric,
  buildDraftOrder,
  formatGap,
  formatRecord,
  METRIC_LABELS,
  type DraftOrderMetric,
  type DraftOrderRow,
} from './draftOrderBoard'
import { basisReady, defaultDraftSlotBasis } from '@/lib/league-metrics/draft-slots'

interface DraftOrderPanelProps {
  teams: TeamData[]
  maxPointsFor: Record<number, MaxPointsForEntry>
  /** rosterId → projected season-end Max PF. */
  projectedMaxPointsFor: Record<number, number>
  /** rosterId → projected lineup points per remaining week (0 without projections). */
  projectedPerWeek: Record<number, number>
  /** Regular-season weeks that have been scored; 0 means Max PF has no data yet. */
  weeksCounted: number
  /** Regular-season weeks still to play. */
  remainingWeeks: number
  /** The season these totals cover, shown so the board can't be read as last year's. */
  season: string
  loading: boolean
  /** Opens on this basis instead of the league's default (lib/league-metrics/draft-slots). */
  initialMetric?: DraftOrderMetric
  selectedRosterId: number
}

const METRICS: DraftOrderMetric[] = ['record', 'maxpf', 'projected']

interface NumericColumn {
  label: string
  render: (row: DraftOrderRow) => string
  /** The column the board is currently sorted by. */
  emphasis?: boolean
}

/**
 * Three numeric columns, always — which three depends on the view.
 *
 * The projected board drops Record rather than adding a fourth column: at the width
 * this panel renders on a phone a fourth number overflows, and record is the least
 * relevant number next to a projected finish.
 */
function columnsFor(
  metric: DraftOrderMetric,
  maxPfReady: boolean,
  projectedReady: boolean
): NumericColumn[] {
  const altLabel = `By ${METRIC_LABELS[alternateMetric(metric)]}`
  const maxPf: NumericColumn = {
    label: 'Max PF',
    render: (row) => (maxPfReady && row.maxPointsFor != null ? row.maxPointsFor.toFixed(1) : '—'),
    emphasis: metric === 'maxpf',
  }
  const alternate = alternateMetric(metric)
  const altReady =
    alternate === 'maxpf' ? maxPfReady : alternate === 'projected' ? projectedReady : true
  // A comparison slot from incomplete data would be a guess, so it reads '—'.
  const comparison: NumericColumn = {
    label: altLabel,
    render: (row) => (altReady ? row.altLabel : '—'),
  }

  if (metric === 'projected') {
    return [
      maxPf,
      {
        label: 'Proj',
        render: (row) =>
          projectedReady && row.projectedMaxPointsFor != null
            ? row.projectedMaxPointsFor.toFixed(0)
            : '—',
        emphasis: true,
      },
      comparison,
    ]
  }

  return [
    {
      label: 'Rec',
      render: (row) => formatRecord(row.wins, row.losses, row.ties),
      emphasis: metric === 'record',
    },
    maxPf,
    comparison,
  ]
}

export function DraftOrderPanel({
  teams,
  maxPointsFor,
  projectedMaxPointsFor,
  weeksCounted,
  remainingWeeks,
  season,
  loading,
  projectedPerWeek,
  initialMetric,
  selectedRosterId,
}: DraftOrderPanelProps) {
  const inputs = {
    maxPointsFor,
    projectedMaxPointsFor,
    projectedPerWeek,
    weeksCounted,
    remainingWeeks,
    loading,
  }
  // Until the viewer picks a basis the board follows the league default, so it shows the
  // same slots as the capital cards above it.
  const [chosen, setMetric] = useState<DraftOrderMetric | undefined>(initialMetric)
  const metric = chosen ?? defaultDraftSlotBasis(teams, inputs)

  const rows = useMemo(
    () => buildDraftOrder(teams, maxPointsFor, projectedMaxPointsFor, metric),
    [teams, maxPointsFor, projectedMaxPointsFor, metric]
  )

  // Max PF needs at least one scored week to mean anything; until then every team
  // sits at zero and the board would be an arbitrary shuffle presented as a race.
  const maxPfReady = basisReady('maxpf', teams, inputs)
  const projectedReady = basisReady('projected', teams, inputs)
  const unready =
    !loading && ((metric === 'maxpf' && !maxPfReady) || (metric === 'projected' && !projectedReady))

  const leader = rows[0]
  const mine = rows.find((row) => row.rosterId === selectedRosterId)
  const columns = columnsFor(metric, maxPfReady, projectedReady)
  // Before any game is decided every team is 0-0, so the record board is really just
  // the points-scored tiebreaker. Say so rather than letting it read as a projection.
  const noGamesDecided = rows.every((row) => row.wins + row.losses + row.ties === 0)

  return (
    <section aria-label="Draft order">
      <SectionHeader
        title="Draft order"
        subtitle={
          leader && !loading && !unready
            ? mine?.pick === 1
              ? 'You hold the 1.01'
              : mine
                ? `You pick ${mine.label}, ${formatGap(mine, metric)} from the 1.01 (${leader.teamName})`
                : `${leader.teamName} holds the 1.01`
            : 'Race to the 1.01'
        }
        actions={
          <SegmentedControl
            label="Draft order basis"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
          />
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line/60 py-8 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Scoring every lineup…
        </div>
      ) : unready ? (
        <div className="rounded-xl border border-dashed border-line/60 py-8 text-center text-sm text-slate-400">
          {metric === 'maxpf'
            ? 'Max PF unlocks once Week 1 scores post.'
            : 'Projections are still loading.'}
        </div>
      ) : (
        <>
          {metric === 'record' && noGamesDecided && (
            <p className="mb-2 text-xs text-slate-400">
              No games decided yet, so this order is the points-scored tiebreak.
            </p>
          )}
          <Table region="Draft order board" containerClassName="rounded-xl border border-line/60">
            <TableHeader className="[&_tr]:border-line/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 w-20 px-3 text-xs text-slate-400">Pick</TableHead>
                <TableHead className="h-10 px-3 text-xs text-slate-400">Team</TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={column.label}
                    numeric
                    className={cn(
                      'h-10 whitespace-nowrap px-3 text-xs',
                      column.emphasis ? 'text-white' : 'text-slate-400'
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="hidden h-10 w-40 px-3 text-xs text-slate-400 md:table-cell">
                  Race
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isMine = row.rosterId === selectedRosterId
                const holdsPick = row.pick === 1
                // A three-slot move between the two orderings is the interesting
                // signal: it means the two measures disagree about this team.
                const swung = Math.abs(row.altPick - row.pick) >= 3
                return (
                  <TableRow
                    key={row.rosterId}
                    className={cn(
                      'border-line/40',
                      isMine ? SELECTED_ROW : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <TableCell className="px-3 py-2">
                      <PickChip label={row.label} />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span
                        className={cn(
                          'block truncate text-sm',
                          isMine ? 'font-semibold text-white' : 'text-slate-200'
                        )}
                      >
                        {row.teamName}
                      </span>
                      <span className="block text-2xs tabular-nums text-slate-500">
                        {holdsPick ? 'Holds the pick' : formatGap(row, metric)}
                      </span>
                    </TableCell>
                    {columns.map((column, index) => {
                      const isComparison = index === columns.length - 1
                      return (
                        <TableCell
                          key={column.label}
                          numeric
                          className={cn(
                            'whitespace-nowrap px-3 py-2 text-sm',
                            column.emphasis
                              ? 'font-semibold text-white'
                              : isComparison && swung
                                ? 'font-semibold text-warning'
                                : 'text-slate-400'
                          )}
                        >
                          {column.render(row)}
                        </TableCell>
                      )
                    })}
                    <TableCell className="hidden px-3 py-2 md:table-cell">
                      {/* How close this team is to the 1.01 under the active metric. */}
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            holdsPick ? 'bg-pick' : 'bg-pick/40'
                          )}
                          style={{ width: `${Math.max(0, Math.min(1, row.raceShare)) * 100}%` }}
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <p className="mt-2 text-2xs text-slate-500">
            {metric === 'projected' ? (
              <>
                Season-end Max PF: what&apos;s already banked plus {remainingWeeks} projected{' '}
                {remainingWeeks === 1 ? 'week' : 'weeks'} of each roster&apos;s best lineup.
                Projected ceilings read about 5% under realized ones, so they&apos;re scaled to
                match; the estimate firms up as real weeks replace projected ones.
              </>
            ) : (
              <>
                Max PF is what each roster <em>would</em> have scored starting its best lineup every
                week, so benching your starters doesn&apos;t move it. The &ldquo;By{' '}
                {METRIC_LABELS[alternateMetric(metric)]}&rdquo; column is where each team would pick
                under the other rule; orange marks a swing of three slots or more.
                {maxPfReady && (
                  <>
                    {' '}
                    Through {weeksCounted} {weeksCounted === 1 ? 'week' : 'weeks'}
                    {season ? ` of ${season}` : ''}.
                  </>
                )}
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}
