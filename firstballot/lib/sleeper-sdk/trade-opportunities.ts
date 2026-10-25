import type { PlayerData, TeamData } from '@/components/league-buddy/types'
/** Selected-player version of SDK surplus/need matching; KTC is context, not acceptance odds. */
export function tradeOpportunities(
  player: PlayerData,
  mine: TeamData,
  teams: TeamData[],
  superflex: boolean
) {
  const value = (p: PlayerData) => (superflex ? p.ktcValueSf : p.ktcValue1qb)
  const count = (team: TeamData, position: string) =>
    team.players.filter((p) => p.position === position).length
  const median = (position: string) => {
    const sorted = teams.map((t) => count(t, position)).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length
      ? sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
      : 0
  }
  return teams
    .filter((t) => t.rosterId !== mine.rosterId)
    .flatMap((team) =>
      team.players.map((target) => {
        const from = value(player),
          to = value(target)
        const gap = from && to ? Math.abs(to - from) / Math.max(from, to) : null
        const need = target.position !== player.position && count(mine, target.position) < median(target.position)
        const partnerNeed = target.position !== player.position && count(team, player.position) < median(player.position)
        const reason =
          [
            need ? `Adds ${target.position} depth` : '',
            partnerNeed ? `${team.teamName} has below-median ${player.position} depth` : '',
            gap !== null && gap <= 0.15 ? 'KTC values within 15%' : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'Explore a custom offer'
        return {
          team,
          target,
          value: to,
          reason,
          score: (gap === null ? -10 : 1 - gap) + (need ? 0.3 : 0) + (partnerNeed ? 0.3 : 0),
        }
      })
    )
    .sort((a, b) => b.score - a.score || a.target.playerName.localeCompare(b.target.playerName))
}
