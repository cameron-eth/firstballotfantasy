// Next.js-aware caching utility that integrates with Next.js built-in caching
import { CACHE_TTL, CACHE_KEYS } from './cache-config'

// Next.js cache options for different data types
export const NEXTJS_CACHE_OPTIONS = {
  // Critical data (frequently changing) - Short revalidation
  CURRENT_WEEK: { 
    cache: 'force-cache' as const,
    next: { revalidate: 120 } // 2 minutes
  },
  TRANSACTIONS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 300 } // 5 minutes
  },
  LIVE_DATA: { 
    cache: 'force-cache' as const,
    next: { revalidate: 60 } // 1 minute
  },
  
  // League data (moderately stable) - Medium revalidation
  LEAGUE_INFO: { 
    cache: 'force-cache' as const,
    next: { revalidate: 600 } // 10 minutes
  },
  ROSTERS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 900 } // 15 minutes
  },
  USERS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 900 } // 15 minutes
  },
  MATCHUPS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 600 } // 10 minutes
  },
  
  // Static data (rarely changes) - Long revalidation
  PLAYERS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 3600 } // 1 hour
  },
  RANKINGS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 3600 } // 1 hour
  },
  NFL_STATE: { 
    cache: 'force-cache' as const,
    next: { revalidate: 1800 } // 30 minutes
  },
  PROSPECTS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 86400 } // 24 hours
  },
  
  // User data (session-based) - Session revalidation
  USER_PROFILE: { 
    cache: 'force-cache' as const,
    next: { revalidate: 1800 } // 30 minutes
  },
  USER_SETTINGS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 86400 } // 24 hours
  },
  
  // Analysis data (computed) - Medium revalidation
  TRADE_ANALYSIS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 900 } // 15 minutes
  },
  DRAFT_ANALYSIS: { 
    cache: 'force-cache' as const,
    next: { revalidate: 1800 } // 30 minutes
  },
  TEAM_GRADES: { 
    cache: 'force-cache' as const,
    next: { revalidate: 600 } // 10 minutes
  }
} as const

// Cache tags for on-demand revalidation
export const CACHE_TAGS = {
  LEAGUE: 'league',
  USER: 'user',
  PLAYERS: 'players',
  RANKINGS: 'rankings',
  NFL_STATE: 'nfl-state',
  TRANSACTIONS: 'transactions',
  DRAFT: 'draft',
  ANALYSIS: 'analysis'
} as const

// Next.js-aware fetch wrapper
export async function cachedFetch<T>(
  url: string, 
  cacheType: keyof typeof NEXTJS_CACHE_OPTIONS,
  tags: string[] = []
): Promise<T> {
  const cacheOptions = NEXTJS_CACHE_OPTIONS[cacheType]
  
  // Add cache tags if provided
  const options = tags.length > 0 
    ? { ...cacheOptions, next: { ...cacheOptions.next, tags } }
    : cacheOptions

  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  
  return response.json()
}

// Specialized fetch functions for different data types
export const sleeperApi = {
  // NFL State (frequently changing)
  getNflState: () => 
    cachedFetch('https://api.sleeper.app/v1/state/nfl', 'NFL_STATE', [CACHE_TAGS.NFL_STATE]),
  
  // League data (moderately stable)
  getLeagueInfo: (leagueId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}`, 'LEAGUE_INFO', [CACHE_TAGS.LEAGUE]),
  
  getLeagueRosters: (leagueId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, 'ROSTERS', [CACHE_TAGS.LEAGUE]),
  
  getLeagueUsers: (leagueId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, 'USERS', [CACHE_TAGS.LEAGUE]),
  
  getLeagueMatchups: (leagueId: string, week: number) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, 'MATCHUPS', [CACHE_TAGS.LEAGUE]),
  
  // Transactions (frequently changing)
  getTransactions: (leagueId: string, week: number) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`, 'TRANSACTIONS', [CACHE_TAGS.TRANSACTIONS]),
  
  getTradedPicks: (leagueId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`, 'LEAGUE_INFO', [CACHE_TAGS.LEAGUE]),
  
  // Static data (rarely changes)
  getAllPlayers: () => 
    cachedFetch('https://api.sleeper.app/v1/players/nfl', 'PLAYERS', [CACHE_TAGS.PLAYERS]),
  
  getTrendingPlayers: () => 
    cachedFetch('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=10', 'LIVE_DATA', [CACHE_TAGS.PLAYERS]),
  
  // User data
  getUser: (userId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/user/${userId}`, 'USER_PROFILE', [CACHE_TAGS.USER]),
  
  getUserLeagues: (userId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/user/${userId}/leagues/nfl/2025`, 'USER_SETTINGS', [CACHE_TAGS.USER]),
  
  // Draft data
  getDraft: (draftId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/draft/${draftId}`, 'DRAFT_ANALYSIS', [CACHE_TAGS.DRAFT]),
  
  getDraftPicks: (draftId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`, 'DRAFT_ANALYSIS', [CACHE_TAGS.DRAFT]),
  
  getDraftTradedPicks: (draftId: string) => 
    cachedFetch(`https://api.sleeper.app/v1/draft/${draftId}/traded_picks`, 'DRAFT_ANALYSIS', [CACHE_TAGS.DRAFT])
}

// Utility for uncached requests (when data must be fresh)
export async function uncachedFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  
  return response.json()
}

// Revalidation utilities
export const revalidateCache = {
  // Revalidate all league data
  league: async (leagueId: string) => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.LEAGUE)
  },
  
  // Revalidate all user data
  user: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.USER)
  },
  
  // Revalidate all player data
  players: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.PLAYERS)
  },
  
  // Revalidate all rankings
  rankings: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.RANKINGS)
  },
  
  // Revalidate NFL state
  nflState: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.NFL_STATE)
  },
  
  // Revalidate transactions
  transactions: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.TRANSACTIONS)
  },
  
  // Revalidate draft data
  draft: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.DRAFT)
  },
  
  // Revalidate analysis data
  analysis: async () => {
    const { revalidateTag } = await import('next/cache')
    await revalidateTag(CACHE_TAGS.ANALYSIS)
  }
} 