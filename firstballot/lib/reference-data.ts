/**
 * Player identities and history outcomes as the app reads them (PR-13, audit R2-4).
 *
 * The weekly history job writes both to data_snapshots, so new mappings reach the app
 * without a PR merge; the bundled JSON is the fallback. Either way the quarantine in
 * data/identity-quarantine.json is applied here, so no reader sees a conflicting alias.
 */
import quarantine from '@/data/identity-quarantine.json'
import type { OutcomePlayer, OutcomeSnapshot } from '@/lib/history-outcomes'

export const IDENTITIES_KEY = 'identities:v1'
export const HISTORY_OUTCOMES_PREFIX = 'history-outcomes:'
export const historyOutcomesKey = (season: number) => `${HISTORY_OUTCOMES_PREFIX}${season}`

export type IdentityMap = Record<string, { espnId: string; name: string; position?: string }>

const conflicts = quarantine.conflicts as Record<string, { espnId: string }>
const quarantinedSleeper = new Set(Object.keys(conflicts))
const quarantinedEspn = new Set(Object.values(conflicts).map((c) => c.espnId))

/** Sleeper → ESPN map without quarantined ids or non-numeric ESPN ids. */
export function cleanIdentities(map: IdentityMap): IdentityMap {
  return Object.fromEntries(
    Object.entries(map).filter(
      ([sleeperId, entry]) =>
        !quarantinedSleeper.has(sleeperId) &&
        /^\d+$/.test(entry.espnId) &&
        !quarantinedEspn.has(entry.espnId)
    )
  )
}

/**
 * An outcome player can be joined by ESPN id only with a real, unquarantined id. The
 * bundled file has 56 'NA' ids that all collided on one key, plus two known conflicts.
 */
export function joinableEspnId(player: OutcomePlayer): string | null {
  const id = player.espnId
  return id && /^\d+$/.test(id) && !quarantinedEspn.has(id) ? id : null
}

/** Prefer the job's snapshot when it is valid; otherwise the bundled file. */
export function chooseSource<T>(
  snapshot: { payload: unknown; fetched_at: string } | null,
  bundled: T,
  valid: (payload: unknown) => payload is T
): { data: T; source: 'snapshot' | 'bundled'; fetchedAt: string | null } {
  return snapshot && valid(snapshot.payload)
    ? { data: snapshot.payload, source: 'snapshot', fetchedAt: snapshot.fetched_at }
    : { data: bundled, source: 'bundled', fetchedAt: null }
}

export const isIdentityMap = (p: unknown): p is IdentityMap =>
  typeof p === 'object' && p !== null && !Array.isArray(p) && Object.keys(p).length > 1000

export const isOutcomeSnapshot = (p: unknown): p is OutcomeSnapshot =>
  typeof p === 'object' &&
  p !== null &&
  Array.isArray((p as OutcomeSnapshot).players) &&
  (p as OutcomeSnapshot).players.length > 1000 &&
  Number.isInteger((p as OutcomeSnapshot).season)
