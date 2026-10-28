// Plain module (no 'use client'), so the server metrics route can load the same inputs.
import type { TeamData } from './types'

/** Playoff settings and the remaining schedule; the inputs to the playoff simulation. */
export async function fetchStandingsSettings(leagueId: string, teams: TeamData[]) {
  const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`)
  if (!response.ok) throw new Error('League settings unavailable')
  const league = await response.json()
  const end = Number(league.settings?.playoff_week_start) - 1
  const spots = Number(league.settings?.playoff_teams)
  if (!Number.isInteger(end) || end < 1 || end > 18 || !Number.isInteger(spots))
    throw new Error('Playoff settings unavailable')
  const median = Number(league.settings?.league_average_match) === 1
  const completed = Math.min(
    end,
    Math.floor(Math.min(...teams.map((t) => t.wins + t.losses + (t.ties || 0))) / (median ? 2 : 1))
  )
  const schedule: Record<number, Record<number, number>> = {}
  await Promise.all(
    Array.from({ length: end - completed }, async (_, index) => {
      const week = completed + index + 1
      const r = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`)
      if (!r.ok) throw new Error('Remaining schedule unavailable')
      const rows: { roster_id: number; matchup_id: number | null }[] = await r.json()
      schedule[week] = {}
      for (const row of rows) {
        const opponent = rows.find(
          (other) =>
            row.matchup_id != null &&
            other.matchup_id === row.matchup_id &&
            other.roster_id !== row.roster_id
        )
        if (opponent) schedule[week][row.roster_id] = opponent.roster_id
      }
    })
  )
  return { end, spots, completed, schedule }
}
