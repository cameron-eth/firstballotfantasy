import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import { PlatformError } from './http'
import {
  snapshotFrom,
  SnapshotUnavailable,
  writeSnapshotTo,
  type Snapshot,
  type SnapshotOptions,
  type SnapshotStore,
} from './snapshot-core'

export { snapshotMetadata, type Snapshot } from './snapshot-core'

const store: SnapshotStore = {
  read: async (key) => {
    const { data, error } = await supabaseAdmin
      .from('data_snapshots')
      .select('*')
      .eq('key', key)
      .maybeSingle()
    return { data, error }
  },
  write: async (record) => {
    const { error } = await supabaseAdmin.from('data_snapshots').upsert(record)
    return { error }
  },
  log: async (row) => {
    const { error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({ ...row, completed_at: new Date().toISOString() })
    return { error }
  },
}

/**
 * Stale-while-error is off unless SNAPSHOT_STALE_WHILE_ERROR=1 in this environment, so
 * turning the variable off is the rollback (PR-12). Callers still choose a stale bound.
 */
const staleAllowed = () => process.env.SNAPSHOT_STALE_WHILE_ERROR === '1'

export async function snapshot<T>(
  key: string,
  source: string,
  ttlSeconds: number,
  load: () => Promise<{ payload: T; observedAt?: string; season?: number; week?: number }>,
  validate: (p: T) => boolean,
  options: SnapshotOptions = {}
): Promise<Snapshot<T>> {
  try {
    return await snapshotFrom(store, key, source, ttlSeconds, load, validate, {
      ...options,
      staleAllowed: staleAllowed(),
    })
  } catch (error) {
    if (error instanceof SnapshotUnavailable && error.code === 'DATA_STORE_UNAVAILABLE')
      throw new PlatformError(503, 'DATA_STORE_UNAVAILABLE', 'Data storage unavailable.')
    throw new PlatformError(
      503,
      'FRESH_DATA_UNAVAILABLE',
      'Fresh data is unavailable. Retry shortly.'
    )
  }
}

/** A snapshot row as stored, or null; for data a job publishes on its own schedule. */
export async function readSnapshot(key: string) {
  const { data, error } = await store.read(key)
  if (error) throw new PlatformError(503, 'DATA_STORE_UNAVAILABLE', 'Data storage unavailable.')
  return data
}

/** The newest snapshot under a key prefix such as `history-outcomes:` (keys sort by season). */
export async function latestSnapshot(prefix: string) {
  const { data, error } = await supabaseAdmin
    .from('data_snapshots')
    .select('*')
    .like('key', `${prefix}%`)
    .order('key', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new PlatformError(503, 'DATA_STORE_UNAVAILABLE', 'Data storage unavailable.')
  return data
}

/**
 * Store a snapshot and log the run in ingestion_runs. `snapshot()` calls this after a
 * read-through load. Writers that publish on their own schedule call it directly, so
 * every snapshot write leaves the same row shape and the same log entry.
 */
export function writeSnapshot<T>(
  key: string,
  source: string,
  ttlSeconds: number,
  payload: T,
  meta: { observedAt?: string; season?: number; week?: number } = {}
): Promise<Snapshot<T>> {
  return writeSnapshotTo(store, key, source, ttlSeconds, payload, meta)
}
