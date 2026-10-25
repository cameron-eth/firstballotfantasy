'use client'
import useSWR from 'swr'
import type { Scenario } from '@/lib/team-scenarios'
import { assessDraftCapital, scenarioAtYear, type CapitalFit } from '@/lib/team-timeline'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { Prospect } from '@/components/scouting/types'
import type { TeamData } from '../types'
import { buildDraftOrder } from '../draft-order/draftOrderBoard'
import type { MaxPointsForEntry } from '../draft-order/maxPointsFor'
export interface TimelineDraftOrder {
  maxPointsFor: Record<number, MaxPointsForEntry>
  projectedMaxPointsFor: Record<number, number>
  season: string
  loading: boolean
}
export function useTeamTimeline({
  enabled,
  leagueId,
  team,
  teams,
  scenario,
  prospects,
  draftOrder,
}: {
  enabled: boolean
  leagueId: string
  team: TeamData
  teams: TeamData[]
  scenario: Scenario | undefined
  prospects: Prospect[]
  draftOrder?: TimelineDraftOrder
}) {
  const baseYear = Number(draftOrder?.season) || new Date().getFullYear()
  const horizon = enabled ? (scenario?.horizon ?? baseYear + 1) : baseYear
  const { data, error, isLoading } = useSWR<TradeInventory>(
    enabled ? `/api/trade-inventory?leagueId=${leagueId}` : null,
    async (url: string) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error('Draft capital unavailable')
      return r.json()
    }
  )
  const complete =
    !!draftOrder &&
    !draftOrder.loading &&
    teams.length > 1 &&
    teams.every(
      (t) =>
        Number.isFinite(draftOrder.projectedMaxPointsFor[t.rosterId]) &&
        draftOrder.projectedMaxPointsFor[t.rosterId] > 0
    )
  const rows = complete
    ? buildDraftOrder(
        teams,
        draftOrder!.maxPointsFor,
        draftOrder!.projectedMaxPointsFor,
        'projected'
      )
    : []
  const slots = Object.fromEntries(rows.map((r) => [r.rosterId, r.pick]))
  const picks = (data?.picks ?? []).filter((p) => p.owner_id === team.rosterId)
  const fits =
    data && scenario
      ? assessDraftCapital(scenario.targets, prospects, picks, slots, teams.length, [
          ...new Set(data.picks.map((p) => Number(p.season))),
        ])
      : []
  const view = scenario ? scenarioAtYear(scenario, horizon, baseYear) : undefined
  return {
    baseYear,
    horizon,
    view,
    picks,
    fits,
    slots,
    complete,
    loading: isLoading || draftOrder?.loading,
    error,
    available: !!data,
  }
}
export function TeamTimeline({
  timeline,
  team,
  teams,
  scenario,
  onYear,
}: {
  timeline: ReturnType<typeof useTeamTimeline>
  team: TeamData
  teams: TeamData[]
  scenario: Scenario
  onYear: (year: number) => void
}) {
  const { baseYear, horizon, view, picks, fits, slots, complete } = timeline
  const years = Array.from(
    new Set([
      baseYear,
      baseYear + 1,
      baseYear + 2,
      baseYear + 3,
      horizon,
      ...scenario.targets.flatMap((t) => (t.year ? [t.year] : [])),
    ])
  ).sort()
  const retained = team.players.filter((p) => !view?.outgoing.includes(p.playerId))
  const ages = retained.filter((p) => p.age > 0).map((p) => p.age + Math.max(0, horizon - baseYear))
  const arrivals = view?.targets.filter((t) => t.kind === 'draft') ?? []
  const pending = scenario.targets.filter(
    (t) => t.kind === 'draft' && !arrivals.some((p) => p.id === t.id)
  )
  const selectedFits = fits.filter((f) => arrivals.some((t) => t.id === f.targetId))
  const gaps = selectedFits.filter((f) => f.status === 'trade-up' || f.status === 'no-capital')
  const yearPicks = picks.filter((p) => Number(p.season) === horizon)
  return (
    <section
      aria-label="Team planning timeline"
      className="space-y-3 border-y border-slate-700 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            {horizon === baseYear ? 'This season' : `${horizon} roster vision`}
          </h3>
          <p className="text-xs text-slate-400">
            {horizon - baseYear} {horizon - baseYear === 1 ? 'year' : 'years'} ahead ·{' '}
            {horizon > baseYear + 1
              ? 'Long-range hypothesis'
              : horizon === baseYear
                ? 'Current-season plan'
                : 'Next-draft plan'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Planning horizon">
          {years.map((year) => (
            <button
              key={year}
              aria-pressed={year === horizon}
              onClick={() => onYear(year)}
              className={`rounded-lg border px-3 py-2 text-sm ${year === horizon ? 'border-blue-400 bg-blue-400/10 text-blue-200' : 'border-slate-700 text-slate-400'}`}
            >
              {year === baseYear ? 'Now' : `${year} · +${year - baseYear}y`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
        <span>{retained.length} current players retained</span>
        <span>
          {ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : '—'}{' '}
          retained-roster age
        </span>
        <span className="text-purple-300">
          +{arrivals.length} rookie arrivals by {horizon}
        </span>
        <span>{pending.length} later targets</span>
      </div>
      <div className="text-xs text-slate-400">
        <strong className="text-slate-200">{horizon} draft capital: </strong>
        {timeline.loading
          ? 'Loading…'
          : timeline.error
            ? 'Unavailable'
            : !yearPicks.length
              ? 'No owned picks for this year'
              : yearPicks
                  .map(
                    (p) =>
                      `${p.round}.${slots[p.roster_id] ? String(slots[p.roster_id]).padStart(2, '0') : '??'} (via ${teams.find((t) => t.rosterId === p.roster_id)?.teamName ?? 'original team'})`
                  )
                  .join(' · ')}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {complete
          ? 'Slots reuse the shared projected MaxPF order, including the original owner of traded picks.'
          : 'Complete league MaxPF projections are needed to estimate slots.'}{' '}
        {horizon > baseYear + 1
          ? 'Later drafts carry today’s relative order forward as an assumption, not a multi-year forecast. '
          : ''}
        MaxPF order is a planning assumption; playoff and league draft rules may change the final
        order. Class rank is a draft-cost proxy, not ADP. Rookie production is not forecast.
      </p>
      <p className="text-sm text-slate-300">
        {!arrivals.length
          ? 'Add a prospect from your board to see them in the year they could join your roster.'
          : !timeline.available
            ? 'Load draft capital before assessing this plan.'
            : !complete
              ? 'Rookie arrivals are mapped; draft feasibility is pending complete MaxPF projections.'
              : gaps.length
                ? `${gaps.length} of ${arrivals.length} planned rookie arrivals need an earlier pick or additional capital. Build those acquisitions into your trade plan.`
                : `${selectedFits.filter((f) => f.status === 'covered').length} rookie targets have separate owned picks that reach their current class-rank proxy.`}
      </p>
      {scenario.targets.some((t) => t.kind === 'draft') && (
        <ol
          aria-label="Strategy milestones"
          className="space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-400"
        >
          {years
            .filter((y) => y > baseYear)
            .map((y) => {
              const targets = scenario.targets.filter((t) => t.kind === 'draft' && t.year === y)
              if (!targets.length) return null
              const needs = fits.filter(
                (f) =>
                  targets.some((t) => t.id === f.targetId) &&
                  (f.status === 'trade-up' || f.status === 'no-capital')
              ).length
              return (
                <li key={y}>
                  <button
                    className="mr-2 font-semibold text-blue-300 hover:underline"
                    onClick={() => onYear(y)}
                  >
                    {y} · +{y - baseYear}y
                  </button>
                  {targets.map((t) => t.name).join(', ')}.{' '}
                  {needs
                    ? `Secure capital for ${needs} target${needs === 1 ? '' : 's'} before this draft.`
                    : 'Keep the required picks available; reassess as rankings and team strength change.'}
                </li>
              )
            })}
        </ol>
      )}
    </section>
  )
}
export function DraftFitNote({
  fit,
  year,
  baseYear,
}: {
  fit?: CapitalFit
  year?: number
  baseYear: number
}) {
  const labels = {
    covered: 'Capital in range',
    'trade-up': 'Earlier pick needed',
    'no-capital': 'Acquire draft capital',
    unknown: 'Draft cost uncertain',
  }
  return (
    <p
      className={`px-2 text-xs leading-relaxed ${fit?.status === 'covered' ? 'text-emerald-300' : fit?.status === 'unknown' || !fit ? 'text-slate-400' : 'text-amber-300'}`}
    >
      {fit ? labels[fit.status] : 'Capital check pending'}
      {fit?.rank ? ` · class #${fit.rank} proxy` : ''}
      {fit?.pick && fit.slot ? ` · overall pick #${fit.slot}` : ''}
      {year && year > baseYear + 1 ? ' · long-range assumption' : ''}
    </p>
  )
}
