/**
 * Playoff odds from the server's league metrics (PR-15b, behind
 * NEXT_PUBLIC_SERVER_LEAGUE_METRICS). The 10,000-season simulation is the one league
 * metric that costs real main-thread time, so with the flag on the dashboard reads it from
 * /api/league/[id]/metrics instead of running it.
 */
import type { TeamData } from '@/components/league-buddy/types'
import type { PlayoffOddsResult } from '@/components/league-buddy/utils/playoffOdds'
import type { LeagueMetrics } from './compute'

export const SERVER_LEAGUE_METRICS = process.env.NEXT_PUBLIC_SERVER_LEAGUE_METRICS === '1'

export type ServerLeagueMetrics = { metrics: LeagueMetrics; inputHash: string; computedAt: string }

/**
 * The server's odds in the shape the client simulation returns, or null when the snapshot
 * was computed from different records than the dashboard shows (the snapshot can be up to
 * 15 minutes old): the dashboard then simulates locally, so a page never mixes states.
 */
export function serverPlayoffOdds(
  teams: TeamData[],
  server: ServerLeagueMetrics | undefined
): PlayoffOddsResult[] | null {
  if (!server?.metrics) return null
  const byRoster = server.metrics.teams
  const current = teams.every((t) => {
    const s = byRoster[t.rosterId]
    return (
      s &&
      s.playoffOdds != null &&
      s.record[0] === t.wins &&
      s.record[1] === t.losses &&
      s.record[2] === (t.ties ?? 0) &&
      s.pointsFor === Number(t.pointsFor.toFixed(2))
    )
  })
  if (!current || teams.length !== Object.keys(byRoster).length) return null
  const teamById = new Map(teams.map((t) => [t.rosterId, t]))
  return server.metrics.standingsOrder.flatMap((rosterId, index) => {
    const team = teamById.get(rosterId)
    const odds = byRoster[rosterId]?.playoffOdds
    return team && odds != null
      ? [
          {
            rosterId,
            teamName: team.teamName,
            wins: team.wins,
            losses: team.losses,
            pointsFor: team.pointsFor,
            playoffProbability: odds,
            rank: index + 1,
          },
        ]
      : []
  })
}
