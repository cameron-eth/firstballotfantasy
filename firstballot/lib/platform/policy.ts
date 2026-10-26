export const READ_SCOPES = ['teams:read', 'players:read'] as const
export const KTC_MAX_AGE_MS = 48 * 60 * 60 * 1000
export function teamCapacity(
  billing: { status: string; paid_slots: number; period_end: string | null } | null,
  now = Date.now()
) {
  const active =
    billing &&
    ['active', 'trialing'].includes(billing.status) &&
    Date.parse(billing.period_end ?? '') > now
  // null is an explicit unlimited entitlement, including over JSON.
  return active ? (billing.paid_slots === -1 ? null : 1 + billing.paid_slots) : 1
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
    '/api/dynasty-tiers',
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
