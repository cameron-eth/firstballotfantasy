import 'server-only'
import bundledIdentities from '@/data/nfl-player-identities.json'
import bundledOutcomes from '@/data/history-outcomes.json'
import type { OutcomeSnapshot } from '@/lib/history-outcomes'
import {
  chooseSource,
  cleanIdentities,
  HISTORY_OUTCOMES_PREFIX,
  IDENTITIES_KEY,
  isIdentityMap,
  isOutcomeSnapshot,
  type IdentityMap,
} from '@/lib/reference-data'
import { latestSnapshot, readSnapshot } from './snapshots'

/** The job writes weekly, so a short in-memory copy keeps every request off the database. */
const MEMO_MS = 10 * 60 * 1000

async function loadIdentities() {
  const chosen = chooseSource(
    await readSnapshot(IDENTITIES_KEY).catch(() => null),
    bundledIdentities as IdentityMap,
    isIdentityMap
  )
  return { ...chosen, data: cleanIdentities(chosen.data) }
}

/** Sleeper → ESPN ids: the job's snapshot, else the bundled file; quarantine applied. */
let memo: { at: number; value: ReturnType<typeof loadIdentities> } | null = null

export function identityMap() {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value
  const value = loadIdentities()
  memo = { at: Date.now(), value }
  return value
}

/** Career outcomes: the newest season the job published, else the bundled file. */
export async function historyOutcomes() {
  return chooseSource(
    await latestSnapshot(HISTORY_OUTCOMES_PREFIX).catch(() => null),
    bundledOutcomes as OutcomeSnapshot,
    isOutcomeSnapshot
  )
}
