import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic to always get fresh data (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Prospect {
  id: number
  rank: number
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
}

// Helper function to determine projected round based on rank
const getProjectedRound = (rank: number): string => {
  if (rank <= 12) return '1st'
  if (rank <= 24) return '2nd'
  if (rank <= 36) return '3rd'
  return 'UDFA'
}

// Helper to generate headshot URL from ESPN ID
const getHeadshotUrl = (espnId: number | null): string | null => {
  if (espnId)
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${espnId}.png&w=350&h=254`
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Get optional draft_year filter from query params
    const { searchParams } = new URL(request.url)
    const draftYear = searchParams.get('draft_year') || '2026'
    const isAllYears = draftYear === 'all'
    const yearNum = !isAllYears ? parseInt(draftYear) : null

    // Use dynasty_prospects exclusively
    let query = supabaseServer.from('dynasty_prospects').select(
      `
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
        draft_year
      `
    )

    if (!isAllYears && yearNum) {
      query = query.eq('draft_year', yearNum)
    }

    const { data: dynastyData, error: dynastyError } = await query
      .order('draft_year', { ascending: false })
      .order('rank', { ascending: true })

    if (dynastyError) {
      console.error('Database error fetching prospects from dynasty_prospects:', dynastyError)
    }

    // Map data
    const prospects: Prospect[] = (dynastyData || []).map((record) => {
      return {
        id: Number(record.id),
        rank: Number(record.rank) || 999,
        name: record.name || '',
        first_name: record.first_name || (record.name || '').split(' ')[0],
        last_name: record.last_name || (record.name || '').split(' ').slice(1).join(' '),
        position: record.position || '',
        school: record.school || 'TBD',
        espn_id: record.espn_id ? Number(record.espn_id) : null,
        cfbd_id: record.cfbd_id ? Number(record.cfbd_id) : null,
        projectedRound: getProjectedRound(Number(record.rank) || 999),
        tier: record.tier,
        tier_numeric: record.tier_numeric,
        valuation: record.valuation ? Number(record.valuation) : null,
        overall_grade: record.overall_grade ? Number(record.overall_grade) : null,
        grade_tier: record.grade_tier,
        nfl_comparisons: record.nfl_comparisons,
        height: record.height ? Number(record.height) : null,
        weight: record.weight ? Number(record.weight) : null,
        hometown: record.hometown,
        jersey: record.jersey,
        class: record.class || null,
        headshot_url:
          record.headshot_url || getHeadshotUrl(record.espn_id ? Number(record.espn_id) : null),
        team_color: record.team_color,
        college_stats: record.college_stats || null,
        draft_year: record.draft_year,
      }
    })

    return NextResponse.json(prospects, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
  }
}
