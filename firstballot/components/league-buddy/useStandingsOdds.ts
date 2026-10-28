'use client'
import useSWR from 'swr'
import type { TeamData } from './types'
import { fetchStandingsSettings } from './standingsSettings'
import { useMemo } from 'react'
import { calculatePlayoffOdds } from './utils/playoffOdds'

export { fetchStandingsSettings } from './standingsSettings'

export function useStandingsOdds(leagueId: string, teams: TeamData[]) {
  const { data, error, mutate } = useSWR(
    `standings-playoffs:${leagueId}:${teams.map((t) => `${t.rosterId}-${t.wins}-${t.losses}-${t.ties}`).join(',')}`,
    () => fetchStandingsSettings(leagueId, teams)
  )
  const odds = useMemo(
    () =>
      data?.spots
        ? calculatePlayoffOdds(teams, data.completed, data.end, data.spots, data.schedule)
        : [],
    [teams, data]
  )
  return { data, error, retry: mutate, odds }
}
