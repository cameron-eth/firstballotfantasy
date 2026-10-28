'use client'
import { useMemo, useState } from 'react'
import type { TeamData } from './types'
import { formatRecord } from './draft-order/draftOrderBoard'
import { draftSlots, type DraftSlotInputs } from '@/lib/league-metrics/draft-slots'
import { useStandingsOdds } from './useStandingsOdds'
import { recordOrder } from './utils'
import { cn } from '@/lib/utils'
import { SELECTED_ROW, STICKY_HOVER, STICKY_SELECTED, probabilityText } from '@/lib/design/tones'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GradeBadge } from './ui/Badge'
import { PickChip } from './ui/PickChip'
import { TeamIdentity } from './ui/TeamIdentity'
export function LeagueStandingsSection({
  teams,
  selectedTeam,
  onTeamSelect,
  leagueId,
  isDynasty,
  draftOrder,
}: {
  teams: TeamData[]
  selectedTeam: TeamData
  onTeamSelect: (team: TeamData) => void
  leagueId: string
  isDynasty: boolean
  draftOrder: DraftSlotInputs & { season: string }
}) {
  const [sort, setSort] = useState<'record' | 'maxpf' | 'projected' | 'odds'>('record')
  const { data, error, retry, odds } = useStandingsOdds(leagueId, teams)
  // Each column names its basis; readiness comes from the shared draft-slot policy.
  const maxPf = useMemo(() => draftSlots(teams, draftOrder, 'maxpf'), [teams, draftOrder])
  const projectedSlots = useMemo(
    () => draftSlots(teams, draftOrder, 'projected'),
    [teams, draftOrder]
  )
  const draft = maxPf.rows
  const projected = projectedSlots.rows
  const record = recordOrder(teams)
  const probability = (id: number) => odds.find((o) => o.rosterId === id)?.playoffProbability
  const rows = [...record].sort((a, b) =>
    sort === 'odds'
      ? (probability(b.rosterId) ?? -1) - (probability(a.rosterId) ?? -1)
      : sort === 'maxpf'
        ? (draft.find((r) => r.rosterId === a.rosterId)?.pick ?? 99) -
          (draft.find((r) => r.rosterId === b.rosterId)?.pick ?? 99)
        : sort === 'projected'
          ? (projected.find((r) => r.rosterId === a.rosterId)?.pick ?? 99) -
            (projected.find((r) => r.rosterId === b.rosterId)?.pick ?? 99)
          : 0
  )
  const columnFor = {
    record: 'record',
    maxpf: 'maxpfSlot',
    projected: 'projectedSlot',
    odds: 'odds',
  }
  const active = columnFor[sort]
  // The first column of each group carries a divider, so the groups read in the body too.
  const groupStart = isDynasty ? ['record', 'maxpf', 'projected', 'odds'] : []
  const divider = (column: string) => groupStart.includes(column) && 'border-l border-line/60'
  const head = (column: string) =>
    cn(
      'h-10 whitespace-nowrap px-3 text-xs',
      divider(column),
      active === column ? 'text-white' : 'text-slate-400'
    )
  const cell = (column: string, secondary = false) =>
    cn(
      'whitespace-nowrap px-3 py-2.5 text-sm',
      divider(column),
      active === column
        ? 'font-semibold text-white'
        : secondary
          ? 'text-slate-400'
          : 'text-slate-200'
    )
  const group = 'h-8 border-l border-line/60 px-3 text-left text-2xs font-medium text-slate-500'
  const sortOptions: SegmentedOption<typeof sort>[] = [
    { value: 'record', label: 'Record' },
    ...(isDynasty
      ? ([
          { value: 'maxpf', label: 'Race to 1.01' },
          { value: 'projected', label: 'Projected draft' },
        ] as SegmentedOption<typeof sort>[])
      : []),
    { value: 'odds', label: 'Playoff odds' },
  ]
  return (
    <section aria-label="League standings and draft race">
      <SectionHeader
        title="Standings"
        subtitle={`${teams.length} teams${data ? ` · ${data.spots} make the playoffs` : ''}`}
        actions={
          <SegmentedControl
            label="Standings sort"
            options={sortOptions}
            value={sort}
            onChange={setSort}
          />
        }
      />
      <Table
        region="Unified standings table"
        containerClassName="max-h-[70dvh] rounded-xl border border-line/60"
      >
        <TableHeader className="sticky top-0 z-[2] bg-background [&_tr]:border-line/60">
          {isDynasty && (
            <TableRow className="hover:bg-transparent">
              <TableHead sticky className="h-8" />
              <TableHead colSpan={2} className={group}>
                Season
              </TableHead>
              <TableHead colSpan={3} className={group}>
                Race to 1.01
              </TableHead>
              <TableHead colSpan={2} className={group}>
                Projection
              </TableHead>
              <TableHead colSpan={2} className={group}>
                Outlook
              </TableHead>
            </TableRow>
          )}
          <TableRow className="hover:bg-transparent">
            <TableHead sticky className={cn(head('team'), 'w-44 sm:w-full sm:min-w-56')}>
              Team
            </TableHead>
            <TableHead numeric className={head('record')}>
              Record
            </TableHead>
            <TableHead numeric className={head('pf')}>
              PF
            </TableHead>
            {isDynasty && (
              <>
                <TableHead numeric className={head('maxpf')}>
                  MaxPF
                </TableHead>
                <TableHead className={head('maxpfSlot')}>Slot</TableHead>
                <TableHead numeric className={head('gap')}>
                  Gap
                </TableHead>
                <TableHead numeric className={head('projected')}>
                  MaxPF
                </TableHead>
                <TableHead className={head('projectedSlot')}>Slot</TableHead>
              </>
            )}
            <TableHead numeric className={head('odds')}>
              Playoffs
            </TableHead>
            <TableHead className={head('grade')}>Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const d = draft.find((r) => r.rosterId === t.rosterId),
              p = projected.find((r) => r.rosterId === t.rosterId),
              prob = probability(t.rosterId),
              selected = selectedTeam.rosterId === t.rosterId,
              gap = d && draft[0] ? d.maxPointsFor - draft[0].maxPointsFor : null
            return (
              <TableRow
                key={t.rosterId}
                data-selected={selected}
                className={cn(
                  'group border-line/40',
                  selected ? SELECTED_ROW : 'hover:bg-white/[0.03]'
                )}
              >
                <TableCell
                  sticky
                  className={cn(
                    'max-w-44 px-3 py-2 sm:max-w-none',
                    selected ? STICKY_SELECTED : STICKY_HOVER
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onTeamSelect(t)}
                    className="flex w-full min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
                  >
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {record.findIndex((x) => x.rosterId === t.rosterId) + 1}
                    </span>
                    <TeamIdentity
                      teamName={t.teamName}
                      ownerName={t.ownerUsername || t.ownerName}
                      avatarId={t.ownerAvatar}
                      tag={selected ? 'Viewing' : undefined}
                    />
                  </button>
                </TableCell>
                <TableCell numeric className={cell('record')}>
                  {formatRecord(t.wins, t.losses, t.ties ?? 0)}
                </TableCell>
                <TableCell numeric className={cell('pf')}>
                  {t.pointsFor.toFixed(1)}
                </TableCell>
                {isDynasty && (
                  <>
                    <TableCell numeric className={cell('maxpf', true)}>
                      {d?.maxPointsFor.toFixed(1) ?? '—'}
                    </TableCell>
                    <TableCell className={cell('maxpfSlot')}>
                      {d ? <PickChip label={d.label} /> : '—'}
                    </TableCell>
                    <TableCell numeric className={cell('gap', true)}>
                      {gap == null ? '—' : gap === 0 ? 'Leads' : `+${gap.toFixed(1)}`}
                    </TableCell>
                    <TableCell numeric className={cell('projected', true)}>
                      {p?.projectedMaxPointsFor.toFixed(1) ?? '—'}
                    </TableCell>
                    <TableCell className={cell('projectedSlot')}>
                      {p ? <PickChip label={p.label} /> : '—'}
                    </TableCell>
                  </>
                )}
                <TableCell
                  numeric
                  className={cn(cell('odds'), prob != null && probabilityText(prob))}
                >
                  {prob == null ? '—' : `${prob.toFixed(1)}%`}
                </TableCell>
                <TableCell className={cell('grade')}>
                  <GradeBadge grade={t.grade} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {error && (
        <button onClick={() => retry()} className="mt-2 text-xs text-warning">
          Playoff odds unavailable · Retry
        </button>
      )}
      <p className="mt-2 text-2xs text-slate-500">
        {isDynasty
          ? `MaxPF through ${draftOrder.weeksCounted} weeks of ${draftOrder.season}. Slots follow original rosters, not traded-pick ownership. Projected MaxPF is the shared planning baseline; league playoff/draft rules can change final order. `
          : ''}
        {data
          ? `${data.spots} playoff spots · ${data.completed}/${data.end} completed weeks · 10,000 simulations. Division seeding and custom tiebreakers can change odds.`
          : 'Loading playoff settings…'}
      </p>
    </section>
  )
}
