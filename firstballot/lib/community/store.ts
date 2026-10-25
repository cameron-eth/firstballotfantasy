import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'node:crypto'
import type { Ballot, Candidate } from './rating'
const bucket = 'community-ballots'
export const ballotPath = (userId: string, day: string, round = 0) =>
  `${day}${round ? `-r${round}` : ''}-${createHash('sha256').update(userId).digest('hex')}.json`
export const dailySeed = (userId: string, day: string) =>
  parseInt(createHash('sha256').update(`${day}:${userId}`).digest('hex').slice(0, 8), 16)
export async function readToday(userId: string, day: string, round = 0): Promise<Ballot | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(ballotPath(userId, day, round))
  if (error) {
    if (
      String((error as { statusCode?: string }).statusCode) === '404' ||
      /not found/i.test(error.message)
    )
      return null
    throw new Error('Vote storage unavailable')
  }
  return JSON.parse(await data.text())
}
export async function saveBallot(userId: string, ballot: Ballot, round = 0) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(ballotPath(userId, ballot.day, round), JSON.stringify(ballot), {
      upsert: false,
      contentType: 'application/json',
      cacheControl: '0',
    })
  if (error)
    throw new Error(
      'Vote could not be saved. Refresh to check whether today’s pick is already recorded.'
    )
  historyCache = null
}
let historyCache: { until: number; votes: Ballot[] } | null = null
export async function readBallots(): Promise<Ballot[]> {
  if (historyCache && historyCache.until > Date.now()) return historyCache.votes
  const names: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list('', { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error('Community votes unavailable')
    names.push(...data.filter((f) => f.name.endsWith('.json')).map((f) => f.name))
    if (data.length < 1000) break
  }
  const votes: Ballot[] = []
  for (let start = 0; start < names.length; start += 20) {
    const batch = await Promise.all(
      names.slice(start, start + 20).map(async (name) => {
        const { data, error } = await supabaseAdmin.storage.from(bucket).download(name)
        if (error) throw new Error('Community votes unavailable')
        const v = JSON.parse(await data.text()) as Ballot
        if (
          v.version !== 1 ||
          !Array.isArray(v.pair) ||
          v.pair.length !== 2 ||
          !v.pair.includes(v.winner)
        )
          throw new Error('Invalid stored ballot')
        return v
      })
    )
    votes.push(...batch)
  }
  historyCache = { until: Date.now() + 60_000, votes }
  return votes
}
export async function candidates(): Promise<Candidate[]> {
  const [nfl, prospects] = await Promise.all([
    supabaseAdmin
      .from('dynasty_player_tiers')
      .select('player_id,player_name,position,team,headshot_url,total_score')
      .in('position', ['QB', 'RB', 'WR', 'TE'])
      .order('total_score', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('dynasty_prospects')
      .select('id,name,position,school,draft_year,headshot_url,rank')
      .gte('draft_year', new Date().getUTCFullYear() + 1)
      .in('position', ['QB', 'RB', 'WR', 'TE'])
      .order('rank', { ascending: true })
      .limit(1000),
  ])
  if (nfl.error || prospects.error) throw new Error('Player pool unavailable')
  const result: Candidate[] = [
    ...(nfl.data ?? []).map((p) => ({
      key: `nfl:${p.player_id || p.player_name}`,
      name: p.player_name,
      position: p.position,
      team: p.team || 'NFL',
      image: p.headshot_url,
      kind: 'nfl' as const,
    })),
    ...(prospects.data ?? []).map((p) => ({
      key: `prospect:${p.id}`,
      name: p.name,
      position: p.position,
      team: p.school,
      image: p.headshot_url,
      kind: 'prospect' as const,
      year: p.draft_year,
    })),
  ]
  return [...new Map(result.map((p) => [p.key, p])).values()].sort((a, b) =>
    a.key.localeCompare(b.key)
  )
}
