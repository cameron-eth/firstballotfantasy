import { supabaseAdmin } from '@/lib/supabase-server'
import { KTC_DAY_MARKER_PREFIX } from '@/lib/dynasty-tiers'

/**
 * The one answer to "which KTC day is current" (G4). scripts/sync-ktc-values.mjs marks a day
 * complete in ingestion_runs once every row is written (PR-11), so readers never pick a day
 * still being written or left partial. Freshness stays with the caller: KTC_MAX_AGE_MS.
 */
export async function latestKtcDay(): Promise<{ date: string; rowCount: number | null } | null> {
  const { data, error } = await supabaseAdmin
    .from('ingestion_runs')
    .select('dataset,row_count')
    .eq('status', 'success')
    .like('dataset', `${KTC_DAY_MARKER_PREFIX}%`)
    .order('dataset', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('KTC_DAY_MARKERS_UNAVAILABLE')
  return data
    ? { date: data.dataset.slice(KTC_DAY_MARKER_PREFIX.length), rowCount: data.row_count }
    : null
}

/** Every complete KTC day, oldest first. */
export async function completeKtcDays(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('ingestion_runs')
    .select('dataset')
    .eq('status', 'success')
    .like('dataset', `${KTC_DAY_MARKER_PREFIX}%`)
    .limit(5000)
  if (error) throw new Error('KTC_DAYS_UNAVAILABLE')
  return [...new Set((data ?? []).map((r) => r.dataset.slice(KTC_DAY_MARKER_PREFIX.length)))].sort()
}
