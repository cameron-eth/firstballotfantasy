import { webAccount } from '@/lib/platform/auth'
import { billingFor } from '@/lib/platform/teams'
import { teamCapacity } from '@/lib/platform/policy'
import { failure, json } from '@/lib/platform/http'
import { supabaseAdmin } from '@/lib/supabase-server'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request),
      now = new Date(),
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const [{ count, error }, billing] = await Promise.all([
      supabaseAdmin
        .from('usage_events')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', p.accountId)
        .in('channel', ['api', 'mcp'])
        .gte('occurred_at', start.toISOString()),
      billingFor(p.accountId),
    ])
    if (error) throw error
    return json({
      used: count ?? 0,
      limit: teamCapacity(billing) > 1 ? 1000 : 100,
      resetsAt: new Date(start.getTime() + 86400000).toISOString(),
      overageCharges: false,
    })
  } catch (e) {
    return failure(e)
  }
}
