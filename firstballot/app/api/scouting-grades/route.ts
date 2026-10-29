import { NextRequest, NextResponse } from 'next/server'
import { fail } from '@/lib/platform/http'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { isValidUserGrade } from '@/lib/user-grade'
import type { SaveProspectGradeRequest } from '@/types/prospect-grades'

export const dynamic = 'force-dynamic'

// Deliberately NOT nested under /api/prospects: middleware.ts matches its public
// route allowlist with startsWith(), so anything below /api/prospects skips auth.

const GRADE_COLUMNS =
  'user_id, prospect_id, film_grade, talent_grade, my_grade, created_at, updated_at'

/** Reads the identity middleware.ts attached to the request. */
function getAuth(request: NextRequest): { userId: string; userJwt: string } | null {
  const userId = request.headers.get('x-user-id')
  const userJwt = request.headers.get('x-user-jwt')
  if (!userId || !userJwt) return null
  return { userId, userJwt }
}

function unauthenticated() {
  return fail(401, 'User not authenticated')
}

/**
 * Normalizes one grade field from the request body.
 * `undefined` means "not supplied" (leave alone), `null` means "clear it".
 */
function readGrade(
  value: number | null | undefined
): { ok: true; value: number | null | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined }
  if (value === null) return { ok: true, value: null }
  if (!isValidUserGrade(value)) return { ok: false }
  return { ok: true, value }
}

// GET - every grade belonging to the caller
export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) return unauthenticated()

    const supabase = createAuthenticatedSupabaseClient(auth.userJwt)

    const { data, error } = await supabase
      .from('user_prospect_grades')
      .select(GRADE_COLUMNS)
      .eq('user_id', auth.userId)

    if (error) {
      console.error('Error fetching prospect grades:', error)
      return fail(500, 'Failed to fetch grades')
    }

    return NextResponse.json({ grades: data || [] })
  } catch (error) {
    console.error('Error in GET /api/scouting-grades:', error)
    return fail(500, 'Internal server error')
  }
}

// PUT - upsert the caller's grades for one prospect
export async function PUT(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) return unauthenticated()

    const supabase = createAuthenticatedSupabaseClient(auth.userJwt)
    const body: SaveProspectGradeRequest = await request.json()

    const prospectId = Number(body.prospect_id)
    if (!Number.isInteger(prospectId) || prospectId <= 0) {
      return fail(400, 'A valid prospect_id is required')
    }

    const film = readGrade(body.film_grade)
    const talent = readGrade(body.talent_grade)
    if (!film.ok || !talent.ok) {
      return fail(400, 'Grades must be numbers between 0 and 100')
    }

    if (film.value === undefined && talent.value === undefined) {
      return fail(400, 'film_grade or talent_grade is required')
    }

    // The table rejects a row with neither grade — clearing both is a delete.
    if (film.value === null && talent.value === null) {
      return fail(400, 'Use DELETE to clear both grades')
    }

    // An upsert replaces the whole row, so a field the caller left out has to be
    // carried over from the existing row rather than silently wiped.
    const { data: existing } = await supabase
      .from('user_prospect_grades')
      .select('film_grade, talent_grade')
      .eq('user_id', auth.userId)
      .eq('prospect_id', prospectId)
      .maybeSingle()

    const nextFilm = film.value === undefined ? (existing?.film_grade ?? null) : film.value
    const nextTalent =
      talent.value === undefined ? (existing?.talent_grade ?? null) : talent.value

    if (nextFilm === null && nextTalent === null) {
      return fail(400, 'Use DELETE to clear both grades')
    }

    const { data, error } = await supabase
      .from('user_prospect_grades')
      .upsert(
        {
          user_id: auth.userId,
          prospect_id: prospectId,
          film_grade: nextFilm,
          talent_grade: nextTalent,
        },
        { onConflict: 'user_id,prospect_id' }
      )
      .select(GRADE_COLUMNS)
      .single()

    if (error) {
      console.error('Error saving prospect grade:', error)
      return fail(500, 'Failed to save grade')
    }

    return NextResponse.json({ grade: data })
  } catch (error) {
    console.error('Error in PUT /api/scouting-grades:', error)
    return fail(500, 'Internal server error')
  }
}

// DELETE - drop the caller's grades for one prospect
export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) return unauthenticated()

    const supabase = createAuthenticatedSupabaseClient(auth.userJwt)
    const { searchParams } = new URL(request.url)
    const prospectId = Number(searchParams.get('prospect_id'))

    if (!Number.isInteger(prospectId) || prospectId <= 0) {
      return fail(400, 'A valid prospect_id is required')
    }

    const { error } = await supabase
      .from('user_prospect_grades')
      .delete()
      .eq('user_id', auth.userId)
      .eq('prospect_id', prospectId)

    if (error) {
      console.error('Error deleting prospect grade:', error)
      return fail(500, 'Failed to delete grade')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/scouting-grades:', error)
    return fail(500, 'Internal server error')
  }
}
