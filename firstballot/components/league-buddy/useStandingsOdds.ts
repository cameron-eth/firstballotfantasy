'use client'
import useSWR from 'swr'
import type { TeamData } from './types'
import { fetchStandingsSettings } from './standingsSettings'
import { useMemo } from 'react'
import { calculatePlayoffOdds } from './utils/playoffOdds'
import {
  SERVER_LEAGUE_METRICS,
  serverPlayoffOdds,
  type ServerLeagueMetrics,
} from '@/lib/league-metrics/server-odds'

export { fetchStandingsSettings } from './standingsSettings'

const fetchServerMetrics = async (url: string): Promise<ServerLeagueMetrics> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Server league metrics unavailable')
  return r.json()
}

export function useStandingsOdds(leagueId: string, teams: TeamData[]) {
  const { data, error, mutate } = useSWR(
    `standings-playoffs:${leagueId}:${teams.map((t) => `${t.rosterId}-${t.wins}-${t.losses}-${t.ties}`).join(',')}`,
    () => fetchStandingsSettings(leagueId, teams)
  )
  // Flag on: the server's seeded odds, when they were computed from the records shown here.
  const { data: server, error: serverError } = useSWR(
    SERVER_LEAGUE_METRICS ? `/api/league/${leagueId}/metrics` : null,
    fetchServerMetrics,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )
  const waitingForServer = SERVER_LEAGUE_METRICS && server === undefined && !serverError
  const odds = useMemo(() => {
    if (!data?.spots || waitingForServer) return []
    return (
      serverPlayoffOdds(teams, server) ??
      calculatePlayoffOdds(teams, data.completed, data.end, data.spots, data.schedule)
    )
  }, [teams, data, server, waitingForServer])
  return { data, error, retry: mutate, odds }
}
