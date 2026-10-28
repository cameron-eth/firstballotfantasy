import type { OwnedPick } from './sleeper-sdk/pick-inventory'

export interface PickYear {
  season: string
  /** Picks this roster holds, own and acquired, by round then original slot. */
  owned: OwnedPick[]
  /** This roster's own picks now held by someone else. */
  tradedAway: OwnedPick[]
}

export interface RosterCapital {
  rosterId: number
  /** season → picks held and first-rounders among them. */
  bySeason: Record<string, { total: number; firsts: number }>
  total: number
  firsts: number
}

const byRound = (a: OwnedPick, b: OwnedPick) => a.round - b.round || a.roster_id - b.roster_id

/** One roster's draft capital, year by year, from the league-wide pick inventory. */
export function picksByYear(picks: OwnedPick[], rosterId: number): PickYear[] {
  const seasons = [...new Set(picks.map((p) => p.season))].sort()
  return seasons.map((season) => {
    const year = picks.filter((p) => p.season === season)
    return {
      season,
      owned: year.filter((p) => p.owner_id === rosterId).sort(byRound),
      tradedAway: year
        .filter((p) => p.roster_id === rosterId && p.owner_id !== rosterId)
        .sort(byRound),
    }
  })
}

/** Every roster's pick count per season, richest in first-rounders first. */
export function leagueCapital(picks: OwnedPick[], rosterIds: number[]): RosterCapital[] {
  return rosterIds
    .map((rosterId) => {
      const mine = picks.filter((p) => p.owner_id === rosterId)
      const bySeason: RosterCapital['bySeason'] = {}
      for (const p of mine) {
        const entry = (bySeason[p.season] ??= { total: 0, firsts: 0 })
        entry.total += 1
        if (p.round === 1) entry.firsts += 1
      }
      return {
        rosterId,
        bySeason,
        total: mine.length,
        firsts: mine.filter((p) => p.round === 1).length,
      }
    })
    .sort((a, b) => b.firsts - a.firsts || b.total - a.total)
}

/**
 * '1.03' when the original team's slot is known (the upcoming draft), else '2028 R1'.
 * Slots repeat each round, so a team picking 3rd holds the 1.03, 2.03 and so on.
 */
export function pickLabel(pick: OwnedPick, slotByRoster: Record<number, number>): string {
  const slot = slotByRoster[pick.roster_id]
  return slot ? `${pick.round}.${String(slot).padStart(2, '0')}` : `${pick.season} R${pick.round}`
}
