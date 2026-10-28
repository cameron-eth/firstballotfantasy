import type { CareerOutcome } from '@/lib/history-outcomes'

export type HitPoint = {
  id: number
  name: string
  position: string
  year: number
  grade: number
  ratio: number
  bars: number
  label: string
}

/** Grade bands the summary reports on, best first. */
export const GRADE_BANDS = [
  { label: '90+', min: 90, max: Infinity },
  { label: '80-89', min: 80, max: 90 },
  { label: '70-79', min: 70, max: 80 },
  { label: 'Under 70', min: -Infinity, max: 70 },
] as const

/** Hit = 1.2x or more of comparable players' production (4-5 bars); miss = under 0.8x (1-2 bars). */
export const isHit = (p: Pick<HitPoint, 'bars'>) => p.bars >= 4
export const isMiss = (p: Pick<HitPoint, 'bars'>) => p.bars <= 2

/** Only players with a scouting grade and a rated NFL outcome can be plotted. */
export function toHitPoints(
  players: {
    id: number
    name: string
    position: string
    draft_year: number | null
    espn_id: number | null
    overall_grade: number | null
  }[],
  outcomes: Record<string, CareerOutcome>
): HitPoint[] {
  return players.flatMap((p) => {
    const outcome = outcomes[`${p.espn_id}:${p.draft_year}`]
    if (p.overall_grade == null || !p.draft_year || !outcome?.bars || !outcome.expected) return []
    return [
      {
        id: p.id,
        name: p.name,
        position: p.position,
        year: p.draft_year,
        grade: p.overall_grade,
        ratio: outcome.actual / outcome.expected,
        bars: outcome.bars,
        label: outcome.label,
      },
    ]
  })
}

export function bandSummary(points: HitPoint[]) {
  return GRADE_BANDS.map((band) => {
    const inBand = points.filter((p) => p.grade >= band.min && p.grade < band.max)
    const n = inBand.length
    return {
      label: band.label,
      n,
      hitRate: n ? inBand.filter(isHit).length / n : null,
      missRate: n ? inBand.filter(isMiss).length / n : null,
    }
  })
}

/** Biggest surprises: outperformed a modest grade, or underperformed a high one. */
export function surprises(points: HitPoint[], count = 5) {
  const median =
    [...points].sort((a, b) => a.grade - b.grade)[Math.floor(points.length / 2)]?.grade ?? 0
  return {
    hits: points
      .filter((p) => isHit(p) && p.grade < median)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, count),
    misses: points
      .filter((p) => isMiss(p) && p.grade >= median)
      .sort((a, b) => b.grade - a.grade)
      .slice(0, count),
  }
}
