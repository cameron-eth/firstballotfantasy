import { Fragment } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SELECTED_ROW, STICKY_HOVER, STICKY_SELECTED, probabilityText } from '@/lib/design/tones'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TeamData } from '../types'
import { formatRecord } from '../draft-order/draftOrderBoard'
import { TeamIdentity } from '../ui/TeamIdentity'

/** The leaders plus the selected team's neighbourhood; the full table is on Standings. */
function snapshotRows(order: TeamData[], selectedId: number) {
  const at = order.findIndex((t) => t.rosterId === selectedId)
  const keep = new Set([0, 1, 2, at - 1, at, at + 1].filter((i) => i >= 0 && i < order.length))
  return [...keep].sort((a, b) => a - b)
}

export function StandingsSnapshot({
  order,
  selectedTeam,
  maxPointsFor,
  playoffOdds,
  onOpen,
}: {
  /** Teams in league-table order. */
  order: TeamData[]
  selectedTeam: TeamData
  maxPointsFor: (rosterId: number) => number | undefined
  playoffOdds: (rosterId: number) => number | undefined
  onOpen: () => void
}) {
  const rows = snapshotRows(order, selectedTeam.rosterId)
  const head = 'h-9 whitespace-nowrap px-3 text-xs text-slate-400'
  const cell = 'whitespace-nowrap px-3 py-2 text-sm text-slate-200'
  return (
    <section aria-label="Standings snapshot" className="min-w-0">
      <SectionHeader
        title="Standings"
        actions={
          <Button variant="tint" size="xs" onClick={onOpen}>
            Full standings
            <ArrowRight aria-hidden />
          </Button>
        }
      />
      <Table region="Standings snapshot" containerClassName="rounded-xl border border-line/60">
        <TableHeader className="[&_tr]:border-line/60">
          <TableRow className="hover:bg-transparent">
            <TableHead sticky className={cn(head, 'w-44 sm:w-full')}>
              Team
            </TableHead>
            <TableHead numeric className={head}>
              Record
            </TableHead>
            <TableHead numeric className={head}>
              PF
            </TableHead>
            <TableHead numeric className={head}>
              PA
            </TableHead>
            <TableHead numeric className={head}>
              Max PF
            </TableHead>
            <TableHead numeric className={head}>
              Playoffs
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((index, i) => {
            const t = order[index]
            const selected = t.rosterId === selectedTeam.rosterId
            const odds = playoffOdds(t.rosterId)
            const maxPf = maxPointsFor(t.rosterId)
            const gap = i > 0 && index - rows[i - 1] > 1
            return (
              <Fragment key={t.rosterId}>
                {gap && (
                  <TableRow className="border-line/40 hover:bg-transparent">
                    <TableCell colSpan={6} className="px-3 py-1 text-xs text-slate-500">
                      ⋯
                    </TableCell>
                  </TableRow>
                )}
                <TableRow
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
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-500">
                        {index + 1}
                      </span>
                      <TeamIdentity
                        teamName={t.teamName}
                        avatarId={t.ownerAvatar}
                        ownerName={t.ownerName}
                      />
                    </span>
                  </TableCell>
                  <TableCell numeric className={cn(cell, 'font-semibold text-white')}>
                    {formatRecord(t.wins, t.losses, t.ties ?? 0)}
                  </TableCell>
                  <TableCell numeric className={cell}>
                    {t.pointsFor.toFixed(1)}
                  </TableCell>
                  <TableCell numeric className={cn(cell, 'text-slate-400')}>
                    {t.pointsAgainst.toFixed(1)}
                  </TableCell>
                  <TableCell numeric className={cn(cell, 'text-slate-400')}>
                    {maxPf ? maxPf.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell numeric className={cn(cell, odds != null && probabilityText(odds))}>
                    {odds == null ? '—' : `${odds.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
