import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { PlatformError } from './http'
import { sessionUser } from './session'
export type Principal = {
  accountId: string
  email?: string
  channel: 'web' | 'api' | 'mcp'
  scopes: string[]
  teamIds: string[] | null
  requestId: string
}
/** The browser session middleware.ts verified, metered. The JWT is not checked a second time. */
export async function webAccount(request: Request): Promise<Principal> {
  const session = sessionUser(request)
  const requestId = randomUUID()
  const { data: allowed, error: meterError } = await supabaseAdmin.rpc('consume_platform_usage', {
    p_account: session.userId,
    p_request: requestId,
    p_operation: 'web:account',
    p_channel: 'web',
  })
  if (meterError)
    throw new PlatformError(
      503,
      'PLATFORM_NOT_READY',
      'Account services are being prepared. Please retry shortly.'
    )
  if (!allowed)
    throw new PlatformError(429, 'RATE_LIMIT', 'Too many requests. Please wait a minute.')
  return {
    accountId: session.userId,
    email: session.email,
    channel: 'web',
    scopes: [],
    teamIds: null,
    requestId,
  }
}
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
export async function apiAccount(
  request: Request,
  scope: string,
  channel: 'api' | 'mcp' = 'api'
): Promise<Principal> {
  const token = request.headers.get('authorization')?.match(/^Bearer (fb_[a-f0-9]{64})$/)?.[1]
  if (!token)
    throw new PlatformError(401, 'UNAUTHENTICATED', 'Provide a First Ballot API access token.')
  const { data, error } = await supabaseAdmin
    .from('api_access_tokens')
    .select('id,account_id,scopes,team_ids,expires_at,revoked_at')
    .eq('token_hash', tokenHash(token))
    .maybeSingle()
  if (error) throw new PlatformError(503, 'AUTH_UNAVAILABLE', 'Access verification unavailable.')
  if (!data || data.revoked_at || Date.parse(data.expires_at) <= Date.now())
    throw new PlatformError(401, 'INVALID_TOKEN', 'Access token expired or revoked.')
  if (!data.scopes.includes(scope))
    throw new PlatformError(
      403,
      'INSUFFICIENT_SCOPE',
      'This token does not have the required scope.'
    )
  const principal: Principal = {
    accountId: data.account_id,
    channel,
    scopes: data.scopes,
    teamIds: data.team_ids,
    requestId: randomUUID(),
  }
  const { data: allowed, error: quotaError } = await supabaseAdmin.rpc('consume_platform_usage', {
    p_account: principal.accountId,
    p_request: principal.requestId,
    p_operation: scope,
    p_channel: channel,
  })
  if (quotaError)
    throw new PlatformError(503, 'METER_UNAVAILABLE', 'Usage verification unavailable.')
  if (!allowed)
    throw new PlatformError(429, 'DAILY_LIMIT', 'Daily API allowance reached. Resets at 00:00 UTC.')
  await supabaseAdmin
    .from('api_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  return principal
}
