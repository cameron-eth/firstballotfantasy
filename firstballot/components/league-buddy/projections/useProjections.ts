import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { perGameProjections, weekPoints as weekPointsOf } from './projectedPoints'

export interface ProjectionEntry {
  /** Projected points under the league's own scoring. */
  pts: number
  /** Projected games played — 1 on a weekly row, ~18 on a season total. */
  opponent?: string | null
  gp: number
}

export type ProjectionMap = Record<string, ProjectionEntry>

interface ProjectionResponse {
  season: string
  week: number | null
  scoring: 'league' | 'ppr'
  exact: boolean
  unmatchedKeys: string[]
  generatedAt?: string
  byes?: string[]
  points: ProjectionMap
}

export interface UseProjectionsResult {
  /** Season totals, for talent-level reads like projected PPG. */
  season: ProjectionMap
  /** This week's projections, for lineup decisions. */
  week: ProjectionMap
  /** Projected points per game — the season total divided by projected games. */
  ppg: (playerId: string) => number
  /** The same per-game projections as a map, for consumers that need every player. */
  ppgByPlayer: Record<string, number>
  /** This week's projected points per player. */
  weekByPlayer: Record<string, number>
  /** This week's projection for one player. */
  weekly: (playerId: string) => number
  /** False when a league scoring rule pays out but is never projected (K/DEF only). */
  exact: boolean
  error: string | null
  byes: string[]
  updatedAt?: string
  loading: boolean
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`projections ${r.status}`)
    return r.json() as Promise<ProjectionResponse>
  })

/**
 * Sleeper projections for a league, scored with that league's own settings.
 *
 * Two requests, not eighteen: season totals carry a projected games count, so a
 * per-week mean is a division rather than a fetch per remaining week. The upstream
 * payload is ~2 MB per week, which is why the slimming happens in `/api/projections`
 * and never here.
 *
 * `season` is deliberately not passed — the route resolves it from Sleeper so a stale
 * year can't leak in from the client.
 */
export function useProjections(leagueId: string, week: number): UseProjectionsResult {
  const seasonKey = leagueId ? `/api/projections?leagueId=${leagueId}` : null
  const weekKey = leagueId && week > 0 ? `/api/projections?leagueId=${leagueId}&week=${week}` : null

  const {
    data: seasonData,
    isLoading: seasonLoading,
    error: seasonError,
  } = useSWR(seasonKey, fetcher, {
    revalidateOnFocus: false,
  })
  const {
    data: weekData,
    isLoading: weekLoading,
    error: weekError,
  } = useSWR(weekKey, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15 * 60 * 1000,
  })

  const season = seasonData?.points ?? {}
  const weekPoints = weekData?.points ?? {}

  const ppgByPlayer = useMemo(() => perGameProjections(season), [season])
  const weekByPlayer = useMemo(() => weekPointsOf(weekPoints), [weekPoints])
  const ppg = useCallback((playerId: string) => ppgByPlayer[playerId] ?? 0, [ppgByPlayer])

  const weekly = useCallback((playerId: string) => weekPoints[playerId]?.pts ?? 0, [weekPoints])

  return {
    season,
    week: weekPoints,
    ppg,
    ppgByPlayer,
    weekByPlayer,
    weekly,
    exact: (seasonData?.exact ?? true) && (weekData?.exact ?? true),
    error: weekError
      ? 'Weekly projections are temporarily unavailable.'
      : seasonError
        ? 'Season projections are temporarily unavailable.'
        : null,
    byes: weekData?.byes ?? [],
    updatedAt: weekData?.generatedAt,
    loading: seasonLoading || weekLoading,
  }
}
