// Unified cache configuration for consistent TTL values and cache keys across the application

// Cache TTL values in milliseconds
export const CACHE_TTL = {
  // Critical data (frequently changing) - Short TTL
  CURRENT_WEEK: 2 * 60 * 1000, // 2 minutes
  TRANSACTIONS: 2 * 60 * 1000, // 2 minutes (reduced from 5 to get fresher trade data)
  LIVE_DATA: 1 * 60 * 1000, // 1 minute

  // League data (moderately stable) - Medium TTL
  LEAGUE_INFO: 10 * 60 * 1000, // 10 minutes
  ROSTERS: 15 * 60 * 1000, // 15 minutes
  USERS: 15 * 60 * 1000, // 15 minutes
  MATCHUPS: 10 * 60 * 1000, // 10 minutes

  // Static data (rarely changes) - Long TTL
  PLAYERS: 60 * 60 * 1000, // 1 hour
  RANKINGS: 60 * 60 * 1000, // 1 hour
  NFL_STATE: 30 * 60 * 1000, // 30 minutes
  PROSPECTS: 24 * 60 * 60 * 1000, // 24 hours

  // User data (session-based) - Session TTL
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes
  USER_SETTINGS: 24 * 60 * 60 * 1000, // 24 hours
  LEAGUE_ID: 24 * 60 * 60 * 1000, // 24 hours

  // Analysis data (computed) - Medium TTL
  TRADE_ANALYSIS: 15 * 60 * 1000, // 15 minutes
  DRAFT_ANALYSIS: 30 * 60 * 1000, // 30 minutes
  TEAM_GRADES: 10 * 60 * 1000, // 10 minutes
} as const

// Cache key prefixes for organization
export const CACHE_PREFIXES = {
  API: 'api_',
  USER: 'user_',
  LEAGUE: 'league_',
  PLAYER: 'player_',
  ANALYSIS: 'analysis_',
  FIRSTBALLOT: 'firstballot_',
} as const

// Unified cache keys with consistent naming
export const CACHE_KEYS = {
  // API Cache Keys
  API: {
    RANKINGS: 'api-rankings',
    SETTINGS: 'api-settings',
    LEAGUE_ROSTER: 'api-league-roster',
    PROSPECTS: 'api-prospects',
    DRAFT_ANALYSIS: 'api-draft-analysis',
    TRADE_MARKET: 'api-trade-market',
    USER_PROFILE: 'api-user-profile',
    MEMBERSHIP: 'api-membership',
    SUBSCRIPTION: 'api-subscription',
    BREAKOUT_BUST: 'api-breakout-bust',
    PLAYER_TIERS: 'api-player-tiers',
    CONVERSION_EXAMPLES: 'api-conversion-examples',
    OVERVIEW: 'api-overview',
    INSIGHTS: 'api-insights',
    CHARTS: 'api-charts',
    METRICS: 'api-metrics',
    TEAM_BUILDER: 'api-team-builder',
    SLEEPER_USER: 'sleeper-user',
    SLEEPER_LEAGUES: 'sleeper-leagues',
    SLEEPER_DRAFTS: 'sleeper-drafts',
    SLEEPER_PICKS: 'sleeper-picks',
    SLEEPER_PLAYERS: 'sleeper-players',
    NFL_STATE: 'nfl-state',
    TRENDING_PLAYERS: 'trending-players',

    // Parameterized keys
    TRADE_MARKET_DATA: (leagueId: string) => `trade_market_${leagueId}`,
    LEAGUE_ROSTER_DATA: (leagueId: string) => `league_roster_${leagueId}`,
    LEAGUE_USERS: (leagueId: string) => `league_users_${leagueId}`,
    LEAGUE_ROSTERS: (leagueId: string) => `league_rosters_${leagueId}`,
    LEAGUE_INFO: (leagueId: string) => `league_info_${leagueId}`,
    TRANSACTIONS: (leagueId: string, week: number) => `transactions_${leagueId}_${week}`,
    TRADED_PICKS: (leagueId: string) => `traded_picks_${leagueId}`,
    ALL_PLAYERS: 'all_players',
    DYNASTY_RANKINGS: 'dynasty_rankings',
    USER_PROFILE_BY_ID: (userId: string) => `user_profile_${userId}`,
  },

  // Local Storage Keys
  LOCAL: {
    SLEEPER_USERNAME: 'firstballot_sleeper_username',
    SLEEPER_USER: 'firstballot_sleeper_user',
    SLEEPER_LEAGUES: 'firstballot_sleeper_leagues',
    CACHE_EXPIRY: 'firstballot_cache_expiry',
    LEAGUE_ID: 'cachedLeagueId',
  },

  // Session Storage Keys
  SESSION: {
    LEAGUE_ID: 'currentLeagueId',
  },
} as const

// Cache configuration for different data types
export const CACHE_CONFIG = {
  // API data configuration
  API_DATA: {
    defaultTTL: CACHE_TTL.LEAGUE_INFO,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
  },

  // Local storage configuration
  LOCAL_STORAGE: {
    defaultTTL: CACHE_TTL.USER_SETTINGS,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxSize: 10 * 1024 * 1024, // 10MB
  },

  // Session storage configuration
  SESSION_STORAGE: {
    defaultTTL: CACHE_TTL.USER_PROFILE,
    cleanupInterval: 30 * 60 * 1000, // 30 minutes
    maxSize: 5 * 1024 * 1024, // 5MB
  },
} as const

// Cache validation rules
export const CACHE_VALIDATION = {
  // Required fields for cache entries
  requiredFields: ['data', 'timestamp', 'ttl'],

  // Maximum cache entry size (5MB)
  maxEntrySize: 5 * 1024 * 1024,

  // Maximum number of cache entries
  maxEntries: 1000,

  // Cache entry validation
  isValidEntry: (entry: any): boolean => {
    return (
      entry &&
      typeof entry.data !== 'undefined' &&
      typeof entry.timestamp === 'number' &&
      typeof entry.ttl === 'number' &&
      entry.timestamp > 0 &&
      entry.ttl > 0
    )
  },
} as const
