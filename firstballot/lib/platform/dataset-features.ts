import {
  DRAFT_CAPITAL_KEY,
  ESPN_PPR_PREFIX,
  HISTORY_OUTCOMES_PREFIX,
  IDENTITIES_KEY,
  PROJECTIONS_PREFIX,
  TIER_KEY,
} from './snapshot-keys'

/**
 * Dataset → feature map for /api/data-health (R4-6). It answers "what does a stale dataset
 * affect": every monitored dataset names the features that read it and the ingestion_runs
 * dataset that records its refreshes. Add a row here when a feature starts reading a dataset.
 */
export const FEATURES = {
  projections: { name: 'League Buddy projections', routes: ['/api/projections'] },
  playerStats: {
    name: 'Season stats and career FPPG',
    routes: ['/api/roster-stats', '/api/v1/players', '/api/mcp'],
  },
  tiers: {
    name: 'Dynasty tiers and Team Map',
    routes: ['/api/dynasty-tiers', '/api/rankings'],
  },
  tradeMarket: { name: 'Trade Market prices', routes: ['/api/trade-market'] },
  ktcValues: {
    name: 'KTC values in Team Builder and Draft Board',
    routes: ['/api/ktc-values'],
  },
  tierRefresh: { name: 'Nightly tier publication', routes: ['/api/dynasty-tiers'] },
  history: {
    name: 'Hits & Misses and Historical Rankings',
    routes: ['/api/history-outcomes'],
  },
  prospects: {
    name: 'Prospect board, Draft board and Scouting Portal',
    routes: ['/api/prospects', '/api/prospects/draftboard'],
  },
  community: {
    name: 'Community ballot and Crowd Rank',
    routes: ['/api/community-rankings', '/api/community-trends'],
  },
} as const

export type FeatureId = keyof typeof FEATURES

export const COMMUNITY_TALLIES_KEY = 'community:tallies'

type DatasetRule = {
  /** An exact key, or a prefix ending in ':'. */
  match: string
  features: FeatureId[]
  /** The ingestion_runs dataset that logs refreshes; the key itself when omitted, null for none. */
  run?: string | null
}

const RULES: DatasetRule[] = [
  { match: PROJECTIONS_PREFIX, features: ['projections'] },
  { match: ESPN_PPR_PREFIX, features: ['playerStats', 'tierRefresh'] },
  { match: TIER_KEY, features: ['tiers', 'tradeMarket'] },
  { match: DRAFT_CAPITAL_KEY, features: ['tierRefresh'] },
  {
    match: IDENTITIES_KEY,
    features: ['ktcValues', 'tierRefresh', 'history'],
    run: 'job:history-outcomes',
  },
  { match: HISTORY_OUTCOMES_PREFIX, features: ['history'], run: 'job:history-outcomes' },
  {
    match: 'ktc:player-values',
    features: ['ktcValues', 'tradeMarket', 'tierRefresh'],
    run: 'job:ktc-history',
  },
  { match: 'prospects:', features: ['prospects', 'community'], run: 'job:college-prospects' },
  { match: COMMUNITY_TALLIES_KEY, features: ['community'], run: null },
]

function ruleFor(key: string) {
  return RULES.find((rule) =>
    rule.match.endsWith(':') ? key.startsWith(rule.match) : key === rule.match
  )
}

export function featuresFor(key: string): FeatureId[] {
  return ruleFor(key)?.features ?? []
}

/** The ingestion_runs dataset recording this dataset's refreshes, or null when none does. */
export function runDatasetFor(key: string): string | null {
  const rule = ruleFor(key)
  if (!rule) return key
  return rule.run === undefined ? key : rule.run
}

export type IngestionRun = {
  dataset: string
  status: string
  started_at: string
  completed_at: string | null
  error_code: string | null
  run_url: string | null
}

/** Latest run and latest failure, from one dataset's runs newest first. */
export function runSummary(runs: IngestionRun[]) {
  const [latest] = runs
  const failed = runs.find((run) => run.status === 'failed')
  return {
    lastRun: latest
      ? {
          status: latest.status,
          at: latest.completed_at ?? latest.started_at,
          runUrl: latest.run_url,
        }
      : null,
    lastError: latest?.status === 'failed' ? (latest.error_code ?? 'UNKNOWN') : null,
    lastFailureAt: failed ? (failed.completed_at ?? failed.started_at) : null,
  }
}

/** When the dataset went past its budget; null while it is within it. */
export function staleSince(status: string, expiresAt: string | null | undefined) {
  return status === 'expired' && expiresAt && Number.isFinite(Date.parse(expiresAt))
    ? expiresAt
    : null
}

/** Features that read at least one expired monitored dataset, with the datasets behind each. */
export function affectedFeatures(datasets: { key: string; status: string }[]) {
  const byFeature = new Map<FeatureId, string[]>()
  for (const dataset of datasets) {
    if (dataset.status !== 'expired') continue
    for (const id of featuresFor(dataset.key))
      byFeature.set(id, [...(byFeature.get(id) ?? []), dataset.key])
  }
  return [...byFeature.entries()].map(([id, keys]) => ({ id, ...FEATURES[id], datasets: keys }))
}

/**
 * Snapshots a reader refreshes when their cache time lapses (ESPN seasons, Sleeper
 * projections). A lapsed one nobody has read yet is idle, not stale: the next read refreshes
 * it. It counts as expired only when its latest refresh failed, or after it has sat idle past
 * the 24 h stale bound those snapshots already declare (player-data.ts, projections route).
 */
const READ_THROUGH_PREFIXES = [ESPN_PPR_PREFIX, PROJECTIONS_PREFIX]
export const READ_THROUGH_MAX_IDLE_MS = 24 * 3600 * 1000

export function settleStatus(
  dataset: {
    key: string
    status: string
    expires_at?: string | null
    source_observed_at?: string | null
  },
  lastRunStatus: string | null,
  now = Date.now()
): { status: string; idleSince: string | null } {
  const readThrough = READ_THROUGH_PREFIXES.some((prefix) => dataset.key.startsWith(prefix))
  const expiredAt = Date.parse(dataset.expires_at ?? '')
  if (
    dataset.status !== 'expired' ||
    !readThrough ||
    lastRunStatus !== 'success' ||
    !Number.isFinite(expiredAt) ||
    now - expiredAt > READ_THROUGH_MAX_IDLE_MS
  )
    return { status: dataset.status, idleSince: null }
  return {
    status: dataset.source_observed_at ? 'current' : 'source-time-unknown',
    idleSince: dataset.expires_at ?? null,
  }
}
