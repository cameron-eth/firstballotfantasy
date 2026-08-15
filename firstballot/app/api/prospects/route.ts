import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Prospect grades change when the ETL runs, not per request. Serving a short
// shared cache with a long stale window keeps the ~1MB all-years payload off
// the database on every page load while still refreshing promptly after a run.
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

interface Prospect {
  id: number
  rank: number
  overall_rank: number
  name: string
  first_name: string | null
  last_name: string | null
  position: string
  school: string
  espn_id: number | null
  cfbd_id: number | null
  projectedRound?: string
  // Grading fields
  tier: string | null
  tier_numeric: number | null
  valuation: number | null
  overall_grade: number | null
  grade_tier: string | null
  nfl_comparisons: string | null
  // Physical attributes
  height: number | null
  weight: number | null
  hometown: string | null
  jersey: number | null
  class: string | null // Freshman, Sophomore, Junior, Senior
  // Headshot & Team
  headshot_url: string | null
  team_color: string | null
  // Stats
  college_stats: Record<string, number> | null
  draft_year: number | null
  college_production_score: number | null
  physical_measurables_score: number | null
  hs_recruiting_score: number | null
  draft_projection_score: number | null
  expert_consensus_score: number | null
}

const SELECT_COLUMNS = `
  id,
  rank,
  name,
  first_name,
  last_name,
  position,
  school,
  espn_id,
  cfbd_id,
  tier,
  tier_numeric,
  valuation,
  overall_grade,
  grade_tier,
  nfl_comparisons,
  height,
  weight,
  hometown,
  jersey,
  class,
  headshot_url,
  team_color,
  college_stats,
  draft_year,
  college_production_score,
  physical_measurables_score,
  hs_recruiting_score,
  draft_projection_score,
  expert_consensus_score
`

// Helper function to determine projected round based on overall class rank
const getProjectedRound = (rank: number): string => {
  if (rank <= 12) return '1st'
  if (rank <= 24) return '2nd'
  if (rank <= 36) return '3rd'
  return 'UDFA'
}

// Helper to generate headshot URL from ESPN ID
const getHeadshotUrl = (espnId: number | null, draftYear: number | null): string | null => {
  if (!espnId) return null
  if ((draftYear || 0) >= 2025) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${espnId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

type RankedRecord = {
  id: unknown
  rank: unknown
  name: unknown
  position: unknown
  draft_year: unknown
  overall_grade: unknown
}

/**
 * Derive both ranks the UI needs from the stored `rank`.
 *
 * `dynasty_prospects.rank` is the overall rank inside a draft class for the
 * classes the ranking importer owns, and a positional rank for the older
 * classes that `rerank_prospects.py` renumbered. Ordering each class by
 * (rank, grade, name) and renumbering from that order produces a consistent
 * overall rank and positional rank either way.
 */
function deriveRanks(records: RankedRecord[]) {
  const overallRankById = new Map<number, number>()
  const positionalRankById = new Map<number, number>()
  const overallCounters = new Map<string, number>()
  const positionalCounters = new Map<string, number>()

  const ordered = [...records].sort((a, b) => {
    const yearA = Number(a.draft_year) || 0
    const yearB = Number(b.draft_year) || 0
    if (yearA !== yearB) return yearB - yearA
    const rankA = Number(a.rank) || 9999
    const rankB = Number(b.rank) || 9999
    if (rankA !== rankB) return rankA - rankB
    const gradeA = Number(a.overall_grade) || 0
    const gradeB = Number(b.overall_grade) || 0
    if (gradeA !== gradeB) return gradeB - gradeA
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  for (const record of ordered) {
    const id = Number(record.id)
    const yearKey = String(record.draft_year ?? 'na')
    const positionKey = `${yearKey}::${record.position ?? ''}`

    const nextOverall = (overallCounters.get(yearKey) || 0) + 1
    overallCounters.set(yearKey, nextOverall)
    overallRankById.set(id, nextOverall)

    const nextPositional = (positionalCounters.get(positionKey) || 0) + 1
    positionalCounters.set(positionKey, nextPositional)
    positionalRankById.set(id, nextPositional)
  }

  return { overallRankById, positionalRankById }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const draftYear = searchParams.get('draft_year') || '2026'
    const isAllYears = draftYear === 'all'
    const yearNum = !isAllYears ? toNumberOrNull(draftYear) : null

    if (!isAllYears && yearNum === null) {
      return NextResponse.json({ error: 'Invalid draft_year' }, { status: 400 })
    }

    let query = supabaseServer.from('dynasty_prospects').select(SELECT_COLUMNS)

    if (yearNum !== null) {
      query = query.eq('draft_year', yearNum)
    }

    // Sort by grade first so the best players surface regardless of class year
    query = query.order('overall_grade', { ascending: false }).order('rank', { ascending: true })

    const { data: dynastyData, error: dynastyError } = await query

    if (dynastyError) {
      console.error('Database error fetching prospects from dynasty_prospects:', dynastyError)
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
    }

    const records = dynastyData || []
    const { overallRankById, positionalRankById } = deriveRanks(records as RankedRecord[])

    const prospects: Prospect[] = records.map((record) => {
      const id = Number(record.id)
      const overallRank = overallRankById.get(id) || 999
      const espnId = toNumberOrNull(record.espn_id)
      const draftYearValue = toNumberOrNull(record.draft_year)

      return {
        id,
        // Cards show the positional rank (e.g. WR3); both are derived from the
        // class ordering rather than trusted verbatim off the row.
        rank: positionalRankById.get(id) || 999,
        overall_rank: overallRank,
        name: record.name || '',
        first_name: record.first_name || (record.name || '').split(' ')[0],
        last_name: record.last_name || (record.name || '').split(' ').slice(1).join(' '),
        position: record.position || '',
        school: record.school || 'TBD',
        espn_id: espnId,
        cfbd_id: toNumberOrNull(record.cfbd_id),
        projectedRound: getProjectedRound(overallRank),
        tier: record.tier,
        tier_numeric: toNumberOrNull(record.tier_numeric),
        valuation: toNumberOrNull(record.valuation),
        overall_grade: toNumberOrNull(record.overall_grade),
        grade_tier: record.grade_tier,
        nfl_comparisons: record.nfl_comparisons,
        height: toNumberOrNull(record.height),
        weight: toNumberOrNull(record.weight),
        hometown: record.hometown,
        jersey: record.jersey,
        class: record.class || null,
        headshot_url: record.headshot_url || getHeadshotUrl(espnId, draftYearValue),
        team_color: record.team_color,
        college_stats: record.college_stats || null,
        draft_year: draftYearValue,
        college_production_score: toNumberOrNull(record.college_production_score),
        physical_measurables_score: toNumberOrNull(record.physical_measurables_score),
        hs_recruiting_score: toNumberOrNull(record.hs_recruiting_score),
        draft_projection_score: toNumberOrNull(record.draft_projection_score),
        expert_consensus_score: toNumberOrNull(record.expert_consensus_score),
      }
    })

    return NextResponse.json(prospects, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
  }
}
