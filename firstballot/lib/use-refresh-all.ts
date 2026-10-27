'use client'

import { useCallback, useState } from 'react'
import { useSWRConfig } from 'swr'
import { bumpCacheVersion } from '@/lib/cache-version'
import { clearPlayersMemo } from '@/components/league-buddy/useLeagueData'

/**
 * Drops every cached layer we control: bumps the URL version (browser + CDN copies of
 * stats, KTC values and headshots), forgets the in-memory Sleeper player blob, and
 * revalidates every mounted SWR key without blanking the screen.
 */
export function useRefreshAll() {
  const { mutate } = useSWRConfig()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    setRefreshing(true)
    bumpCacheVersion()
    clearPlayersMemo()
    try {
      await mutate(() => true)
    } finally {
      setRefreshing(false)
    }
  }, [mutate])
  return { refresh, refreshing }
}
