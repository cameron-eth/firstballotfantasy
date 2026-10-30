import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { webAccount } from '@/lib/platform/auth'
import { readSession } from '@/lib/platform/session'
import { teamsFor } from '@/lib/platform/teams'
import { fail, failure } from '@/lib/platform/http'
import { validateScenarios } from '@/lib/team-scenarios'
export const dynamic = 'force-dynamic'
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function handle(request: NextRequest) {
  const session = readSession(request)
  if (!session) return fail(401, 'Sign in to save scenarios.')
  const league = request.nextUrl.searchParams.get('league') ?? ''
  const roster = request.nextUrl.searchParams.get('roster') ?? ''
  if (!/^\d{10,25}$/.test(league) || !/^\d{1,4}$/.test(roster))
    return fail(400, 'Invalid league or roster.')
  const storage = supabaseAdmin.storage.from('team-scenarios')
  const path = `${session.userId}/${league}/${roster}.json`
  if (request.method === 'GET') {
    const { data, error } = await storage.download(path)
    if (error) {
      if (
        String((error as { statusCode?: string }).statusCode) === '404' ||
        /not found/i.test(error.message)
      )
        return reply({ scenarios: [] })
      return fail(503, 'Could not load saved scenarios. Retry before saving.')
    }
    try {
      const scenarios = JSON.parse(await data.text())
      if (!validateScenarios(scenarios)) throw new Error()
      return reply({ scenarios })
    } catch {
      return fail(503, 'Saved scenarios could not be read.')
    }
  }
  try {
    const principal = await webAccount(request)
    const teams = await teamsFor(principal)
    if (!teams.some(t=>t.league_id===league && String(t.roster_id)===roster && t.active)) return fail(403, 'Activate this team to edit its plans.')
  } catch(e) {return failure(e)}
  const raw = await request.text()
  if (raw.length > 150000) return fail(413, 'Scenario collection is too large.')
  let scenarios
  try {
    scenarios = JSON.parse(raw).scenarios
  } catch {
    return fail(400, 'Invalid scenario data.')
  }
  if (!validateScenarios(scenarios))
    return fail(400, 'Invalid scenarios. Limit 12 scenarios and 100 targets each.')
  const { error: saveError } = await storage.upload(path, JSON.stringify(scenarios), {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0',
  })
  return saveError
    ? fail(503, 'Could not save scenarios. Your changes remain on screen.')
    : reply({ saved: true })
}
export const GET = handle
export const PUT = handle
