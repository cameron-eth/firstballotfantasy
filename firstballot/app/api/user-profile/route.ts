import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

interface CreateProfileRequestBody {
  email?: string
  username?: string
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

    if (error) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(data)
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

    if (!email || !username) {
      return NextResponse.json(
        { error: 'Email and username are required' },
        { status: 400 }
      )
    }

    const serviceClient = createAuthenticatedSupabaseClient(userJwt)

    // Check if profile already exists
    const { data: existingProfile } = await serviceClient
      .from('user_profiles')
      .select('id')
      .eq('auth_id', authId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // Create new profile with proper schema
    const { data, error } = await serviceClient
      .from('user_profiles')
      .insert({
        auth_id: authId,
        email: email,
        username: username || 'user',
        sleeper_username: null,
        favorite_team: null,
        sleeper_league_id: null,
        membership_status: false,
      })
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
