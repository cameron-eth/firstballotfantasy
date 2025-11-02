import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aanoqbjauukcczrlnxka.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MzM1NjQsImV4cCI6MjA1NjEwOTU2NH0.5QMnDzOI-y_XiIRGTmnLfzZ6i8vDbBXfO5sHuxqd0EU'
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDUzMzU2NCwiZXhwIjoyMDU2MTA5NTY0fQ.UrrGEW0NsBa5ln8BWKbECLWlnxmdWHph6M_aQ4M_iDw'

// Factory function to create an authenticated client with user's JWT token
export function createAuthenticatedSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Default server client (for non-authenticated operations or verification)
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Service role client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
