'use client'
import { useMemo } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { suggestedTeamTrades } from '@/lib/sleeper-sdk/trade-opportunities'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { TeamData } from '../types'
import { useTradeDismissals } from './useTradeDismissals'

const fetchInventory = async (url: string): Promise<TradeInventory> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Trade context unavailable.')
  return r.json()
}

/**
 * Depth-for-need swaps from the existing trade engine, minus anything dismissed in the
 * last 24 hours. Shared by My Team's suggested trades and the Overview's trade panel.
 */
export function useSuggestedTrades(leagueId: string, team: TeamData, teams: TeamData[]) {
  const { user } = useAuth()
  const { dismissed, dismiss } = useTradeDismissals(
    `${user?.id ?? 'guest'}:${leagueId}:${team.rosterId}`
  )
  const { data, error, isLoading, mutate } = useSWR<TradeInventory>(
    `/api/trade-inventory?leagueId=${leagueId}`,
    fetchInventory
  )
  const suggestions = useMemo(
    () => (data ? suggestedTeamTrades(team, teams, data.superflex, dismissed) : []),
    [data, team, teams, dismissed]
  )
  return {
    suggestions,
    superflex: data?.superflex ?? true,
    error,
    isLoading,
    retry: () => mutate(),
    dismiss,
  }
}
