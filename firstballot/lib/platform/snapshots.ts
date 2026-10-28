import 'server-only'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { PlatformError } from './http'
export type Snapshot<T> = {
  payload: T
  source: string
  fetched_at: string
  source_observed_at: string | null
  expires_at: string
  quality: 'validated' | 'unverified'
  content_hash: string
}
// Strict expiration: an upstream failure never extends the lifetime of old data.
export async function snapshot<T>(
  key: string,
  source: string,
  ttlSeconds: number,
  load: () => Promise<{ payload: T; observedAt?: string; season?: number; week?: number }>,
  validate: (p: T) => boolean
): Promise<Snapshot<T>> {
  const { data, error } = await supabaseAdmin
    .from('data_snapshots')
    .select('*')
    .eq('key', key)
    .maybeSingle()
  if (error) throw new PlatformError(503, 'DATA_STORE_UNAVAILABLE', 'Data storage unavailable.')
  if (data && Date.parse(data.expires_at) > Date.now() && validate(data.payload)) return data
  try {
    const loaded = await load()
    if (!validate(loaded.payload)) throw new Error('INVALID_COVERAGE')
    return await writeSnapshot(key, source, ttlSeconds, loaded.payload, loaded)
  } catch {
    await supabaseAdmin.from('ingestion_runs').insert({
      dataset: key,
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_code: 'SOURCE_OR_VALIDATION_FAILED',
    })
    throw new PlatformError(
      503,
      'FRESH_DATA_UNAVAILABLE',
      'Fresh data is unavailable. Retry shortly.'
    )
  }
}
/**
 * Store a snapshot and log the run in ingestion_runs. `snapshot()` calls this after a
 * read-through load. Writers that publish on their own schedule call it directly, so
 * every snapshot write leaves the same row shape and the same log entry.
 */
export async function writeSnapshot<T>(
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
  const { error: writeError } = await supabaseAdmin.from('data_snapshots').upsert(record)
  if (writeError) throw new Error('SNAPSHOT_WRITE_FAILED')
  const { error: logError } = await supabaseAdmin
    .from('ingestion_runs')
    .insert({ dataset: key, status: 'success', completed_at: new Date().toISOString() })
  if (logError) console.error(JSON.stringify({ event: 'ingestion_log_failed', dataset: key }))
  return record
}

export function snapshotMetadata<T>(s: Snapshot<T>) {
  return {
    source: s.source,
    fetchedAt: s.fetched_at,
    sourceObservedAt: s.source_observed_at,
    expiresAt: s.expires_at,
    quality: s.quality,
  }
}
