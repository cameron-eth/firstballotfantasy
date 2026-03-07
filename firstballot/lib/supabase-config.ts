// Next.js / Turbopack only inlines NEXT_PUBLIC_* env vars when accessed
// as static string literals (e.g. process.env.NEXT_PUBLIC_SUPABASE_URL).
// Dynamic lookups like process.env[key] are NOT inlined on the client side.
// That's why every access below is a direct, static reference.

export function getSupabaseUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_PROJECT_URL ||
    process.env.SUPABASE_URL

  if (!value) {
    throw new Error(
      'Missing required environment variable. Expected one of: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_PROJECT_URL, SUPABASE_URL'
    )
  }
  return value
}

export function getSupabaseAnonKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!value) {
    throw new Error(
      'Missing required environment variable. Expected one of: NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ANON_KEY, SUPABASE_ANON_KEY'
    )
  }
  return value
}

export function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!value) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }
  return value
}
