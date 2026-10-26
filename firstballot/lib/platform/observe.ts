import 'server-only'
import type { Principal } from './auth'
import { supabaseAdmin } from '@/lib/supabase-server'
export async function observed<T>(
  p: Principal,
  operation: string,
  run: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  let outcome = 'success'
  try {
    return await run()
  } catch (e) {
    outcome = 'failed'
    throw e
  } finally {
    console.info(
      JSON.stringify({
        event: 'platform_request',
        requestId: p.requestId,
        channel: p.channel,
        operation,
        outcome,
        durationMs: Date.now() - start,
      })
    )
    const { error } = await supabaseAdmin
      .from('audit_events')
      .insert({ account_id: p.accountId, request_id: p.requestId, operation, outcome })
    if (error)
      console.error(JSON.stringify({ event: 'audit_write_failed', requestId: p.requestId }))
  }
}
