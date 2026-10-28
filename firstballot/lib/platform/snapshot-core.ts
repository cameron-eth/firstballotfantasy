// The snapshot cache without its storage, so tests can run it against an in-memory store.
// lib/platform/snapshots.ts binds it to Supabase.
import { createHash } from 'node:crypto'

export type Snapshot<T> = {
  payload: T
  source: string
  fetched_at: string
  source_observed_at: string | null
  expires_at: string
  quality: 'validated' | 'unverified'
  content_hash: string
  /**
   * True when the provider failed and this is the last good copy past its expiry
   * (stale-while-error, PR-12). Every response that serves it says so.
   */
  stale?: boolean
}

export interface SnapshotRecord<T> extends Snapshot<T> {
  key: string
  season: number | null
  week: number | null
}

export interface SnapshotStore {
  read(key: string): Promise<{ data: SnapshotRecord<unknown> | null; error: unknown }>
  write(record: SnapshotRecord<unknown>): Promise<{ error: unknown }>
  log(row: {
    dataset: string
    status: 'success' | 'failed'
    error_code?: string
  }): Promise<{ error: unknown }>
}

export interface SnapshotOptions {
  /**
   * Serve the expired copy, flagged `stale`, when the provider fails, for at most this
   * many seconds past expiry. Off unless the caller passes it and the environment enables
   * stale-while-error.
   */
  maxStaleSeconds?: number
}

export class SnapshotUnavailable extends Error {
  constructor(readonly code: 'DATA_STORE_UNAVAILABLE' | 'FRESH_DATA_UNAVAILABLE') {
    super(code)
  }
}

export async function writeSnapshotTo<T>(
  store: SnapshotStore,
  key: string,
  source: string,
  ttlSeconds: number,
  payload: T,
  meta: { observedAt?: string; season?: number; week?: number } = {}
): Promise<Snapshot<T>> {
  const now = Date.now()
  const record = {
    key,
    source,
    payload,
    fetched_at: new Date(now).toISOString(),
    source_observed_at: meta.observedAt ?? null,
    expires_at: new Date(now + ttlSeconds * 1000).toISOString(),
    quality: meta.observedAt ? ('validated' as const) : ('unverified' as const),
    content_hash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    season: meta.season ?? null,
    week: meta.week ?? null,
  }
  const { error: writeError } = await store.write(record)
  if (writeError) throw new Error('SNAPSHOT_WRITE_FAILED')
  const { error: logError } = await store.log({ dataset: key, status: 'success' })
  if (logError) console.error(JSON.stringify({ event: 'ingestion_log_failed', dataset: key }))
  return record
}

// Strict expiration by default: an upstream failure never extends the lifetime of old data
// unless the caller opts into a bounded, labelled stale copy.
export async function snapshotFrom<T>(
  store: SnapshotStore,
  key: string,
  source: string,
  ttlSeconds: number,
  load: () => Promise<{ payload: T; observedAt?: string; season?: number; week?: number }>,
  validate: (p: T) => boolean,
  options: SnapshotOptions & { staleAllowed: boolean } = { staleAllowed: false }
): Promise<Snapshot<T>> {
  const { data, error } = await store.read(key)
  if (error) throw new SnapshotUnavailable('DATA_STORE_UNAVAILABLE')
  const existing = data as SnapshotRecord<T> | null
  if (existing && Date.parse(existing.expires_at) > Date.now() && validate(existing.payload))
    return existing
  try {
    const loaded = await load()
    if (!validate(loaded.payload)) throw new Error('INVALID_COVERAGE')
    return await writeSnapshotTo(store, key, source, ttlSeconds, loaded.payload, loaded)
  } catch {
    const staleFor = existing ? (Date.now() - Date.parse(existing.expires_at)) / 1000 : Infinity
    const serveStale =
      options.staleAllowed &&
      options.maxStaleSeconds !== undefined &&
      existing !== null &&
      staleFor <= options.maxStaleSeconds &&
      validate(existing.payload)
    await store.log({
      dataset: key,
      status: 'failed',
      error_code: serveStale ? 'SOURCE_FAILED_SERVED_STALE' : 'SOURCE_OR_VALIDATION_FAILED',
    })
    if (serveStale) return { ...existing, stale: true }
    throw new SnapshotUnavailable('FRESH_DATA_UNAVAILABLE')
  }
}

export function snapshotMetadata<T>(s: Snapshot<T>) {
  return {
    source: s.source,
    fetchedAt: s.fetched_at,
    sourceObservedAt: s.source_observed_at,
    expiresAt: s.expires_at,
    quality: s.quality,
    /** The provider failed; this is the last good copy, past its expiry. */
    stale: s.stale === true,
  }
}
