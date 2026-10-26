import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabaseServer } from '@/lib/supabase-server'
import { webAccount } from '@/lib/platform/auth'
import { teamsFor } from '@/lib/platform/teams'
import { failure } from '@/lib/platform/http'
import { validateScenarios } from '@/lib/team-scenarios'
export const dynamic = 'force-dynamic'
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function handle(request: NextRequest) {
  const jwt = request.headers.get('x-user-jwt')
  if (!jwt) return reply({ error: 'Sign in to save scenarios.' }, 401)
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(jwt)
  if (error || !user) return reply({ error: 'Sign in again.' }, 401)
  const league = request.nextUrl.searchParams.get('league') ?? ''
  const roster = request.nextUrl.searchParams.get('roster') ?? ''
  if (!/^\d{10,25}$/.test(league) || !/^\d{1,4}$/.test(roster))
    return reply({ error: 'Invalid league or roster.' }, 400)
  const storage = supabaseAdmin.storage.from('team-scenarios')
  const path = `${user.id}/${league}/${roster}.json`
  if (request.method === 'GET') {
    const { data, error } = await storage.download(path)
    if (error) {
      if (
        String((error as { statusCode?: string }).statusCode) === '404' ||
        /not found/i.test(error.message)
      )
        return reply({ scenarios: [] })
      return reply({ error: 'Could not load saved scenarios. Retry before saving.' }, 503)
    }
    try {
      const scenarios = JSON.parse(await data.text())
      if (!validateScenarios(scenarios)) throw new Error()
      return reply({ scenarios })
    } catch {
      return reply({ error: 'Saved scenarios could not be read.' }, 503)
    }
  }
  try {
    const principal = await webAccount(request)
    const teams = await teamsFor(principal)
    if (!teams.some(t=>t.league_id===league && String(t.roster_id)===roster && t.active)) return reply({error:'Activate this team to edit its plans.'},403)
  } catch(e) {return failure(e)}
  const raw = await request.text()
  if (raw.length > 150000) return reply({ error: 'Scenario collection is too large.' }, 413)
  let scenarios
  try {
    scenarios = JSON.parse(raw).scenarios
  } catch {
    return reply({ error: 'Invalid scenario data.' }, 400)
  }
  if (!validateScenarios(scenarios))
    return reply({ error: 'Invalid scenarios. Limit 12 scenarios and 100 targets each.' }, 400)
  const { error: saveError } = await storage.upload(path, JSON.stringify(scenarios), {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0',
  })
  return saveError
    ? reply({ error: 'Could not save scenarios. Your changes remain on screen.' }, 503)
    : reply({ saved: true })
}
export const GET = handle
export const PUT = handle
