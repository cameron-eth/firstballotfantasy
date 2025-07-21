import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabaseServer
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: error 
      }, { status: 500 })
    }
    
    console.log('Database connection successful')
    
    // Test table structure
    const { data: tableInfo, error: tableError } = await supabaseServer
      .from('user_profiles')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('Table structure error:', tableError)
      return NextResponse.json({ 
        error: 'Table access failed', 
        details: tableError 
      }, { status: 500 })
    }
    
    console.log('Table access successful')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection and table access working',
      tableColumns: Object.keys(tableInfo || {})
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error 
    }, { status: 500 })
  }
} 