'use client'
import useSWR from 'swr'
import { useLeagueContext } from '@/lib/league-context'
export function useLeagueFormat() {
  const { selectedLeagueId } = useLeagueContext()
  const { data } = useSWR(
    selectedLeagueId ? `https://api.sleeper.app/v1/league/${selectedLeagueId}` : null,
    async (url: string) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error('League format unavailable')
      return r.json()
    },
    { dedupingInterval: 60000 }
  )
  return {
    showScouting: !selectedLeagueId || data?.settings?.type === 2,
    isDynasty: data?.settings?.type === 2,
  }
}
