import { PlatformError } from './http'

/**
 * The browser session, verified once per request. middleware.ts checks the JWT with Supabase,
 * then sets these headers; on every other path it strips them, so a client cannot supply them.
 * Routes read the session from here instead of verifying the token again.
 */
export const SESSION_HEADERS = ['x-user-id', 'x-user-jwt', 'x-user-email', 'x-user-name'] as const

export type SessionUser = { userId: string; jwt: string; email?: string; username?: string }

/** Headers middleware.ts attaches for a verified user. The name is URI-encoded to stay ASCII. */
export function sessionHeaders(
  user: { id: string; email?: string | null; user_metadata?: { username?: unknown } },
  jwt: string
) {
  const headers: Record<string, string> = { 'x-user-id': user.id, 'x-user-jwt': jwt }
  if (user.email) headers['x-user-email'] = user.email
  if (typeof user.user_metadata?.username === 'string')
    headers['x-user-name'] = encodeURIComponent(user.user_metadata.username)
  return headers
}

export function readSession(request: Request): SessionUser | null {
  const userId = request.headers.get('x-user-id')
  const jwt = request.headers.get('x-user-jwt')
  if (!userId || !jwt) return null
  const name = request.headers.get('x-user-name')
  return {
    userId,
    jwt,
    email: request.headers.get('x-user-email') ?? undefined,
    username: name == null ? undefined : decodeURIComponent(name),
  }
}

export function sessionUser(request: Request): SessionUser {
  const session = readSession(request)
  if (!session) throw new PlatformError(401, 'UNAUTHENTICATED', 'Sign in to continue.')
  return session
}
