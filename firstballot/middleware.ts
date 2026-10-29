import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { isPublicApi } from '@/lib/platform/policy'
import { SESSION_HEADERS, sessionHeaders } from '@/lib/platform/session'

const denied = (error: string, code: string, status = 401) =>
  NextResponse.json({ error, code }, { status, headers: { 'Cache-Control': 'private, no-store' } })

/**
 * The one place a browser session JWT is verified (lib/platform/session.ts). Identity headers
 * are stripped from every request first, so only a token verified here can set them.
 */
async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  for (const name of SESSION_HEADERS) headers.delete(name)

  // v1 and MCP authenticate independently with scoped API/OAuth credentials; public routes need none.
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/v1/') || path === '/api/mcp' || isPublicApi(path))
    return NextResponse.next({ request: { headers } })

  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token || token.length > 12000) return denied('Unauthorized', 'UNAUTHENTICATED')
  try {
    const {
      data: { user },
      error,
    } = await supabaseServer.auth.getUser(token)
    if (error || !user) return denied('Invalid token', 'UNAUTHENTICATED')

    // OAuth access belongs to the scoped API/MCP surface, never the browser API.
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (claims.client_id)
      return denied('Use the scoped API for OAuth access.', 'WEB_SESSION_REQUIRED', 403)
    for (const [name, value] of Object.entries(sessionHeaders(user, token)))
      headers.set(name, value)
    return NextResponse.next({ request: { headers } })
  } catch {
    return denied('Authentication failed', 'UNAUTHENTICATED')
  }
}

// Export both ways to satisfy Next.js requirements
export { middleware }
export default middleware

export const config = {
  matcher: '/api/:path*',
}
