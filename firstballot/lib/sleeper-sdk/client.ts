// Layer 1 of the Sleeper SDK: transport only. No business logic lives here.
//
// Every method is a thin, typed wrapper over one documented endpoint. Joining,
// normalizing and scoring happen in the layers above (see ./values.ts), which keeps
// this file safe to call from either the browser or a route handler.

import type {
  SleeperLeague,
  SleeperLeagueDraft,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperNflState,
  SleeperPlayer,
  SleeperRoster,
  SleeperTradedPick,
  SleeperTransaction,
  SleeperTrendingItem,
  SleeperUser,
} from './types'

export interface SleeperClientOptions {
  baseUrl?: string
  fetcher?: typeof fetch
  /** Total attempts per request, including the first. */
  retries?: number
  timeoutMs?: number
}

/** Per-read fetch cache settings (Next.js data cache on the server, HTTP cache in the browser). */
export interface SleeperReadOptions {
  cache?: RequestCache
  next?: { revalidate?: number | false; tags?: string[] }
  timeoutMs?: number
  /** Total attempts for this read; defaults to the client's `retries`. */
  attempts?: number
}

/**
 * Cache settings per endpoint, carried over unchanged from the retired `sleeperApi` wrapper
 * (lib/nextjs-cache.ts, PR-21). Tags match the old CACHE_TAGS values.
 */
export const SLEEPER_CACHE = {
  league: { cache: 'force-cache', next: { revalidate: 600, tags: ['league'] } },
  rosters: { cache: 'force-cache', next: { revalidate: 300, tags: ['league'] } },
  matchups: { cache: 'force-cache', next: { revalidate: 120, tags: ['league'] } },
  transactions: { cache: 'force-cache', next: { revalidate: 120, tags: ['transactions'] } },
  tradedPicks: { cache: 'force-cache', next: { revalidate: 600, tags: ['league'] } },
  players: { cache: 'force-cache', next: { revalidate: 3600, tags: ['players'] } },
  trending: { cache: 'force-cache', next: { revalidate: 60, tags: ['players'] } },
  user: { cache: 'force-cache', next: { revalidate: 1800, tags: ['user'] } },
  fresh: { cache: 'no-store' },
} as const satisfies Record<string, SleeperReadOptions>

/** The players file is ~18 MB; 10 s is too short for it on a slow connection. */
const PLAYERS_TIMEOUT_MS = 30_000

export class SleeperApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly path?: string
  ) {
    super(message)
    this.name = 'SleeperApiError'
  }
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

export class SleeperClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch
  private readonly retries: number
  private readonly timeoutMs: number

  constructor(options: SleeperClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.sleeper.app/v1'
    // Resolved per call, so a fetch installed after import (tests, fixture replay) is used.
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init))
    this.retries = options.retries ?? 3
    this.timeoutMs = options.timeoutMs ?? 10_000
  }

  private async get<T>(path: string, options: SleeperReadOptions = {}): Promise<T> {
    const { timeoutMs = this.timeoutMs, attempts = this.retries, ...cache } = options
    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await this.fetcher(`${this.baseUrl}${path}`, {
          ...cache,
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        })

        if (!response.ok) {
          const error = new SleeperApiError(
            `Sleeper API ${response.status} ${response.statusText}`,
            response.status,
            path
          )
          if (RETRYABLE_STATUS.has(response.status) && attempt < attempts) {
            lastError = error
            await delay(attempt * 500)
            continue
          }
          throw error
        }

        return (await response.json()) as T
      } catch (error) {
        lastError = error
        if (error instanceof SleeperApiError && !RETRYABLE_STATUS.has(error.status ?? 0))
          throw error
        if (attempt === attempts) break
        await delay(attempt * 500)
      }
    }

    if (lastError instanceof SleeperApiError) throw lastError
    throw new SleeperApiError(
      lastError instanceof Error ? lastError.message : `Sleeper API request failed for ${path}`,
      undefined,
      path
    )
  }

  /** Any other endpoint, by path from the API root (`/league/1/drafts`). */
  read = <T>(path: string, options?: SleeperReadOptions) => this.get<T>(path, options)

  // Identity + league discovery
  getUser = (usernameOrUserId: string, options?: SleeperReadOptions) =>
    this.get<SleeperUser | null>(`/user/${encodeURIComponent(usernameOrUserId)}`, options)
  getNflState = (options?: SleeperReadOptions) => this.get<SleeperNflState>('/state/nfl', options)
  getUserLeagues = (
    userId: string,
    season: string | number,
    sport = 'nfl',
    options?: SleeperReadOptions
  ) =>
    this.get<SleeperLeague[]>(
      `/user/${encodeURIComponent(userId)}/leagues/${sport}/${season}`,
      options
    )

  // League context
  getLeague = (leagueId: string, options?: SleeperReadOptions) =>
    this.get<SleeperLeague>(`/league/${leagueId}`, options)
  getLeagueUsers = (leagueId: string, options?: SleeperReadOptions) =>
    this.get<SleeperLeagueUser[]>(`/league/${leagueId}/users`, options)
  getLeagueRosters = (leagueId: string, options?: SleeperReadOptions) =>
    this.get<SleeperRoster[]>(`/league/${leagueId}/rosters`, options)
  getMatchups = (leagueId: string, week: number, options?: SleeperReadOptions) =>
    this.get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`, options)

  // Capital + activity
  getTransactions = (leagueId: string, week: number, options?: SleeperReadOptions) =>
    this.get<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`, options)
  getLeagueTradedPicks = (leagueId: string, options?: SleeperReadOptions) =>
    this.get<SleeperTradedPick[]>(`/league/${leagueId}/traded_picks`, options)
  getLeagueDrafts = (leagueId: string, options?: SleeperReadOptions) =>
    this.get<SleeperLeagueDraft[]>(`/league/${leagueId}/drafts`, options)

  // Player resolution — large payload, cache aggressively upstream.
  getAllPlayers = (options?: SleeperReadOptions) =>
    this.get<Record<string, SleeperPlayer>>('/players/nfl', {
      timeoutMs: PLAYERS_TIMEOUT_MS,
      ...options,
    })
  getTrendingPlayers = (
    type: 'add' | 'drop' = 'add',
    hours = 24,
    limit = 25,
    options?: SleeperReadOptions
  ) =>
    this.get<SleeperTrendingItem[]>(
      `/players/nfl/trending/${type}?lookback_hours=${hours}&limit=${limit}`,
      options
    )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const sleeperClient = new SleeperClient()
