/** Decode metadata only. The caller MUST authenticate the token with Sleeper. */
export function sleeperTokenIdentity(token: string): { user_id: string; exp: number } {
  const raw = Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')
  // Skip JSON strings (including escaped quotes); quote unsafe integer literals
  // before JSON.parse can round Snowflake account IDs.
  const safe = raw.replace(
    /("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (literal, string) => {
      if (string || !/^-?\d+$/.test(literal)) return literal
      return Number.isSafeInteger(Number(literal)) ? literal : JSON.stringify(literal)
    }
  )
  const decoded = JSON.parse(safe)
  const id = String(decoded.user_id ?? '')
  if (!/^\d{10,25}$/.test(id) || typeof decoded.exp !== 'number' || !Number.isFinite(decoded.exp))
    throw new Error('Invalid Sleeper token identity')
  return { user_id: id, exp: decoded.exp }
}
