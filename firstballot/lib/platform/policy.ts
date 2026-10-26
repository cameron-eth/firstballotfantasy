export const READ_SCOPES = ['teams:read', 'players:read'] as const
export function teamCapacity(
  billing: { status: string; paid_slots: number; period_end: string | null } | null,
  now = Date.now()
) {
  return (
    1 +
    (billing &&
    ['active', 'trialing'].includes(billing.status) &&
    Date.parse(billing.period_end ?? '') > now
      ? billing.paid_slots
      : 0)
  )
}
export function freshness(expiresAt: string, observedAt: string | null, now = Date.now()) {
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now)
    return 'expired' as const
  return observedAt ? ('current' as const) : ('source-time-unknown' as const)
}
export function isPublicApi(path: string) {
  return new Set([
    '/api/internal/refresh-data',
    '/api/webhooks/stripe',
    '/api/overview',
    '/api/ngs-stats',
    '/api/rankings',
    '/api/roster-stats',
    '/api/trade-market',
    '/api/prospects',
    '/api/history-outcomes',
    '/api/ktc-values',
    '/api/projections',
    '/api/draft-capital',
    '/api/trade-inventory',
    '/api/player-momentum',
    '/api/data-health',
  ]).has(path)
}
export function sourceWithinBudget(
  value: string | null | undefined,
  maxAgeMs: number,
  now = Date.now()
) {
  const timestamp = Date.parse(value ?? '')
  return Number.isFinite(timestamp) && timestamp <= now + 300000 && now - timestamp <= maxAgeMs
}
