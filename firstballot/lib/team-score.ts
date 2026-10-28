import { CORE_POSITIONS, playerValue } from '@/lib/sleeper-sdk'
import type { PlayerData, TeamData } from '@/components/league-buddy/types'

/**
 * Team scoring that rewards quality over quantity.
 *
 * Two rules keep a pile of depth from outscoring a few great players:
 * 1. Convex value: each player counts as ceiling * (value / ceiling)^1.5, so one 9,000 KTC player
 *    is worth far more than three 3,000 KTC players (the same idea as KTC's 2-for-1 adjustment).
 * 2. Depth decay: the best LINEUP_DEPTH players count fully; each next one counts less and the
 *    deep bench counts almost nothing.
 *
 * The same rules apply to production (fantasy points per game), so a team's score reflects
 * how good its best players are, not how many players it rosters.
 */
export const TEAM_SCORE_RULES = {
  version: 1,
  /** Starters plus flex in a typical superflex lineup. */
  lineupDepth: 9,
  /** Exponent > 1 makes stars worth more than the sum of lesser players. */
  convexity: 1.5,
  valueCeiling: 9999,
  /** PPR points per game treated as elite. */
  productionCeiling: 25,
  /** Share of the composite from dynasty value; the rest is production. */
  valueWeight: 0.7,
}

export const depthWeight = (index: number) =>
  index < TEAM_SCORE_RULES.lineupDepth ? 1 : 0.5 ** ((index - TEAM_SCORE_RULES.lineupDepth + 1) / 2)

/** Sum of convex, depth-weighted values; best first. */
export function qualityWeighted(values: number[], ceiling: number) {
  return [...values]
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b - a)
    .reduce(
      (sum, v, i) =>
        sum + depthWeight(i) * ceiling * Math.min(1, v / ceiling) ** TEAM_SCORE_RULES.convexity,
      0
    )
}

const core = (players: PlayerData[]) =>
  players.filter((p) =>
    (CORE_POSITIONS as readonly string[]).includes(p.position?.toUpperCase() ?? '')
  )

export function teamValueScore(players: PlayerData[]) {
  return Math.round(
    qualityWeighted(
      core(players).map((p) => playerValue(p, { superflex: true })),
      TEAM_SCORE_RULES.valueCeiling
    )
  )
}

export function teamProductionScore(players: PlayerData[]) {
  return qualityWeighted(
    core(players)
      .filter((p) => (p.games_played ?? 0) > 0)
      .map((p) => p.fantasy_ppg ?? 0),
    TEAM_SCORE_RULES.productionCeiling
  )
}

/**
 * 0-100 composite per team, relative to the league: 70% quality-weighted dynasty value,
 * 30% quality-weighted production. A league with no production yet scores on value alone.
 */
export function teamScores(teams: TeamData[]) {
  const raw = teams.map((t) => ({
    rosterId: t.rosterId,
    value: teamValueScore(t.players),
    production: teamProductionScore(t.players),
  }))
  const maxValue = Math.max(1, ...raw.map((r) => r.value))
  const maxProduction = Math.max(0, ...raw.map((r) => r.production))
  const { valueWeight } = TEAM_SCORE_RULES
  return new Map(
    raw.map((r) => [
      r.rosterId,
      {
        value: r.value,
        production: r.production,
        composite: Math.round(
          100 *
            (maxProduction > 0
              ? valueWeight * (r.value / maxValue) +
                (1 - valueWeight) * (r.production / maxProduction)
              : r.value / maxValue)
        ),
      },
    ])
  )
}
