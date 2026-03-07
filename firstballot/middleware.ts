import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

async function middleware(request: NextRequest) {
  // Public API routes that don't need authentication
  const publicRoutes = [
    '/api/webhooks',
    '/api/overview',
    '/api/ngs-stats',
    '/api/test-ngs',
    '/api/rankings',
    '/api/roster-stats',
    '/api/trade-market',
    '/api/prospects',
    '/api/draft-analysis',
  ]

  // Check if this is an API route that needs auth
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (isApiRoute && !isPublicRoute) {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    try {
      // Verify the token
      const {
        data: { user },
        error,
      } = await supabaseServer.auth.getUser(token)

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
  matcher: '/api/:path*',
}
