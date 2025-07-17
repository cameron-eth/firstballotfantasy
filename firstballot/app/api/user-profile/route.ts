import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // This assumes you have a way to get the current user's ID from the session/cookies
  // For demo, we'll use a placeholder userId. Replace with your session logic.
  const userId = request.headers.get('x-user-id') // Replace with real session extraction
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { data, error } = await supabaseServer
    .from('user_profiles')
    .select('id, username, sleeper_username, sleeper_id, email')
    .eq('id', userId)
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username } = await request.json()
    
    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // Create new profile with only existing columns
    const { data, error } = await supabaseServer
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        username: username || 'user',
        sleeper_username: null
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