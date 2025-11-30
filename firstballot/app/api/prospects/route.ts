import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic to always get fresh data (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Prospect {
  id: number
  rank: number
  name: string
  position: string
  school: string
  espn_id: number | null
  projectedRound?: string
  // New grading fields
  tier: string | null
  tier_numeric: number | null
  valuation: number | null
  overall_grade: number | null
  grade_tier: string | null
  nfl_comparisons: string | null
  // Physical attributes
  height: number | null
  weight: number | null
  draft_year: number | null
}

// Helper function to determine projected round based on rank
const getProjectedRound = (rank: number): string => {
  if (rank <= 12) return '1st'
  if (rank <= 24) return '2nd'
  if (rank <= 36) return '3rd'
  return 'UDFA'
}

export async function GET(request: NextRequest) {
  try {
    // Get optional draft_year filter from query params
    const { searchParams } = new URL(request.url)
    const draftYear = searchParams.get('draft_year') || '2026'

    // Query prospects from new dynasty_prospects table
    const { data, error } = await supabaseServer
      .from('dynasty_prospects')
      .select(
        `
        id,
        rank,
        name,
        position,
        school,
        espn_id,
        tier,
        tier_numeric,
        valuation,
        overall_grade,
        grade_tier,
        nfl_comparisons,
        height,
        weight,
        draft_year
      `
      )
      .eq('draft_year', parseInt(draftYear))
      .order('rank', { ascending: true })

    if (error) {
      console.error('Database error fetching prospects:', error)
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
    }

    // Map database records to Prospect interface
    const prospects: Prospect[] = (data || []).map((record) => ({
      id: Number(record.id),
      rank: Number(record.rank) || 999,
      name: record.name || '',
      position: record.position || '',
      school: record.school || 'TBD',
      espn_id: record.espn_id ? Number(record.espn_id) : null,
      projectedRound: getProjectedRound(Number(record.rank) || 999),
      // New fields
      tier: record.tier,
      tier_numeric: record.tier_numeric,
      valuation: record.valuation ? Number(record.valuation) : null,
      overall_grade: record.overall_grade ? Number(record.overall_grade) : null,
      grade_tier: record.grade_tier,
      nfl_comparisons: record.nfl_comparisons,
      height: record.height ? Number(record.height) : null,
      weight: record.weight ? Number(record.weight) : null,
      draft_year: record.draft_year,
    }))

    // Return with no-cache headers to ensure fresh data
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
