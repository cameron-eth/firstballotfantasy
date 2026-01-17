import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic to always get fresh data (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to check if error is "table does not exist"
function isTableMissingError(error: unknown): boolean {
  if (!error) return false
  const message = String((error as Record<string, unknown>)?.message || error)
  return message.includes('does not exist') || message.includes('42P01')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') || 'all'

    const result: Record<string, unknown[]> = {
      modelPerformance: [],
      aggregatedStats: [],
      draftSuccess: [],
      breakoutBust: [],
      prospectAnalysis: [],
    }

    if (dataType === 'all' || dataType === 'model') {
      // Fetch model performance - gracefully handle missing table
      try {
        const { data: modelData, error: modelError } = await supabaseServer
          .from('master_model_performance')
          .select('*')
          .limit(1)

        if (modelError && !isTableMissingError(modelError)) {
          console.error('Model performance query failed:', modelError)
        }
        result.modelPerformance = modelData || []
      } catch (modelErr) {
        if (!isTableMissingError(modelErr)) {
          console.error('Model performance query failed:', modelErr)
        }
        result.modelPerformance = []
      }
    }

    if (dataType === 'all' || dataType === 'stats') {
      // Fetch aggregated stats - gracefully handle missing table
      try {
        const { data: statsData, error: statsError } = await supabaseServer
          .from('master_aggregated_stats')
          .select('*')
          .gte('season', 2020)
          .order('position')
          .order('season', { ascending: false })
          .order('avg_fantasy_ppg', { ascending: false })

        if (statsError && !isTableMissingError(statsError)) {
          console.error('Aggregated stats query failed:', statsError)
        }
        result.aggregatedStats = statsData || []
      } catch (statsErr) {
        if (!isTableMissingError(statsErr)) {
          console.error('Aggregated stats query failed:', statsErr)
        }
        result.aggregatedStats = []
      }
    }

    if (dataType === 'all' || dataType === 'draft') {
      // Fetch draft success rates - gracefully handle missing table
      try {
        const { data: draftData, error: draftError } = await supabaseServer
          .from('draft_success_rates')
          .select('*')
          .order('draft_round')

        if (draftError && !isTableMissingError(draftError)) {
          console.error('Draft success rates query failed:', draftError)
        }
        result.draftSuccess = draftData || []
      } catch (draftErr) {
        if (!isTableMissingError(draftErr)) {
          console.error('Draft success rates query failed:', draftErr)
        }
        result.draftSuccess = []
      }
    }

    if (dataType === 'all' || dataType === 'breakout') {
      // Fetch breakout/bust analysis - gracefully handle missing table
      try {
        const { data: bbData, error: bbError } = await supabaseServer
          .from('master_breakout_bust')
          .select(
            `
            player_name,
            position,
            season,
            fantasy_ppg,
            predicted_fantasy_ppg,
            prediction_error,
            analysis_type,
            surprise_factor,
            performance_ratio,
            tier_upgrade,
            tier_downgrade,
            player_id,
            recent_team
          `
          )
          .order('surprise_factor', { ascending: false })
          .limit(50)

        if (bbError && !isTableMissingError(bbError)) {
          console.error('Breakout/Bust query failed:', bbError)
        }
        result.breakoutBust = bbData || []
      } catch (bbErr) {
        if (!isTableMissingError(bbErr)) {
          console.error('Breakout/Bust query failed:', bbErr)
        }
        result.breakoutBust = []
      }
    }

    if (dataType === 'all' || dataType === 'prospect') {
      // Fetch prospect analysis - gracefully handle missing table
      try {
        const { data: prospectData, error: prospectError } = await supabaseServer
          .from('master_prospect_analysis')
          .select('*')
          .eq('analysis_type', 'prospect_tier')
          .order('hit_rate', { ascending: false })

        if (prospectError && !isTableMissingError(prospectError)) {
          console.error('Prospect analysis query failed:', prospectError)
        }
        result.prospectAnalysis = prospectData || []
      } catch (prospectErr) {
        if (!isTableMissingError(prospectErr)) {
          console.error('Prospect analysis query failed:', prospectErr)
        }
        result.prospectAnalysis = []
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    // Return empty data structure instead of 500 error
    return NextResponse.json({
      modelPerformance: [],
      aggregatedStats: [],
      draftSuccess: [],
      breakoutBust: [],
      prospectAnalysis: [],
    })
  }
}
