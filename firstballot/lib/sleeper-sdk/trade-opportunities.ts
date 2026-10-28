import { ktcValue } from './values'
import type { PlayerData, TeamData } from '@/components/league-buddy/types'
/** Selected-player version of SDK surplus/need matching; KTC is context, not acceptance odds. */
export function tradeOpportunities(
  player: PlayerData,
  mine: TeamData,
  teams: TeamData[],
  superflex: boolean
) {
  const value = (p: PlayerData) => ktcValue(p, { superflex })
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
        const need =
          target.position !== player.position &&
          count(mine, target.position) < median(target.position)
        const partnerNeed =
          target.position !== player.position &&
          count(team, player.position) < median(player.position)
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

/** Concrete one-for-one offers: neither manager's positional depth balance worsens. */
export function suggestedTeamTrades(
  mine: TeamData,
  teams: TeamData[],
  superflex: boolean,
  dismissed: string[] = []
) {
  const value = (p: PlayerData) => ktcValue(p, { superflex })
  const counts = (team: TeamData, pos: string) =>
    team.players.filter((p) => p.position === pos).length
  const median = (pos: string) => {
    const list = teams.map((t) => counts(t, pos)).sort((a, b) => a - b)
    const mid = Math.floor(list.length / 2)
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2
  }
  const benefit = (team: TeamData, send: string, receive: string) => {
    const s = counts(team, send) - median(send),
      r = counts(team, receive) - median(receive)
    return Math.abs(s) + Math.abs(r) - Math.abs(s - 1) - Math.abs(r + 1)
  }
  const matches = mine.players
    .flatMap((give) =>
      tradeOpportunities(give, mine, teams, superflex)
        .filter((c) => {
          const a = value(give),
            b = value(c.target)
          return (
            a &&
            b &&
            Math.abs(a - b) / Math.max(a, b) <= 0.15 &&
            give.position !== c.target.position &&
            benefit(mine, give.position, c.target.position) >= 0 &&
            benefit(c.team, c.target.position, give.position) >= 0
          )
        })
        .map((c) => ({ ...c, give }))
    )
    .sort((a, b) => b.score - a.score)
  const used = new Set<string>(),
    partners = new Map<number, number>()
  return matches
    .filter((c) => {
      if (
        dismissed.includes(`${c.give.playerId}:${c.target.playerId}:${c.team.rosterId}`) ||
        used.has(c.give.playerId) ||
        used.has(c.target.playerId) ||
        (partners.get(c.team.rosterId) ?? 0) >= 2
      )
        return false
      used.add(c.give.playerId)
      used.add(c.target.playerId)
      partners.set(c.team.rosterId, (partners.get(c.team.rosterId) ?? 0) + 1)
      return true
    })
    .slice(0, 4)
}

const need = (team: TeamData, position: string, teams: TeamData[]) => {
  const counts = (t: TeamData) => t.players.filter((p) => p.position === position).length
  const sorted = teams.map(counts).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return counts(team) < median
}

/** Ideas for a value to spend (several players, or one pick): nearest KTC value first, partner depth as tiebreak. */
export function valueOpportunities(
  give: { value: number; positions: string[] },
  mine: TeamData,
  teams: TeamData[],
  superflex: boolean,
  tolerance = 0.25
) {
  const value = (p: PlayerData) => ktcValue(p, { superflex })
  if (!give.value) return []
  return teams
    .filter((t) => t.rosterId !== mine.rosterId)
    .flatMap((team) =>
      team.players.flatMap((target) => {
        const v = value(target)
        if (!v) return []
        const gap = Math.abs(v - give.value) / Math.max(v, give.value)
        if (gap > tolerance) return []
        const partnerNeed = give.positions.some((pos) => need(team, pos, teams))
        const myNeed = need(mine, target.position, teams)
        const reason = [
          myNeed ? `Adds ${target.position} depth` : '',
          partnerNeed ? `${team.teamName} is thin where you are sending` : '',
          gap <= 0.1 ? 'KTC values within 10%' : `KTC values within ${Math.round(gap * 100)}%`,
        ]
          .filter(Boolean)
          .join(' · ')
        return [
          {
            team,
            target,
            value: v,
            reason,
            score: 1 - gap + (myNeed ? 0.3 : 0) + (partnerNeed ? 0.3 : 0),
          },
        ]
      })
    )
    .sort((a, b) => b.score - a.score || a.target.playerName.localeCompare(b.target.playerName))
}

/** Multi-player package: the selected players' combined KTC value is what a partner must match. */
export function packageOpportunities(
  players: PlayerData[],
  mine: TeamData,
  teams: TeamData[],
  superflex: boolean
) {
  const value = (p: PlayerData) => ktcValue(p, { superflex })
  const total = players.reduce((sum, p) => sum + (value(p) ?? 0), 0)
  return valueOpportunities(
    { value: total, positions: [...new Set(players.map((p) => p.position))] },
    mine,
    teams,
    superflex,
    0.3
  )
}
