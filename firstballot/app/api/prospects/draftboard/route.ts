import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RawProspect {
  rank: number | null
  name: string | null
  school: string | null
  position: string | null
  overall_grade: number | null
  grade_tier: string | null
  height: number | null
  weight: number | null
  college_stats: Record<string, number | string> | null
  college_production_score: number | null
  physical_measurables_score: number | null
  espn_id: number | null
  draft_year: number | null
  headshot_url: string | null
}

interface DraftboardPlayer {
  rank: number
  name: string
  school: string
  position: string
  grade: number
  tier: string
  height: string
  weight: number
  fortyTime: number | null
  production: number
  physical: number
  espnId: string
  isCollege: boolean
  headshotUrl: string | null
}

function formatHeight(inches: number | null): string {
  if (!inches) return '—'
  const ft = Math.floor(inches / 12)
  const rem = Math.round(inches % 12)
  return `${ft}'${rem}"`
}

function parseFortyTime(stats: Record<string, number | string> | null): number | null {
  if (!stats) return null
  const raw = stats.forty_time ?? stats['40yd'] ?? stats.forty ?? null
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTier(tier: string | null, grade: number): string {
  if (tier) return tier
  if (grade >= 90) return 'Elite'
  if (grade >= 85) return 'Blue Chip'
  if (grade >= 78) return 'Starter'
  if (grade >= 70) return 'Rotational'
  if (grade >= 60) return 'Depth'
  return 'Longshot'
}

function toPlayer(raw: RawProspect, rank: number): DraftboardPlayer {
  const grade = Number(raw.overall_grade || 0)
  const espnIdStr = raw.espn_id ? String(raw.espn_id) : ''
  return {
    rank,
    name: raw.name || '',
    school: raw.school || 'TBD',
    position: raw.position || '',
    grade,
    tier: normalizeTier(raw.grade_tier, grade),
    height: formatHeight(raw.height),
    weight: raw.weight ? Math.round(Number(raw.weight)) : 0,
    fortyTime: parseFortyTime(raw.college_stats),
    production: Math.max(0, Math.min(100, Math.round(Number(raw.college_production_score || 0)))),
    physical: Math.max(0, Math.min(100, Math.round(Number(raw.physical_measurables_score || 0)))),
    espnId: espnIdStr,
    isCollege: (raw.draft_year || 0) >= 2025,
    headshotUrl: raw.headshot_url,
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('dynasty_prospects')
      .select(
        `
        rank,
        name,
        school,
        position,
        overall_grade,
        grade_tier,
        height,
        weight,
        college_stats,
        college_production_score,
        physical_measurables_score,
        espn_id,
        draft_year,
        headshot_url
      `
      )
      .in('position', ['QB', 'RB', 'WR', 'TE'])
      .not('overall_grade', 'is', null)
      .order('overall_grade', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch draftboard prospects' }, { status: 500 })
    }

    const players = (data || []).map((row, idx) => toPlayer(row as RawProspect, idx + 1))
    const byPosition = {
      QB: players.filter((p) => p.position === 'QB'),
      RB: players.filter((p) => p.position === 'RB'),
      WR: players.filter((p) => p.position === 'WR'),
      TE: players.filter((p) => p.position === 'TE'),
    }

    const classAverages = {
      grade: players.length ? players.reduce((sum, p) => sum + p.grade, 0) / players.length : 0,
      physical: players.length
        ? players.reduce((sum, p) => sum + p.physical, 0) / players.length
        : 0,
      production: players.length
        ? players.reduce((sum, p) => sum + p.production, 0) / players.length
        : 0,
    }

    return NextResponse.json({
      year: 'All Classes',
      totalProspects: players.length,
      allProspects: players,
      byPosition,
      classAverages,
    })
  } catch (e) {
    console.error('Error in /api/prospects/draftboard:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
