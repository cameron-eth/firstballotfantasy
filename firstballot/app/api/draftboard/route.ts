import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import type { SaveDraftboardRequest } from '@/types/draftboard'
import { nextDraftClass } from '@/lib/draft-years'

export const dynamic = 'force-dynamic'

// GET - List all user's boards or fetch a specific board by id
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return fail(401, 'User not authenticated')
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
        return fail(404, 'Board not found')
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
      return fail(500, 'Failed to fetch boards')
    }

    return NextResponse.json({ boards: data || [] })
  } catch (error) {
    console.error('Error in GET /api/draftboard:', error)
    return fail(500, 'Internal server error')
  }
}

// POST - Create or update a draftboard (upsert behavior)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return fail(401, 'User not authenticated')
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const body: SaveDraftboardRequest = await request.json()

    if (!body.name || !body.prospect_ids) {
      return fail(400, 'Name and prospect_ids are required')
    }

    // Check if a board with this name already exists for this user
    const { data: existingBoard } = await supabase
      .from('user_draftboards')
      .select('id')
      .eq('user_id', userId)
      .eq('name', body.name)
      .single()

    if (existingBoard) {
      // Update existing board
      const { data, error } = await supabase
        .from('user_draftboards')
        .update({
          prospect_ids: body.prospect_ids,
          draft_year: body.draft_year || nextDraftClass(),
        })
        .eq('id', existingBoard.id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating draftboard:', error)
        return fail(500, 'Failed to update board')
      }

      return NextResponse.json({ board: data })
    }

    // Create new board
    const { data, error } = await supabase
      .from('user_draftboards')
      .insert({
        user_id: userId,
        name: body.name,
        draft_year: body.draft_year || nextDraftClass(),
        prospect_ids: body.prospect_ids,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating draftboard:', error)
      return fail(500, 'Failed to create board')
    }

    return NextResponse.json({ board: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/draftboard:', error)
    return fail(500, 'Internal server error')
  }
}

// PUT - Update an existing draftboard
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return fail(401, 'User not authenticated')
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const body: SaveDraftboardRequest = await request.json()

    if (!body.id) {
      return fail(400, 'Board id is required for updates')
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
      return fail(500, 'Failed to update board')
    }

    if (!data) {
      return fail(404, 'Board not found')
    }

    return NextResponse.json({ board: data })
  } catch (error) {
    console.error('Error in PUT /api/draftboard:', error)
    return fail(500, 'Internal server error')
  }
}

// DELETE - Delete a draftboard
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userJwt = request.headers.get('x-user-jwt')

    if (!userId || !userJwt) {
      return fail(401, 'User not authenticated')
    }

    const supabase = createAuthenticatedSupabaseClient(userJwt)
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('id')

    if (!boardId) {
      return fail(400, 'Board id is required')
    }

    const { error } = await supabase
      .from('user_draftboards')
      .delete()
      .eq('id', boardId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting draftboard:', error)
      return fail(500, 'Failed to delete board')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/draftboard:', error)
    return fail(500, 'Internal server error')
  }
}
