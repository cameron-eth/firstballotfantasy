import { SLEEPER_CACHE, sleeperClient } from './sleeper-sdk/client'

/**
 * Sleeper reads shared by the dashboard's loaders on one page (PR-18, audit R3-4).
 *
 * The league data, draft order and playoff-odds loaders each fetched the league record,
 * NFL state and this week's matchups on first load (up to 4× the same URL). In the browser,
 * calls for the same URL within a few seconds share one request; each caller gets its own
 * copy of the JSON, so no caller can change another's data. On the server (the metrics
 * route) every call fetches, so nothing is shared between requests.
 */

/** Long enough to cover one dashboard load, short enough that a refresh refetches. */
const SHARE_MS = 10_000

const recent = new Map<string, { at: number; json: Promise<unknown> }>()

const readJson = (path: string) => sleeperClient.read<unknown>(path, SLEEPER_CACHE.fresh)

/** `path` is from the Sleeper API root, e.g. `/league/123` (PR-21: the client owns the host). */
export function sharedSleeperJson<T>(path: string): Promise<T> {
  if (typeof window === 'undefined') return readJson(path) as Promise<T>
  const hit = recent.get(path)
  if (hit && Date.now() - hit.at < SHARE_MS) return hit.json.then(structuredClone) as Promise<T>
  const json = readJson(path)
  recent.set(path, { at: Date.now(), json })
  json.catch(() => recent.delete(path))
  return json.then(structuredClone) as Promise<T>
}

/** For tests: forget shared reads. */
export function clearSharedSleeperReads() {
  recent.clear()
}

export const sleeperState = () => sharedSleeperJson<any>('/state/nfl')
export const sleeperLeague = (leagueId: string) => sharedSleeperJson<any>(`/league/${leagueId}`)
export const sleeperMatchups = (leagueId: string, week: number) =>
  sharedSleeperJson<any[]>(`/league/${leagueId}/matchups/${week}`)
