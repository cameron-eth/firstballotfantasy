/**
 * A team's dynasty value and its rank in the league (PR-6, audit R1-2, decision D1).
 *
 * The canonical definition is `teamValueScore`: quality-weighted and depth-decayed, so a
 * few stars outrank a pile of depth. The Overview "Dynasty rank", the My Team value rank,
 * the Outlook win-now score and the roster grade all derive from it. The lineup-slot power
 * score is a different metric, shown as "Lineup strength".
 */
import { teamValueScore } from '../team-score'
import type { LeagueContext } from './context'
import type { PlayerData } from '@/components/league-buddy/types'

export interface TeamValue {
  value: number
  /** 1 = most valuable; tied values share a rank. */
  rank: number
}

export function leagueTeamValues(
  teams: { rosterId: number; players: PlayerData[] }[],
  ctx: LeagueContext
): Map<number, TeamValue> {
  const values = teams.map((t) => ({ rosterId: t.rosterId, value: teamValueScore(t.players, ctx) }))
  return new Map(
    values.map(({ rosterId, value }) => [
      rosterId,
      { value, rank: values.filter((other) => other.value > value).length + 1 },
    ])
  )
}
