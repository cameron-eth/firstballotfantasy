import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { isPublicApi } from '@/lib/platform/policy'

async function middleware(request: NextRequest) {
  // These transports authenticate independently with scoped API/OAuth credentials.
  if (request.nextUrl.pathname.startsWith('/api/v1/') || request.nextUrl.pathname === '/api/mcp')
    return NextResponse.next()
  const isPublicRoute = isPublicApi(request.nextUrl.pathname)
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

      // OAuth access belongs to the scoped API/MCP surface, never the browser API.
      const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (claims.client_id)
        return NextResponse.json({ error: 'Use the scoped API for OAuth access.' }, { status: 403 })
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

  const clean = new Headers(request.headers)
  clean.delete('x-user-id')
  clean.delete('x-user-jwt')
  return NextResponse.next({ request: { headers: clean } })
}

// Export both ways to satisfy Next.js requirements
export { middleware }
export default middleware

export const config = {
  matcher: '/api/:path*',
}
