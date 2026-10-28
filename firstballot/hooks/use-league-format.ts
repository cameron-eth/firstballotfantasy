'use client'
import useSWR from 'swr'
import { useLeagueContext } from '@/lib/league-context'
import { sharedSleeperJson } from '@/lib/sleeper-shared'
export function useLeagueFormat() {
  const { selectedLeagueId } = useLeagueContext()
  const { data } = useSWR(
    selectedLeagueId ? `https://api.sleeper.app/v1/league/${selectedLeagueId}` : null,
    // Shares the request with the dashboard's league loaders (PR-18).
    (url: string) =>
      sharedSleeperJson<{ settings?: { type?: number } }>(url).catch(() => {
        throw new Error('League format unavailable')
      }),
    { dedupingInterval: 60000 }
  )
  return {
    showScouting: !selectedLeagueId || data?.settings?.type === 2,
    isDynasty: data?.settings?.type === 2,
  }
}
