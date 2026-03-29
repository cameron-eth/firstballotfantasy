import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

interface CreateProfileRequestBody {
  email?: string
  username?: string
}

interface UserProfileRecord {
  id: string
  auth_id: string
  username: string
  email: string
  sleeper_username: string | null
  sleeper_id: string | null
  membership_status: boolean
  created_at: string
  updated_at: string
}

function deriveUsername(email: string, preferred?: string): string {
  const trimmedPreferred = preferred?.trim()
  if (trimmedPreferred) {
    return trimmedPreferred
  }

  const fallback = email.split('@')[0]?.trim()
  return fallback || 'user'
}

async function ensureUserProfile(
  userJwt: string,
  authId: string,
  email: string,
  username: string
): Promise<UserProfileRecord> {
  const userSupabase = createAuthenticatedSupabaseClient(userJwt)

  const { data: existingProfile, error: existingProfileError } = await userSupabase
    .from('user_profiles')
    .select(
      'id, auth_id, username, email, sleeper_username, sleeper_id, membership_status, created_at, updated_at'
    )
    .eq('auth_id', authId)
    .single()

  if (existingProfile && !existingProfileError) {
    return existingProfile
  }

  if (existingProfileError && existingProfileError.code !== 'PGRST116') {
    throw new Error(existingProfileError.message)
  }

  const { data: insertedProfile, error: insertError } = await userSupabase
    .from('user_profiles')
    .insert({
      auth_id: authId,
      email,
      username,
      sleeper_username: null,
      favorite_team: null,
      sleeper_league_id: null,
      membership_status: false,
      feature_access: false,
    })
    .select(
      'id, auth_id, username, email, sleeper_username, sleeper_id, membership_status, created_at, updated_at'
    )
    .single()

  if (insertError) {
    // Race-safe fallback: if another request inserted first, fetch and return it.
    const { data: fetchedAfterInsert } = await userSupabase
      .from('user_profiles')
      .select(
        'id, auth_id, username, email, sleeper_username, sleeper_id, membership_status, created_at, updated_at'
      )
      .eq('auth_id', authId)
      .single()

    if (fetchedAfterInsert) {
      return fetchedAfterInsert
    }

    throw new Error(insertError.message)
  }

  return insertedProfile
}

export async function GET(request: NextRequest) {
  try {
    // Get the userId and JWT token from headers (set by middleware after auth verification)
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Create an authenticated Supabase client with the user's JWT token
    const userSupabase = createAuthenticatedSupabaseClient(userJwt)

    // Get user profile by auth_id using authenticated client (respects RLS)
    const { data, error } = await userSupabase
      .from('user_profiles')
      .select(
        'id, auth_id, username, email, sleeper_username, sleeper_id, membership_status, created_at, updated_at'
      )
      .eq('auth_id', userId)
      .single()

    if (!error && data) {
      return NextResponse.json(data)
    }

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Self-heal missing profile for authenticated users.
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser()

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const username = deriveUsername(
      user.email,
      typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : undefined
    )
    const profile = await ensureUserProfile(userJwt, userId, user.email, username)
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, username } = (await request.json()) as CreateProfileRequestBody
    const authId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!authId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const userSupabase = createAuthenticatedSupabaseClient(userJwt)
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser()

    const resolvedEmail = user?.email ?? email
    if (!resolvedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const metadataUsername =
      typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : undefined
    const resolvedUsername = deriveUsername(resolvedEmail, metadataUsername ?? username)

    const profile = await ensureUserProfile(userJwt, authId, resolvedEmail, resolvedUsername)

    if (userError) {
      // Profile can still be created/returned even if metadata lookup fails.
      return NextResponse.json(profile)
    }

    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get the userId and JWT token from headers (set by middleware after auth verification)
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Create an authenticated Supabase client with the user's JWT token
    const userSupabase = createAuthenticatedSupabaseClient(userJwt)

    const { sleeper_username } = await request.json()

    if (!sleeper_username) {
      return NextResponse.json({ error: 'sleeper_username is required' }, { status: 400 })
    }

    // Update the sleeper_username using the authenticated client (respects RLS)
    const { data, error } = await userSupabase
      .from('user_profiles')
      .update({ sleeper_username: sleeper_username })
      .eq('auth_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
