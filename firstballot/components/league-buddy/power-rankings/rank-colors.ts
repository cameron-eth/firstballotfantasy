/**
 * Rank → color, relative to league size so the scale reads the same in a 10-team and a
 * 14-team league: top third is a strength, middle third is neutral, bottom third is a hole.
 */
export interface RankTone {
  bar: string
  text: string
  hex: string
}

// Semantic tokens (DESIGN_SYSTEM.md §1): neutral is slate, never blue, so it can't read as QB or an action.
const STRONG: RankTone = { bar: 'bg-positive', text: 'text-emerald-300', hex: '#34d399' }
const NEUTRAL: RankTone = { bar: 'bg-slate-500', text: 'text-slate-300', hex: '#64748b' }
const WEAK: RankTone = { bar: 'bg-negative', text: 'text-rose-300', hex: '#fb7185' }

export function toneForRank(rank: number, leagueSize: number): RankTone {
  if (leagueSize <= 0) return NEUTRAL
  const third = leagueSize / 3
  if (rank <= third) return STRONG
  if (rank <= third * 2) return NEUTRAL
  return WEAK
}
