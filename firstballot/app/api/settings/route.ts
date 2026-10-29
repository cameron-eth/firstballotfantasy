import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get the userId and JWT token from headers (set by middleware after auth verification)
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return fail(401, 'User not authenticated')
    }

    // Create an authenticated Supabase client with the user's JWT token
    const userSupabase = createAuthenticatedSupabaseClient(userJwt)

    // Fetch the user profile using the authenticated client (respects RLS)
    const { data: profile, error } = await userSupabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', userId)
      .single()

    if (error) {
      return fail(500, 'Failed to fetch profile')
    }

    return NextResponse.json(profile || {})
  } catch (error) {
    return fail(500, 'Internal server error')
  }
}
