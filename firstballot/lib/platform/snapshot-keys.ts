/**
 * Every data_snapshots key in one place (PR-10, gate G2). Writers and readers build keys
 * only through these, and data-health lists every shared family below.
 */
export { DRAFT_CAPITAL_KEY, TIER_KEY } from '@/lib/dynasty-tiers'
export { HISTORY_OUTCOMES_PREFIX, IDENTITIES_KEY, historyOutcomesKey } from '@/lib/reference-data'

export const ESPN_PPR_PREFIX = 'espn:ppr:'
/** One season of ESPN PPR totals. */
export const espnSeasonKey = (season: number) => `${ESPN_PPR_PREFIX}${season}`

export const PROJECTIONS_PREFIX = 'sleeper:projections:'
/** Sleeper projections for one week, or the whole season. */
export const projectionsKey = (season: number | string, week: number | string | 'season') =>
  `${PROJECTIONS_PREFIX}${season}:${week}`

/** College stats check for one draft class (written by scripts/refresh-college-prospects.py). */
export const prospectStatsKey = (year: number) => `prospects:${year}:espn`
export const PROSPECT_STATS_PATTERN = 'prospects:%:espn'

/** One league's Sleeper rosters. Private per league, so data-health never lists it. */
export const sleeperRostersKey = (leagueId: string) => `sleeper:rosters:${leagueId}`

/**
 * One league's server-computed dashboard metrics (PR-15), per format and week. Private per
 * league, so data-health never lists it.
 */
export const leagueMetricsKey = (leagueId: string, format: 'sf' | '1qb', week: number) =>
  `league-metrics:${leagueId}:${format}:${week}`

/** One league season's teams, trades and traded picks for the Trade Market (PR-16). Private. */
export const tradeMarketSeasonKey = (leagueId: string) => `trade-market:${leagueId}`
