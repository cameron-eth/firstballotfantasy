function getRequiredEnv(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]
    if (value) {
      return value
    }
  }

  throw new Error(`Missing required environment variable. Expected one of: ${keys.join(', ')}`)
}

export function getSupabaseUrl(): string {
  return getRequiredEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'])
}

export function getSupabaseAnonKey(): string {
  return getRequiredEnv([
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_ANON_KEY',
    'SUPABASE_ANON_KEY',
  ])
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnv(['SUPABASE_SERVICE_ROLE_KEY'])
}
