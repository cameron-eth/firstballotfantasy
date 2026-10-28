import { useMemo } from 'react'
import useSWR from 'swr'
import type { MaxPointsForEntry } from './maxPointsFor'
import { fetchDraftOrderBundle } from './draftOrderBundle'

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
export { fetchDraftOrderBundle } from './draftOrderBundle'

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
