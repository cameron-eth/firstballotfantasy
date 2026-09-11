import { useMemo } from 'react'
import useSWR from 'swr'
import { sleeperApi } from '@/lib/nextjs-cache'
import type { SleeperMatchup } from '../types'
import { computeMaxPointsFor, type MaxPointsForEntry } from './maxPointsFor'
import { resolveSeasonWindow, type LeagueInfo, type NflState } from './seasonWindow'

export interface UseDraftOrderResult {
  /** rosterId → season Max PF totals. Empty until the first week is scored. */
  maxPointsFor: Record<number, MaxPointsForEntry>
  /** Regular-season weeks that have actually been scored. */
  weeksCounted: number
  /** The season these totals cover, e.g. '2026'. */
  season: string
  /** Last week that counts toward draft order, for projecting the rest of the way. */
  lastRegularWeek: number
  /** rosterId → Max PF over finished weeks only; the basis for calibration. */
  maxPointsForCompleted: Record<number, number>
  /** How many weeks are definitely finished (excludes any week in progress). */
  completedWeeks: number
  loading: boolean
  error: string | null
}

async function fetchDraftOrderBundle(
  leagueId: string,
  rosterPositions: string[],
  positions: Record<string, string>
) {
  const [league, nflState] = (await Promise.all([
    sleeperApi.getLeagueInfo(leagueId).catch(() => null),
    sleeperApi.getNflState().catch(() => null),
  ])) as [LeagueInfo | null, NflState | null]

  const { weeks, season, liveWeek, lastRegularWeek } = resolveSeasonWindow(nflState, league)

  const weeklyMatchups = await Promise.all(
    weeks.map((week) => {
      // Finished weeks never change, so they go through the shared cache. The week
      // still being played does change, and `sleeperApi` asks for `force-cache` —
      // which on the client is the browser cache, with no revalidate window to save
      // it. Fetch that one directly so a live score isn't frozen mid-week.
      const request =
        liveWeek !== null && week >= liveWeek
          ? fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, {
              cache: 'no-store',
            }).then((r) => (r.ok ? r.json() : []))
          : sleeperApi.getLeagueMatchups(leagueId, week)

      return request
        .catch(() => [])
        .then((rows: unknown) => (Array.isArray(rows) ? (rows as SleeperMatchup[]) : []))
    })
  )

  const scored = weeklyMatchups.map((rows) =>
    rows
      .filter((row) => row && typeof row.roster_id === 'number')
      .map((row) => ({
        rosterId: row.roster_id,
        playersPoints: row.players_points ?? {},
        actualPoints: Number(row.custom_points ?? row.points) || 0,
      }))
  )

  const maxPointsFor = computeMaxPointsFor(
    scored,
    rosterPositions,
    (playerId) => positions[playerId]
  )

  // The live week is still accumulating, so it is excluded from the calibration
  // basis — a half-played slate reads as a collapse in scoring against projections.
  const finished = liveWeek !== null ? scored.slice(0, Math.max(0, liveWeek - 1)) : scored
  const completedTotals = computeMaxPointsFor(
    finished,
    rosterPositions,
    (playerId) => positions[playerId]
  )
  const maxPointsForCompleted: Record<number, number> = {}
  for (const entry of Object.values(completedTotals)) {
    maxPointsForCompleted[entry.rosterId] = entry.maxPointsFor
  }

  const weeksCounted = Object.values(maxPointsFor)[0]?.weeksCounted ?? 0
  const completedWeeks = Object.values(completedTotals)[0]?.weeksCounted ?? 0
  return {
    maxPointsFor,
    weeksCounted,
    season,
    lastRegularWeek,
    maxPointsForCompleted,
    completedWeeks,
  }
}

/**
 * Season-long Max Points For, one fetch per regular-season week played so far.
 *
 * Only the player-id → position map is pulled out of `allPlayers` before hashing it
 * into the SWR key — the raw Sleeper player blob is ~18MB and a new object identity
 * on every render, so passing it through directly would refetch every week's
 * matchups constantly. `currentWeek` is in the key purely so the board recomputes
 * when the NFL week rolls over; the authoritative window comes from Sleeper inside
 * the fetch.
 */
export function useDraftOrder(
  leagueId: string,
  currentWeek: number,
  allPlayers: Record<string, { position?: string }>,
  rosterPositionsRaw: string[]
): UseDraftOrderResult {
  // ~11k entries, and LeagueBuddy re-renders on every team selection — memoize on the
  // SWR-stable `allPlayers` identity rather than rebuilding the map each pass.
  const positions = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [playerId, player] of Object.entries(allPlayers ?? {})) {
      if (player?.position) map[playerId] = player.position
    }
    return map
  }, [allPlayers])

  const ready = Boolean(leagueId) && Object.keys(positions).length > 0

  const { data, error, isLoading } = useSWR(
    ready ? ['draft-order', leagueId, currentWeek, rosterPositionsRaw.join(',')] : null,
    () => fetchDraftOrderBundle(leagueId, rosterPositionsRaw, positions),
    { revalidateOnFocus: false }
  )

  return {
    maxPointsFor: data?.maxPointsFor ?? {},
    weeksCounted: data?.weeksCounted ?? 0,
    season: data?.season ?? '',
    lastRegularWeek: data?.lastRegularWeek ?? 0,
    maxPointsForCompleted: data?.maxPointsForCompleted ?? {},
    completedWeeks: data?.completedWeeks ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
