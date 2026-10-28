'use client'
import useSWR from 'swr'
import { applyFundingPlans } from '@/lib/draft-funding'
import type { Scenario } from '@/lib/team-scenarios'
import { assessDraftCapital, scenarioAtYear, type CapitalFit } from '@/lib/team-timeline'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { Prospect } from '@/components/scouting/types'
import type { TeamData } from '../types'
import { draftSlots, type DraftSlotInputs } from '@/lib/league-metrics/draft-slots'
export interface TimelineDraftOrder extends DraftSlotInputs {
  season: string
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
  // The league's draft-slot policy, the same slots the Overview and Picks tab show.
  const draft = draftOrder ? draftSlots(teams, draftOrder) : null
  const complete = !!draft?.ready
  const slots = draft?.slotByRoster ?? {}
  const slotBasis = draft?.basis ?? 'record'
  const plans = (scenario?.fundingPlans ?? []).filter(
    (f) =>
      scenario?.targets.some((t) => t.id === f.targetId) &&
      f.givePlayerIds.every((id) => team.players.some((p) => p.playerId === id))
  )
  const applied = applyFundingPlans(data?.picks ?? [], plans, team.rosterId)
  const funding = {
    ...applied,
    rejected: [
      ...applied.rejected,
      ...(scenario?.fundingPlans ?? []).filter((f) => !plans.includes(f)),
    ],
  }
  const picks = funding.picks.filter((p) => p.owner_id === team.rosterId)
  const fits =
    data && scenario
      ? assessDraftCapital(
          scenario.targets,
          prospects,
          picks,
          slots,
          teams.length,
          [...new Set(data.picks.map((p) => Number(p.season)))],
          scenario.pickAssignments
        )
      : []
  const view = scenario
    ? scenarioAtYear({ ...scenario, fundingPlans: funding.accepted }, horizon, baseYear)
    : undefined
  return {
    inventory: data,
    funding,
    baseYear,
    horizon,
    view,
    picks,
    fits,
    slots,
    slotBasis,
    complete,
    loading: isLoading || draftOrder?.loading,
    error,
    available: !!data,
  }
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
