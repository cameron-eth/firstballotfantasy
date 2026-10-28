'use client'
import { useMemo } from 'react'
import useSWR from 'swr'
import { picksByYear } from '@/lib/picks-overview'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { TeamData } from './types'
import { draftSlots, type DraftSlotInputs } from '@/lib/league-metrics/draft-slots'

export type PickCapitalDraftOrder = DraftSlotInputs

const fetchInventory = async (url: string): Promise<TradeInventory> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Pick ownership unavailable.')
  return r.json()
}

/**
 * One team's draft capital from the league pick inventory, shared by the dashboard header,
 * the Overview picks panel and the Picks tab (SWR dedupes the request across them).
 * Slots for the next draft follow the league's draft-slot policy (lib/league-metrics/draft-slots).
 */
export function usePickCapital(
  leagueId: string,
  teams: TeamData[],
  rosterId: number | undefined,
  draftOrder: PickCapitalDraftOrder | null,
  enabled = true
) {
  const { data, error, isLoading, mutate } = useSWR<TradeInventory>(
    enabled ? `/api/trade-inventory?leagueId=${leagueId}` : null,
    fetchInventory
  )
  const picks = useMemo(() => data?.picks ?? [], [data])
  const slots = useMemo(
    () => (draftOrder ? draftSlots(teams, draftOrder) : null),
    [teams, draftOrder]
  )
  const slotByRoster = useMemo(() => slots?.slotByRoster ?? {}, [slots])
  const slotBasis = slots?.basis ?? 'record'
  const years = useMemo(
    () => (rosterId == null ? [] : picksByYear(picks, rosterId)),
    [picks, rosterId]
  )
  const nextSeason = years[0]?.season
  return {
    picks,
    years,
    nextSeason,
    slotByRoster,
    /** Slot labels only apply to the next draft; later years read "2028 R1". */
    slotsFor: (season: string) => (season === nextSeason ? slotByRoster : {}),
    /** The basis the slots were decided on, for the label beside them. */
    slotBasis,
    error,
    isLoading,
    retry: () => mutate(),
  }
}
