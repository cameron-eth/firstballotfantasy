/**
 * A team's dynasty value and its rank in the league (PR-6, audit R1-2, decision D1).
 *
 * The canonical definition is `teamValueScore`: quality-weighted and depth-decayed, so a
 * few stars outrank a pile of depth. The Overview "Dynasty rank", the My Team value rank,
 * the Outlook win-now score and the roster grade all derive from it. The lineup-slot power
 * score is a different metric, shown as "Lineup strength".
 */
import { teamValueScore } from '../team-score'
import { ktcValue, rankToValue } from '../sleeper-sdk/values'
import { CORE_POSITIONS } from '../sleeper-sdk/types'
import type { LeagueContext } from './context'
import type { PlayerData } from '@/components/league-buddy/types'

export interface TeamValue {
  value: number
  /** 1 = most valuable; tied values share a rank. */
  rank: number
  /**
   * Core players with no KTC value for this format, valued from consensus rank instead.
   * Shown beside the value so an estimate never reads as a market price.
   */
  estimated: number
}

/** Valued from consensus rank because KTC has no number for this player and format. */
function isEstimated(player: PlayerData, ctx: LeagueContext): boolean {
  if (!(CORE_POSITIONS as readonly string[]).includes(player.position?.toUpperCase() ?? ''))
    return false
  const ktc = ktcValue(player, ctx)
  return !(typeof ktc === 'number' && ktc > 0) && rankToValue(player.rank) > 0
}

export function leagueTeamValues(
  teams: { rosterId: number; players: PlayerData[] }[],
  ctx: LeagueContext
): Map<number, TeamValue> {
  const values = teams.map((t) => ({
    rosterId: t.rosterId,
    value: teamValueScore(t.players, ctx),
    estimated: t.players.filter((p) => isEstimated(p, ctx)).length,
  }))
  return new Map(
    values.map(({ rosterId, value, estimated }) => [
      rosterId,
      { value, rank: values.filter((other) => other.value > value).length + 1, estimated },
    ])
  )
}
