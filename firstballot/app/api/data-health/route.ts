import { supabaseAdmin } from '@/lib/supabase-server'
import { freshness } from '@/lib/platform/policy'
import { failure, json } from '@/lib/platform/http'
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('data_snapshots')
      .select('key,source,fetched_at,source_observed_at,expires_at,quality')
      .like('key', 'espn:%')
      .limit(20)
    if (error) throw error
    return json({
      datasets: (data ?? []).map((d) => ({
        ...d,
        status: freshness(d.expires_at, d.source_observed_at),
      })),
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    return failure(e)
  }
}
