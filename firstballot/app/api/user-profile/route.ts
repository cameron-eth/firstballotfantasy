import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token and get the user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile by auth_id
    const { data, error } = await supabaseServer
      .from('user_profiles')
      .select('id, auth_id, username, email, sleeper_username, sleeper_id, membership_status, created_at, updated_at')
      .eq('auth_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/user-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authId, email, username } = await request.json()
    
    if (!authId || !email) {
      return NextResponse.json({ error: 'Auth ID and email are required' }, { status: 400 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .eq('auth_id', authId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // Create new profile with proper schema
    const { data, error } = await supabaseServer
      .from('user_profiles')
      .insert({
        auth_id: authId,
        email: email,
        username: username || 'user',
        sleeper_username: null,
        favorite_team: null,
        sleeper_league_id: null,
        membership_status: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/user-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 

export async function PATCH(request: NextRequest) {
  try {
    const { userId, sleeper_username } = await request.json()
    
    if (!userId || !sleeper_username) {
      return NextResponse.json({ error: 'User ID and sleeper_username are required' }, { status: 400 })
    }

    // Update the sleeper_username
    const { data, error } = await supabaseServer
      .from('user_profiles')
      .update({ sleeper_username: sleeper_username })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/user-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 