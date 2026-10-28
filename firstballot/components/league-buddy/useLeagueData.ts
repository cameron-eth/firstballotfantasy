import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { resolveLeagueContext, type LeagueContext } from '@/lib/league-metrics/context'
import { getCacheVersion, useCacheVersion } from '@/lib/cache-version'
import type { TeamData, MatchupData, LeagueOverview, SleeperTransaction } from './types'
import {
  applyKtc,
  fetchKtcMaps,
  fetchLeagueDataBundle,
  getUserId,
  ktcPlayerIdsFor,
  withTeamScores,
} from './leagueDataBundle'

export {
  applyKtc,
  clearPlayersMemo,
  fetchKtcMaps,
  fetchLeagueDataBundle,
  ktcPlayerIdsFor,
  withTeamScores,
  type KtcMaps,
} from './leagueDataBundle'

interface UseLeagueDataReturn {
  teams: TeamData[]
  loading: boolean
  /** False until KTC values have been merged (or failed), so value-based models don't flash fallback results. */
  valuesReady: boolean
  error: string | null
  selectedTeam: TeamData | null
  setSelectedTeam: (team: TeamData | null) => void
  leagueOverview: LeagueOverview | null
  currentMatchups: MatchupData[]
  currentWeek: number
  nflGames: Record<string, { opponent: string; isHome: boolean }>
  allPlayers: Record<string, any>
  playerRankings: Record<string, any>
  rosterPositionsRaw: string[]
  /** League format (superflex or 1QB), resolved once for every metric. */
  leagueContext: LeagueContext
  leagueTransactions: SleeperTransaction[]
  refetch: () => Promise<void>
}

/** Until the league loads, the format of Sleeper's default lineup (no teams are valued yet). */
const DEFAULT_LEAGUE_CONTEXT = resolveLeagueContext(null)

export function useLeagueData(leagueId: string, user?: unknown): UseLeagueDataReturn {
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null)

  const version = useCacheVersion()
  const { data, error, isLoading, mutate } = useSWR(
    leagueId ? ['league-buddy-v2-season-stats', leagueId, getUserId(user) ?? 'anon'] : null,
    ([, id]) => fetchLeagueDataBundle(id as string, user, getCacheVersion()),
    { revalidateOnFocus: true, focusThrottleInterval: 300_000, refreshInterval: 900_000 }
  )

  const ktcPlayerIds = useMemo(() => ktcPlayerIdsFor(data?.teams ?? []), [data?.teams])
  const { data: ktcMaps, error: ktcError } = useSWR(
    ktcPlayerIds.length > 0
      ? ['league-buddy-ktc', leagueId, version, ktcPlayerIds.join('|')]
      : null,
    () => fetchKtcMaps(ktcPlayerIds, version),
    { revalidateOnFocus: false, dedupingInterval: 300_000, keepPreviousData: true }
  )

  const leagueContext = data?.leagueContext ?? DEFAULT_LEAGUE_CONTEXT
  const teams = useMemo(
    () =>
      data?.teams
        ? withTeamScores(ktcMaps ? applyKtc(data.teams, ktcMaps) : data.teams, leagueContext)
        : [],
    [data?.teams, ktcMaps, leagueContext]
  )
  const leagueOverview = data?.leagueOverview ?? null
  const currentMatchups = data?.currentMatchups ?? []
  const currentWeek = data?.currentWeek ?? 1
  const nflGames = data?.nflGames ?? {}
  const allPlayers = data?.allPlayers ?? {}
  const playerRankings = data?.playerRankings ?? {}
  const rosterPositionsRaw = data?.rosterPositionsRaw ?? []
  const leagueTransactions = data?.leagueTransactions ?? []

  const selectedTeam = useMemo(() => {
    if (teams.length === 0) return null
    if (selectedRosterId !== null) {
      return teams.find((team) => team.rosterId === selectedRosterId) ?? null
    }
    const fallbackRosterId = data?.defaultSelectedRosterId
    return teams.find((team) => team.rosterId === fallbackRosterId) ?? teams[0] ?? null
  }, [teams, selectedRosterId, data?.defaultSelectedRosterId])

  const setSelectedTeam = useCallback((team: TeamData | null) => {
    setSelectedRosterId(team?.rosterId ?? null)
  }, [])

  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    teams,
    loading: isLoading,
    valuesReady: !!data && (ktcPlayerIds.length === 0 || !!ktcMaps || !!ktcError),
    error: error instanceof Error ? error.message : null,
    selectedTeam,
    setSelectedTeam,
    leagueOverview,
    currentMatchups,
    currentWeek,
    nflGames,
    allPlayers,
    playerRankings,
    rosterPositionsRaw,
    leagueContext,
    leagueTransactions,
    refetch,
  }
}
