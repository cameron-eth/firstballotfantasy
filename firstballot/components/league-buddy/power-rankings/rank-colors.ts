/**
 * Rank → color, relative to league size so the scale reads the same in a 10-team and a
 * 14-team league: top third is a strength, middle third is neutral, bottom third is a hole.
 */
export interface RankTone {
  bar: string
  text: string
  hex: string
}

const STRONG: RankTone = { bar: 'bg-emerald-500', text: 'text-emerald-300', hex: '#10b981' }
const NEUTRAL: RankTone = { bar: 'bg-blue-500', text: 'text-blue-300', hex: '#3b82f6' }
const WEAK: RankTone = { bar: 'bg-rose-500', text: 'text-rose-300', hex: '#f43f5e' }

export function toneForRank(rank: number, leagueSize: number): RankTone {
  if (leagueSize <= 0) return NEUTRAL
  const third = leagueSize / 3
  if (rank <= third) return STRONG
  if (rank <= third * 2) return NEUTRAL
  return WEAK
}
