import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

async function middleware(request: NextRequest) {
  // Only run on API routes that need auth (exclude webhooks, overview, and public data endpoints)
  if (request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/api/webhooks') &&
      !request.nextUrl.pathname.startsWith('/api/overview') &&
      !request.nextUrl.pathname.startsWith('/api/ngs-stats') &&
      !request.nextUrl.pathname.startsWith('/api/test-ngs')) {
        
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    try {
      // Verify the token
      const { data: { user }, error } = await supabaseServer.auth.getUser(token)
      
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      
      // Add both the userId and the JWT token to headers for the API route
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', user.id)
      requestHeaders.set('x-user-jwt', token)
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

// Export both ways to satisfy Next.js requirements
export { middleware }
export default middleware

export const config = {
  matcher: '/api/:path*'
}