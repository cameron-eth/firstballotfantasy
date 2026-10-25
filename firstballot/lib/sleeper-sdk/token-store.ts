import { supabaseAdmin } from '@/lib/supabase-server'
import { decryptToken, encryptToken } from './token-crypto'
const bucket = 'sleeper-connections'
const path = (account: string) => `${account}/token.json`
export async function loadToken(account: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path(account))
  if (error) {
    if (
      String((error as { statusCode?: string }).statusCode) === '404' ||
      /not found/i.test(error.message)
    )
      return null
    throw new Error('Could not load your saved Sleeper connection.')
  }
  try {
    return decryptToken(await data.text(), account)
  } catch {
    throw new Error('Saved Sleeper connection could not be opened. Reconnect your token.')
  }
}
export async function saveToken(account: string, token: string) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path(account), encryptToken(token, account), {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '0',
    })
  if (error) throw new Error('Could not save your Sleeper connection. Try connecting again.')
}
export async function deleteToken(account: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path(account)])
  if (error) throw new Error('Could not remove your saved connection. Try again.')
}
