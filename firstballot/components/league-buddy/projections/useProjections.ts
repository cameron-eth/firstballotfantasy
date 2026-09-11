import { useCallback } from 'react'
import useSWR from 'swr'

export interface ProjectionEntry {
  /** Projected points under the league's own scoring. */
  pts: number
  /** Projected games played — 1 on a weekly row, ~18 on a season total. */
  gp: number
}

export type ProjectionMap = Record<string, ProjectionEntry>

interface ProjectionResponse {
  season: string
  week: number | null
  scoring: 'league' | 'ppr'
  exact: boolean
  unmatchedKeys: string[]
  points: ProjectionMap
}

export interface UseProjectionsResult {
  /** Season totals, for talent-level reads like projected PPG. */
  season: ProjectionMap
  /** This week's projections, for lineup decisions. */
  week: ProjectionMap
  /** Projected points per game — the season total divided by projected games. */
  ppg: (playerId: string) => number
  /** This week's projection for one player. */
  weekly: (playerId: string) => number
  /** False when a league scoring rule pays out but is never projected (K/DEF only). */
  exact: boolean
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

  const { data: seasonData, isLoading: seasonLoading } = useSWR(seasonKey, fetcher, {
    revalidateOnFocus: false,
  })
  const { data: weekData, isLoading: weekLoading } = useSWR(weekKey, fetcher, {
    revalidateOnFocus: false,
  })

  const season = seasonData?.points ?? {}
  const weekPoints = weekData?.points ?? {}

  const ppg = useCallback(
    (playerId: string) => {
      const entry = season[playerId]
      if (!entry || !entry.gp) return 0
      return entry.pts / entry.gp
    },
    [season]
  )

  const weekly = useCallback((playerId: string) => weekPoints[playerId]?.pts ?? 0, [weekPoints])

  return {
    season,
    week: weekPoints,
    ppg,
    weekly,
    exact: seasonData?.exact ?? true,
    loading: seasonLoading || weekLoading,
  }
}
