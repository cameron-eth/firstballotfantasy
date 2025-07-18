import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('Test API called')
    
    // Test Supabase connection
    const { data, error } = await supabaseServer
      .from('dynasty_sf_top_150')
      .select('count')
      .limit(1)
    
    console.log('Supabase test result:', { data, error })
    
    return NextResponse.json({
      success: true,
      message: 'Test API working',
      supabase: {
        hasData: !!data,
        hasError: !!error,
        error: error?.message || null
      }
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'Test API failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 