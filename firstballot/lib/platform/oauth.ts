import 'server-only'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'
import { getSupabaseUrl } from '@/lib/supabase-config'
import { supabaseAdmin } from '@/lib/supabase-server'
import { apiAccount, type Principal } from './auth'
import { PlatformError } from './http'
const issuer = `${getSupabaseUrl()}/auth/v1`
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
export function mcpResource() {
  return `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.firstballotff.com'}/api/mcp`
}
export async function mcpAccount(request: Request): Promise<Principal> {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (token?.startsWith('fb_')) return apiAccount(request, 'teams:read', 'mcp')
  if (!token || process.env.MCP_OAUTH_ENABLED !== 'true')
    throw new PlatformError(
      401,
      'OAUTH_REQUIRED',
      'Connect your First Ballot account or use a read-only API token.'
    )
  let payload
  try {
    payload = (
      await jwtVerify(token, jwks, {
        issuer,
        audience: mcpResource(),
        algorithms: ['ES256', 'RS256'],
        requiredClaims: ['sub', 'exp', 'iat', 'client_id'],
      })
    ).payload
  } catch {
    throw new PlatformError(401, 'INVALID_TOKEN', 'OAuth token is invalid or expired.')
  }
  if (typeof payload.sub !== 'string' || typeof payload.client_id !== 'string')
    throw new PlatformError(401, 'INVALID_TOKEN', 'OAuth identity is invalid.')
  const { data: grant, error } = await supabaseAdmin
    .from('oauth_team_grants')
    .select('team_ids,scopes,revoked_at')
    .eq('account_id', payload.sub)
    .eq('client_id', payload.client_id)
    .maybeSingle()
  if (error) throw new PlatformError(503, 'GRANT_UNAVAILABLE', 'Could not verify access.')
  if (!grant || grant.revoked_at)
    throw new PlatformError(
      403,
      'GRANT_REVOKED',
      'Approve or reconnect this application in First Ballot.'
    )
  const p: Principal = {
    accountId: payload.sub,
    channel: 'mcp',
    scopes: grant.scopes,
    teamIds: grant.team_ids,
    requestId: randomUUID(),
  }
  const { data: allowed, error: quotaError } = await supabaseAdmin.rpc('consume_platform_usage', {
    p_account: p.accountId,
    p_request: p.requestId,
    p_operation: 'mcp:read',
    p_channel: 'mcp',
  })
  if (quotaError)
    throw new PlatformError(503, 'METER_UNAVAILABLE', 'Usage verification unavailable.')
  if (!allowed)
    throw new PlatformError(429, 'DAILY_LIMIT', 'Daily allowance reached. Resets at 00:00 UTC.')
  return p
}
