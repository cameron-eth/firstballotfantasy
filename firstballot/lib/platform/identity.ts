import 'server-only'
import { TIER_KEY } from '@/lib/dynasty-tiers'
import { identityMap } from './reference-data'
import { readSnapshot } from './snapshots'

/**
 * One player identity for every reader (PR-19, audit R4-1). KTC ↔ Sleeper is resolved once,
 * at tier publish, and stored in the tier snapshot (`identity[sleeperId].ktcId`); ESPN ids
 * come from the weekly identity map with its quarantine applied (PR-13). Readers join KTC by
 * these ids, never by display name.
 */
export type PlayerIdentity = {
  sleeperId: string
  ktcId: number | null
  espnId: string | null
  name: string | null
  position: string | null
}

type TierIdentity = Record<
  string,
  { ktcId?: number; name?: string; position?: string; espnId?: string }
>

/** The tier snapshot changes daily; a short in-memory copy keeps readers off the database. */
const MEMO_MS = 10 * 60 * 1000
let memo: { at: number; value: Promise<TierIdentity> } | null = null

function tierIdentity(): Promise<TierIdentity> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value
  const value = readSnapshot(TIER_KEY).then(
    (row) =>
      ((row?.payload as { identity?: TierIdentity } | undefined)?.identity ?? {}) as TierIdentity
  )
  memo = { at: Date.now(), value }
  value.catch(() => (memo = null))
  return value
}

/** Identities for these Sleeper ids; a player KTC doesn't list has `ktcId: null`. */
export async function resolvePlayers(sleeperIds: string[]): Promise<PlayerIdentity[]> {
  const [tiers, espn] = await Promise.all([tierIdentity(), identityMap()])
  return sleeperIds.map((sleeperId) => {
    const tier = tiers[sleeperId]
    const mapped = espn.data[sleeperId]
    return {
      sleeperId,
      ktcId: typeof tier?.ktcId === 'number' ? tier.ktcId : null,
      espnId: mapped?.espnId ?? (tier?.espnId || null),
      name: tier?.name ?? mapped?.name ?? null,
      position: tier?.position ?? mapped?.position ?? null,
    }
  })
}

/** Sleeper id → KTC id for every KTC-listed player (the reverse of the tier match). */
export async function ktcIdsBySleeper(): Promise<Map<string, number>> {
  const tiers = await tierIdentity()
  return new Map(
    Object.entries(tiers).flatMap(([sleeperId, t]) =>
      typeof t.ktcId === 'number' ? [[sleeperId, t.ktcId] as const] : []
    )
  )
}
