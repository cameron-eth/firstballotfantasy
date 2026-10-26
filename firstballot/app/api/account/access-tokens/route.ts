import { randomBytes } from 'node:crypto'
import { webAccount, tokenHash } from '@/lib/platform/auth'
import { body, failure, json, PlatformError } from '@/lib/platform/http'
import { teamsFor } from '@/lib/platform/teams'
import { READ_SCOPES } from '@/lib/platform/policy'
import { supabaseAdmin } from '@/lib/supabase-server'
export async function GET(request: Request) {
  try {
    const p = await webAccount(request)
    const { data, error } = await supabaseAdmin
      .from('api_access_tokens')
      .select('id,name,prefix,scopes,team_ids,created_at,expires_at,revoked_at,last_used_at')
      .eq('account_id', p.accountId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return json({ tokens: data })
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
        .from('api_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('account_id', p.accountId)
        .eq('id', input.id)
      if (error) throw error
      return json({ revoked: true })
    }
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.length > 60 ||
      !Array.isArray(input.teamIds) ||
      !input.teamIds.length ||
      input.teamIds.length > 100
    )
      throw new PlatformError(400, 'INVALID_TOKEN', 'Choose a name and at least one active team.')
    const teams = await teamsFor(p)
    if (input.teamIds.some((id: string) => !teams.some((t) => t.id === id && t.active)))
      throw new PlatformError(403, 'TEAM_ACCESS', 'Choose only your active teams.')
    const { count, error: countError } = await supabaseAdmin
      .from('api_access_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', p.accountId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
    if (countError) throw countError
    if ((count ?? 0) >= 10)
      throw new PlatformError(
        409,
        'TOKEN_LIMIT',
        'Revoke an existing token first (10 active tokens maximum).'
      )
    const token = `fb_${randomBytes(32).toString('hex')}`
    const { error } = await supabaseAdmin.from('api_access_tokens').insert({
      account_id: p.accountId,
      name: input.name.trim(),
      token_hash: tokenHash(token),
      prefix: token.slice(0, 11),
      scopes: READ_SCOPES,
      team_ids: [...new Set(input.teamIds)],
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    if (error) throw error
    return json({ token, expiresInDays: 30 }, 201)
  } catch (e) {
    return failure(e)
  }
}
