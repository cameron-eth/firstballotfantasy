import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import type { Draftboard, SaveDraftboardRequest } from '@/types/draftboard'

export const dynamic = 'force-dynamic'

// GET - List all user's boards or fetch a specific board by id
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('id')

    if (boardId) {
      // Fetch specific board
      const { data, error } = await supabase
        .from('user_draftboards')
        .select('*')
        .eq('id', boardId)
        .eq('user_id', userId)
        .single()

      if (error) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 })
      }

      return NextResponse.json({ board: data })
    }

    // List all user's boards
    const { data, error } = await supabase
      .from('user_draftboards')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching draftboards:', error)
      return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
    }

    return NextResponse.json({ boards: data || [] })
  } catch (error) {
    console.error('Error in GET /api/draftboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new draftboard
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const body: SaveDraftboardRequest = await request.json()

    if (!body.name || !body.prospect_ids) {
      return NextResponse.json({ error: 'Name and prospect_ids are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_draftboards')
      .insert({
        user_id: userId,
        name: body.name,
        draft_year: body.draft_year || 2026,
        prospect_ids: body.prospect_ids,
      })
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A board with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating draftboard:', error)
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
    }

    return NextResponse.json({ board: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/draftboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an existing draftboard
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const body: SaveDraftboardRequest = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Board id is required for updates' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name) updateData.name = body.name
    if (body.prospect_ids) updateData.prospect_ids = body.prospect_ids
    if (body.draft_year) updateData.draft_year = body.draft_year

    const { data, error } = await supabase
      .from('user_draftboards')
      .update(updateData)
      .eq('id', body.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating draftboard:', error)
      return NextResponse.json({ error: 'Failed to update board' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    return NextResponse.json({ board: data })
  } catch (error) {
    console.error('Error in PUT /api/draftboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a draftboard
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('id')

    if (!boardId) {
      return NextResponse.json({ error: 'Board id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_draftboards')
      .delete()
      .eq('id', boardId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting draftboard:', error)
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/draftboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
