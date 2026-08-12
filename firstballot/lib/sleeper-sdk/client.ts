// Layer 1 of the Sleeper SDK: transport only. No business logic lives here.
//
// Every method is a thin, typed wrapper over one documented endpoint. Joining,
// normalizing and scoring happen in the layers above (see ./values.ts), which keeps
// this file safe to call from either the browser or a route handler.

import type {
  SleeperLeague,
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
    this.fetcher = options.fetcher ?? fetch
    this.retries = options.retries ?? 3
    this.timeoutMs = options.timeoutMs ?? 10_000
  }

  private async get<T>(path: string): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.fetcher(`${this.baseUrl}${path}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.timeoutMs),
        })

        if (!response.ok) {
          const error = new SleeperApiError(
            `Sleeper API ${response.status} ${response.statusText}`,
            response.status,
            path
          )
          if (RETRYABLE_STATUS.has(response.status) && attempt < this.retries) {
            lastError = error
            await delay(attempt * 500)
            continue
          }
          throw error
        }

        return (await response.json()) as T
      } catch (error) {
        lastError = error
        if (error instanceof SleeperApiError && !RETRYABLE_STATUS.has(error.status ?? 0)) throw error
        if (attempt === this.retries) break
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

  // Identity + league discovery
  getUser = (usernameOrUserId: string) => this.get<SleeperUser>(`/user/${usernameOrUserId}`)
  getNflState = () => this.get<SleeperNflState>('/state/nfl')
  getUserLeagues = (userId: string, season: string | number, sport = 'nfl') =>
    this.get<SleeperLeague[]>(`/user/${userId}/leagues/${sport}/${season}`)

  // League context
  getLeague = (leagueId: string) => this.get<SleeperLeague>(`/league/${leagueId}`)
  getLeagueUsers = (leagueId: string) => this.get<SleeperLeagueUser[]>(`/league/${leagueId}/users`)
  getLeagueRosters = (leagueId: string) => this.get<SleeperRoster[]>(`/league/${leagueId}/rosters`)
  getMatchups = (leagueId: string, week: number) =>
    this.get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)

  // Capital + activity
  getTransactions = (leagueId: string, week: number) =>
    this.get<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`)
  getLeagueTradedPicks = (leagueId: string) =>
    this.get<SleeperTradedPick[]>(`/league/${leagueId}/traded_picks`)

  // Player resolution — large payload, cache aggressively upstream.
  getAllPlayers = (sport = 'nfl') => this.get<Record<string, SleeperPlayer>>(`/players/${sport}`)
  getTrendingPlayers = (type: 'add' | 'drop' = 'add', hours = 24, limit = 25, sport = 'nfl') =>
    this.get<SleeperTrendingItem[]>(
      `/players/${sport}/trending/${type}?lookback_hours=${hours}&limit=${limit}`
    )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const sleeperClient = new SleeperClient()
