/**
 * Converting a Sleeper projection stat line into a league's own fantasy points.
 *
 * Sleeper ships precomputed `pts_ppr` / `pts_half_ppr` / `pts_std` on every
 * projection, but those are preset scoring — they drift from any league running
 * superflex bonuses, TE premium, per-first-down, or tweaked passing values. The raw
 * components (`pass_yd`, `rec`, `rush_td`, …) are all present, and Sleeper's
 * `scoring_settings` keys live in the same namespace, so exact league points are just
 * the dot product of the two over their shared keys.
 */

export type ScoringSettings = Record<string, number>
export type StatLine = Record<string, number>

/**
 * Present in a projection stat line but never scored: metadata, precomputed totals
 * under preset scoring, and draft-position hints. Excluded explicitly rather than
 * relying on them being absent from `scoring_settings`, since double-counting
 * `pts_ppr` on top of the components would silently double a player's value.
 */
const NON_SCORING_KEYS = new Set([
  'gp',
  'pts_ppr',
  'pts_half_ppr',
  'pts_std',
  'adp_dd_ppr',
  'pos_adp_dd_ppr',
  'cmp_pct',
])

/** League points for one projected stat line. */
export function scoreFromStats(stats: StatLine | undefined, scoring: ScoringSettings): number {
  if (!stats) return 0
  let total = 0
  for (const [key, value] of Object.entries(stats)) {
    if (NON_SCORING_KEYS.has(key)) continue
    const weight = scoring[key]
    if (typeof weight !== 'number' || weight === 0) continue
    const amount = Number(value)
    if (!Number.isFinite(amount)) continue
    total += amount * weight
  }
  return total
}

export interface ScoringCoverage {
  /** Scoring rules that actually pay out but that the feed never projects. */
  unmatchedKeys: string[]
  /** True when every scoring rule with a nonzero value maps to a projected stat. */
  exact: boolean
}

/**
 * Which of a league's scoring rules the projection feed can't satisfy.
 *
 * In practice the gaps are all kicker and defense: points-allowed tiers
 * (`pts_allow_0`, `pts_allow_7_13`, …), field-goal distance bonuses (`fgm_50p`), and
 * special-teams turnovers. A league that starts no K or DEF slot is unaffected —
 * those rules can never fire — so callers should check the lineup before warning.
 */
export function analyzeCoverage(
  scoring: ScoringSettings,
  projectedStatKeys: Iterable<string>
): ScoringCoverage {
  const available = new Set(projectedStatKeys)
  const unmatchedKeys = Object.entries(scoring)
    .filter(([key, weight]) => weight !== 0 && !NON_SCORING_KEYS.has(key) && !available.has(key))
    .map(([key]) => key)
    .sort()
  return { unmatchedKeys, exact: unmatchedKeys.length === 0 }
}

/** Slots that can start a kicker or defense, the only places the gaps above matter. */
export function lineupNeedsKickerOrDefense(rosterPositions: string[] | undefined): boolean {
  if (!Array.isArray(rosterPositions)) return false
  return rosterPositions.some((slot) => {
    const code = slot?.toUpperCase()
    return code === 'K' || code === 'DEF' || code === 'DST'
  })
}
