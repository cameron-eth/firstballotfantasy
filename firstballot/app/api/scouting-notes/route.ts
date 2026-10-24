import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function auth(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const jwt = request.headers.get('x-user-jwt')
  return userId && jwt ? { userId, jwt } : null
}

export async function GET(request: NextRequest) {
  const identity = auth(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await createAuthenticatedSupabaseClient(identity.jwt)
    .from('user_prospect_notes')
    .select('prospect_id, notes, updated_at')
    .eq('user_id', identity.userId)
  if (error) return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PUT(request: NextRequest) {
  const identity = auth(request)
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const prospectId = Number(body?.prospect_id)
  const notes = body?.notes
  if (!Number.isInteger(prospectId) || prospectId <= 0 || typeof notes !== 'string' || notes.length > 5000) {
    return NextResponse.json({ error: 'A prospect ID and notes of at most 5000 characters are required' }, { status: 400 })
  }
  const client = createAuthenticatedSupabaseClient(identity.jwt)
  if (!notes.trim()) {
    const { error } = await client.from('user_prospect_notes').delete().eq('user_id', identity.userId).eq('prospect_id', prospectId)
    if (error) return NextResponse.json({ error: 'Could not clear note' }, { status: 500 })
    return NextResponse.json({ prospect_id: prospectId, notes: '' })
  }
  const { data, error } = await client.from('user_prospect_notes').upsert({ user_id: identity.userId, prospect_id: prospectId, notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,prospect_id' }).select('prospect_id, notes, updated_at').single()
  if (error) return NextResponse.json({ error: 'Could not save note' }, { status: 500 })
  return NextResponse.json(data)
}
