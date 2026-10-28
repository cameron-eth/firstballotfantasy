'use client'
import { useMemo } from 'react'
import useSWR from 'swr'
import { picksByYear } from '@/lib/picks-overview'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { TeamData } from './types'
import type { MaxPointsForEntry } from './draft-order/maxPointsFor'
import { buildDraftOrder } from './draft-order/draftOrderBoard'

export interface PickCapitalDraftOrder {
  maxPointsFor: Record<number, MaxPointsForEntry>
  projectedMaxPointsFor: Record<number, number>
  loading: boolean
}

const fetchInventory = async (url: string): Promise<TradeInventory> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Pick ownership unavailable.')
  return r.json()
}

/**
 * One team's draft capital from the league pick inventory, shared by the dashboard header,
 * the Overview picks panel and the Picks tab (SWR dedupes the request across them).
 * Slots for the next draft follow the projected order, or the record order until it loads.
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
  const hasProjection = !!draftOrder && Object.keys(draftOrder.projectedMaxPointsFor).length > 0
  const slotByRoster = useMemo<Record<number, number>>(() => {
    if (!draftOrder || draftOrder.loading) return {}
    const rows = buildDraftOrder(
      teams,
      draftOrder.maxPointsFor,
      draftOrder.projectedMaxPointsFor,
      hasProjection ? 'projected' : 'record'
    )
    return Object.fromEntries(rows.map((r) => [r.rosterId, r.pick]))
  }, [teams, draftOrder, hasProjection])
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
    hasProjection,
    error,
    isLoading,
    retry: () => mutate(),
  }
}
