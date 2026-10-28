'use client'
import { ArrowRight } from 'lucide-react'
import { pickLabel } from '@/lib/picks-overview'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { TeamData } from '../types'
import { PickChip } from '../ui/PickChip'
import { usePickCapital, type PickCapitalDraftOrder } from '../usePickCapital'

/** The next draft's picks with their projected slots; later years live on the Picks tab. */
export function NextDraftPanel({
  leagueId,
  teams,
  team,
  draftOrder,
  onOpen,
}: {
  leagueId: string
  teams: TeamData[]
  team: TeamData
  draftOrder: PickCapitalDraftOrder
  onOpen: () => void
}) {
  const { years, slotsFor, hasProjection, isLoading, error } = usePickCapital(
    leagueId,
    teams,
    team.rosterId,
    draftOrder
  )
  const next = years[0]
  const teamName = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? `Team ${rosterId}`
  if (error) return null
  return (
    <section aria-label="Next draft picks" className="min-w-0">
      <SectionHeader
        title={next ? `${next.season} draft picks` : 'Draft picks'}
        subtitle={hasProjection ? 'Slots by projected order' : 'Slots by record'}
        actions={
          <Button variant="tint" size="xs" onClick={onOpen}>
            All picks
            <ArrowRight aria-hidden />
          </Button>
        }
      />
      <div className="rounded-xl border border-line/60 bg-surface/40 p-3">
        {isLoading ? (
          <div className="space-y-2">
            {['a', 'b', 'c'].map((k) => (
              <Skeleton key={k} className="h-7 rounded-md bg-surface/60" />
            ))}
          </div>
        ) : next?.owned.length ? (
          <ul className="divide-y divide-line/40">
            {next.owned.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                <PickChip label={pickLabel(p, slotsFor(next.season))} />
                <span className="truncate text-xs text-slate-400">
                  {p.roster_id === team.rosterId ? 'Own pick' : `Via ${teamName(p.roster_id)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-slate-400">No picks in the next draft.</p>
        )}
      </div>
    </section>
  )
}
