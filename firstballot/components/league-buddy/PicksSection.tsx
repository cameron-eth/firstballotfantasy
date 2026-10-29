'use client'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { SELECTED_ROW, STICKY_HOVER, STICKY_SELECTED } from '@/lib/design/tones'
import { leagueCapital, pickLabel } from '@/lib/picks-overview'
import { BASIS_PHRASE, type DraftSlotInputs } from '@/lib/league-metrics/draft-slots'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/ui/stat-tile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TeamData } from './types'
import { DraftOrderPanel } from './draft-order/DraftOrderPanel'
import { PickChip } from './ui/PickChip'
import { TeamIdentity } from './ui/TeamIdentity'
import { usePickCapital } from './usePickCapital'

/** Draft capital: your picks by year, who holds what across the league, and the draft order. */
export function PicksSection({
  teams,
  selectedTeam,
  leagueId,
  draftOrder,
  focusSeason,
}: {
  teams: TeamData[]
  selectedTeam: TeamData
  leagueId: string
  /** A draft year opened from the header summary; its card scrolls into view and is outlined. */
  focusSeason?: string | null
  draftOrder: DraftSlotInputs & { season: string }
}) {
  const { picks, years, nextSeason, slotByRoster, slotsFor, slotBasis, error, isLoading, retry } =
    usePickCapital(leagueId, teams, selectedTeam.rosterId, draftOrder)
  useEffect(() => {
    if (focusSeason && !isLoading)
      document
        .getElementById(`picks-${focusSeason}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusSeason, isLoading])
  const teamName = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? `Team ${rosterId}`
  const capital = useMemo(
    () =>
      leagueCapital(
        picks,
        teams.map((t) => t.rosterId)
      ),
    [picks, teams]
  )
  const seasons = years.map((y) => y.season)
  const owned = years.flatMap((y) => y.owned)
  const tradedAway = years.flatMap((y) => y.tradedAway)
  const firsts = owned.filter((p) => p.round === 1).length
  const nextPicks = years[0]?.owned ?? []
  const topPick = [...nextPicks].sort(
    (a, b) =>
      a.round - b.round || (slotByRoster[a.roster_id] ?? 99) - (slotByRoster[b.roster_id] ?? 99)
  )[0]

  return (
    <section aria-label="Draft picks" className="space-y-8">
      <div>
        <SectionHeader
          title="Draft capital"
          subtitle={
            nextSeason
              ? `Picks for the ${seasons.join(', ')} drafts · ${nextSeason} slots by ${BASIS_PHRASE[slotBasis]}`
              : 'Picks for the next three drafts'
          }
        />
        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line/60 px-4 py-3 text-sm text-slate-400">
            Pick ownership is unavailable right now.
            <Button variant="subtle" size="xs" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['held', 'firsts', 'top', 'away'].map((k) => (
              <Skeleton key={k} className="h-[74px] rounded-lg bg-surface/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Picks held" value={owned.length} detail="Next three drafts" />
              <StatTile
                label="First-rounders"
                value={firsts}
                valueClassName={firsts > 0 ? 'text-pick' : undefined}
              />
              <StatTile
                label={nextSeason ? `Top ${nextSeason} pick` : 'Top pick'}
                value={topPick ? pickLabel(topPick, slotByRoster) : '—'}
                detail={
                  topPick && topPick.roster_id !== selectedTeam.rosterId
                    ? `Via ${teamName(topPick.roster_id)}`
                    : `Slot by ${BASIS_PHRASE[slotBasis]}`
                }
              />
              <StatTile
                label="Traded away"
                value={tradedAway.length}
                detail={tradedAway.length ? 'Of your own picks' : 'All your own picks'}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {years.map((y) => (
                <div
                  key={y.season}
                  id={`picks-${y.season}`}
                  className={cn(
                    'scroll-mt-24 rounded-xl border bg-surface/40 p-4',
                    focusSeason === y.season ? 'border-action/60' : 'border-line/60'
                  )}
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{y.season} draft</h3>
                    <span className="text-xs text-slate-400">
                      {y.owned.length} {y.owned.length === 1 ? 'pick' : 'picks'}
                    </span>
                  </div>
                  {y.owned.length ? (
                    <div className="flex flex-wrap gap-2">
                      {y.owned.map((p) => (
                        <PickChip
                          key={p.id}
                          label={pickLabel(p, slotsFor(y.season))}
                          round={p.round}
                        >
                          {p.roster_id !== selectedTeam.rosterId
                            ? `via ${teamName(p.roster_id)}`
                            : undefined}
                        </PickChip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No picks in this draft.</p>
                  )}
                  {y.tradedAway.length > 0 && (
                    <div className="mt-3 border-t border-line/40 pt-3">
                      <div className="mb-2 text-xs text-slate-400">Traded away</div>
                      <div className="flex flex-wrap gap-2">
                        {y.tradedAway.map((p) => (
                          <PickChip
                            key={p.id}
                            label={pickLabel(p, slotsFor(y.season))}
                            round={p.round}
                            className="opacity-60"
                          >
                            {`to ${teamName(p.owner_id)}`}
                          </PickChip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-2xs text-slate-500">
              Brighter chips are earlier rounds: firsts brightest, thirds and later neutral.
            </p>
          </div>
        )}
      </div>

      {!error && !isLoading && capital.length > 0 && (
        <div>
          <SectionHeader
            title="League pick ownership"
            subtitle="Who holds the most draft capital, first-rounders first"
          />
          <Table
            region="League pick ownership"
            containerClassName="rounded-xl border border-line/60"
          >
            <TableHeader className="[&_tr]:border-line/60">
              <TableRow className="hover:bg-transparent">
                <TableHead sticky className="h-10 w-44 px-3 text-xs text-slate-400 sm:w-full">
                  Team
                </TableHead>
                {seasons.map((season) => (
                  <TableHead
                    key={season}
                    numeric
                    className="h-10 whitespace-nowrap px-3 text-xs text-slate-400"
                  >
                    {season}
                  </TableHead>
                ))}
                <TableHead numeric className="h-10 whitespace-nowrap px-3 text-xs text-white">
                  Firsts
                </TableHead>
                <TableHead numeric className="h-10 whitespace-nowrap px-3 text-xs text-slate-400">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capital.map((c) => {
                const team = teams.find((t) => t.rosterId === c.rosterId)
                const selected = c.rosterId === selectedTeam.rosterId
                return (
                  <TableRow
                    key={c.rosterId}
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
                      <TeamIdentity
                        teamName={team?.teamName ?? teamName(c.rosterId)}
                        ownerName={team?.ownerUsername || team?.ownerName}
                        avatarId={team?.ownerAvatar}
                        tag={selected ? 'Viewing' : undefined}
                      />
                    </TableCell>
                    {seasons.map((season) => {
                      const s = c.bySeason[season]
                      return (
                        <TableCell
                          key={season}
                          numeric
                          className="whitespace-nowrap px-3 py-2 text-sm text-slate-200"
                        >
                          {s?.total ?? 0}
                          {s?.firsts ? (
                            <span className="ml-1.5 text-2xs text-pick">
                              {s.firsts} {s.firsts === 1 ? 'first' : 'firsts'}
                            </span>
                          ) : null}
                        </TableCell>
                      )
                    })}
                    <TableCell
                      numeric
                      className={cn(
                        'px-3 py-2 text-sm font-semibold',
                        c.firsts > seasons.length
                          ? 'text-pick'
                          : c.firsts < seasons.length
                            ? 'text-negative'
                            : 'text-white'
                      )}
                    >
                      {c.firsts}
                    </TableCell>
                    <TableCell numeric className="px-3 py-2 text-sm text-slate-400">
                      {c.total}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="mt-2 text-2xs text-slate-500">
            A team starts with one first per draft; violet is more than that, rose is fewer.
          </p>
        </div>
      )}

      <DraftOrderPanel
        teams={teams}
        maxPointsFor={draftOrder.maxPointsFor}
        projectedMaxPointsFor={draftOrder.projectedMaxPointsFor}
        projectedPerWeek={draftOrder.projectedPerWeek}
        weeksCounted={draftOrder.weeksCounted}
        remainingWeeks={draftOrder.remainingWeeks}
        season={draftOrder.season}
        loading={draftOrder.loading}
        selectedRosterId={selectedTeam.rosterId}
      />
    </section>
  )
}
