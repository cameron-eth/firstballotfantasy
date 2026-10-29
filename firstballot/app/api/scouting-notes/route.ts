import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function auth(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const jwt = request.headers.get('x-user-jwt')
  return userId && jwt ? { userId, jwt } : null
}

export async function GET(request: NextRequest) {
  const identity = auth(request)
  if (!identity) return fail(401, 'Unauthorized')
  const { data, error } = await createAuthenticatedSupabaseClient(identity.jwt)
    .from('user_prospect_notes')
    .select('prospect_id, notes, updated_at')
    .eq('user_id', identity.userId)
  if (error?.code === '42P01' || error?.code === 'PGRST205') return NextResponse.json({ notes: [], available: false }, { headers: { 'Cache-Control': 'private, no-store' } })
  if (error) return fail(500, 'Could not load notes')
  return NextResponse.json({ notes: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PUT(request: NextRequest) {
  const identity = auth(request)
  if (!identity) return fail(401, 'Unauthorized')
  const body = await request.json().catch(() => null)
  const prospectId = Number(body?.prospect_id)
  const notes = body?.notes
  // Curated prospects use negative ids, so any non-zero integer is a valid prospect id.
  if (!Number.isInteger(prospectId) || prospectId === 0 || typeof notes !== 'string' || notes.length > 5000) {
    return fail(400, 'A prospect ID and notes of at most 5000 characters are required')
  }
  const client = createAuthenticatedSupabaseClient(identity.jwt)
  if (!notes.trim()) {
    const { error } = await client.from('user_prospect_notes').delete().eq('user_id', identity.userId).eq('prospect_id', prospectId)
    if (error?.code === '42P01' || error?.code === 'PGRST205') return fail(503, 'Scouting notes are temporarily unavailable')
  if (error) return fail(500, 'Could not clear note')
    return NextResponse.json({ prospect_id: prospectId, notes: '' })
  }
  const { data, error } = await client.from('user_prospect_notes').upsert({ user_id: identity.userId, prospect_id: prospectId, notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,prospect_id' }).select('prospect_id, notes, updated_at').single()
  if (error?.code === '42P01' || error?.code === 'PGRST205') return fail(503, 'Scouting notes are temporarily unavailable')
  if (error) return fail(500, 'Could not save note')
  return NextResponse.json(data)
}
