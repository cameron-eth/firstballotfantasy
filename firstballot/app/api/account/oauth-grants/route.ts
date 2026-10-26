import { webAccount } from '@/lib/platform/auth'
import { body, failure, json, PlatformError } from '@/lib/platform/http'
import { teamsFor } from '@/lib/platform/teams'
import { supabaseAdmin, createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request)
    const { data, error } = await supabaseAdmin
      .from('oauth_team_grants')
      .select('client_id,team_ids,revoked_at,created_at')
      .eq('account_id', p.accountId)
    if (error) throw error
    return json({ grants: data })
  } catch (e) {
    return failure(e)
  }
}
export async function POST(request: Request) {
  try {
    const p = await webAccount(request),
      input = await body(request)
    if (input.action === 'revoke') {
      const { error } = await supabaseAdmin
        .from('oauth_team_grants')
        .update({ revoked_at: new Date().toISOString() })
        .eq('account_id', p.accountId)
        .eq('client_id', input.clientId)
      if (error) throw error
      return json({ revoked: true })
    }
    if (process.env.MCP_OAUTH_ENABLED !== 'true')
      throw new PlatformError(503, 'OAUTH_DISABLED', 'OAuth is not configured yet.')
    const jwt = request.headers.get('authorization')!.slice(7),
      client = createAuthenticatedSupabaseClient(jwt)
    const { data: details, error } = await client.auth.oauth.getAuthorizationDetails(
      String(input.authorizationId ?? '')
    )
    if (error || !details || !('authorization_id' in details))
      throw new PlatformError(
        400,
        'CONSENT_INVALID',
        'Authorization request expired. Restart from your assistant.'
      )
    if (input.action === 'deny') {
      const result = await client.auth.oauth.denyAuthorization(details.authorization_id, {
        skipBrowserRedirect: true,
      })
      if (result.error) throw result.error
      return json(result.data)
    }
    const teams = await teamsFor(p)
    if (
      !Array.isArray(input.teamIds) ||
      !input.teamIds.length ||
      input.teamIds.length > 100 ||
      input.teamIds.some((id: string) => !teams.some((t) => t.id === id && t.active))
    )
      throw new PlatformError(400, 'INVALID_TEAMS', 'Select your active teams.')
    const { error: saveError } = await supabaseAdmin.from('oauth_team_grants').upsert({
      account_id: p.accountId,
      client_id: details.client.id,
      team_ids: [...new Set(input.teamIds)],
      scopes: ['teams:read', 'players:read'],
      revoked_at: null,
    })
    if (saveError) throw saveError
    const result = await client.auth.oauth.approveAuthorization(details.authorization_id, {
      skipBrowserRedirect: true,
    })
    if (result.error) throw result.error
    return json(result.data)
  } catch (e) {
    return failure(e)
  }
}
