import { useMemo } from 'react'
import { buildPowerRankings, type PowerRankings } from '@/lib/sleeper-sdk'
import type { TeamData } from '../types'

export interface UsePowerRankingsResult {
  rankings: PowerRankings
  /** rosterId → 0–100 power score, for consumers that only need the number. */
  scores: Record<number, number>
}

/**
 * One power-ranking pass for the league, shared by every view that reads it — the
 * franchise outlook board and the positional/starter breakdowns both sort by the same
 * numbers rather than each deriving their own.
 */
export function usePowerRankings(
  teams: TeamData[],
  rosterPositionsRaw: string[]
): UsePowerRankingsResult {
  return useMemo(() => {
    const rankings = buildPowerRankings(
      teams.map((team) => ({ rosterId: team.rosterId, players: team.players })),
      rosterPositionsRaw
    )

    const scores: Record<number, number> = {}
    for (const entry of rankings.teams) scores[entry.rosterId] = entry.score

    return { rankings, scores }
  }, [teams, rosterPositionsRaw])
}
