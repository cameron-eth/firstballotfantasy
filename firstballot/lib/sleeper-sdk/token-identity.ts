/** Accept common clipboard wrappers, but never guess or extract from arbitrary text. */
export function normalizeSleeperToken(input: string): string {
  let token = input.trim().replace(/^authorization\s*:\s*/i, '').replace(/^bearer\s+/i, '').trim()
  if ((token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))) token = token.slice(1, -1).trim()
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw new Error('Copy the complete Sleeper authorization token: all three dot-separated parts. Do not paste a decoded payload or a truncated value.')
  return token
}

/** Decode metadata only. The caller MUST authenticate the token with Sleeper. */
export function sleeperTokenIdentity(token: string): { user_id: string; exp: number } {
  const raw = Buffer.from(normalizeSleeperToken(token).split('.')[1], 'base64url').toString('utf8')
  // Skip JSON strings (including escaped quotes); quote unsafe integer literals
  // before JSON.parse can round Snowflake account IDs.
  const safe = raw.replace(
    /("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (literal, string) => {
      if (string || !/^-?\d+$/.test(literal)) return literal
      return Number.isSafeInteger(Number(literal)) ? literal : JSON.stringify(literal)
    }
  )
  let decoded
  try { decoded = JSON.parse(safe) } catch {
    throw new Error('The token payload is incomplete or invalid. Copy the full authorization value from a request on sleeper.com.')
  }
  if (!decoded || typeof decoded !== 'object')
    throw new Error('This is not a Sleeper authorization token.')
  if (typeof decoded.iss === 'string' && decoded.iss.includes('.supabase.co/auth/'))
    throw new Error('This is your First Ballot sign-in token. Copy the authorization value from sleeper.com, not firstballotff.com.')
  const id = String(decoded.user_id ?? '')
  if (!/^\d{10,25}$/.test(id) || typeof decoded.exp !== 'number' || !Number.isFinite(decoded.exp))
    throw new Error('This token does not contain a valid Sleeper account ID and expiration. Copy the authorization value from a request on sleeper.com.')
  return { user_id: id, exp: decoded.exp }
}

export function sleeperConnectionStatus(token: string | null, now = Date.now()) {
  if (!token) return { saved: false }
  try {
    const { exp } = sleeperTokenIdentity(token)
    return {
      saved: true,
      expired: exp * 1000 <= now,
      expiresAt: new Date(exp * 1000).toISOString(),
    }
  } catch {
    return { saved: true, expired: true }
  }
}
