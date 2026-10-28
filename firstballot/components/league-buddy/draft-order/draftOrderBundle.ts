// Draft-order inputs without React, so the server metrics route can load them too.
import { sleeperApi } from '@/lib/nextjs-cache'
import type { SleeperMatchup } from '../types'
import { computeMaxPointsFor } from './maxPointsFor'
import { resolveSeasonWindow, type LeagueInfo, type NflState } from './seasonWindow'

export async function fetchDraftOrderBundle(
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
