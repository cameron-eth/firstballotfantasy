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
