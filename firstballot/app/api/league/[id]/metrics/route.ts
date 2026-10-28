import { NextResponse } from 'next/server'
import { failure, PlatformError } from '@/lib/platform/http'
import { snapshot, snapshotMetadata } from '@/lib/platform/snapshots'
import { leagueMetricsKey } from '@/lib/platform/snapshot-keys'
import { sleeperRead } from '@/lib/platform/teams'
import { resolveLeagueContext } from '@/lib/league-metrics/context'
import {
  LEAGUE_METRICS_VERSION,
  leagueInputHash,
  leagueMetrics,
  loadLeagueInputs,
  type LeagueMetrics,
} from '@/lib/league-metrics/compute'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Payload = {
  version: number
  inputHash: string
  computedAt: string
  metrics: LeagueMetrics
}

/** League metrics are re-derived at most every 15 minutes, the dashboard's own poll. */
const TTL_SECONDS = 900

/**
 * Every league-level dashboard metric for one league, computed on the server by the same
 * modules the dashboard runs (lib/league-metrics/compute, PR-15). Snapshotted per league,
 * format and week, with a hash of the inputs it was computed from.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!/^\d{10,25}$/.test(id)) throw new PlatformError(400, 'INVALID_LEAGUE', 'Invalid league.')
    const [state, league] = await Promise.all([
      sleeperRead('state/nfl'),
      sleeperRead(`league/${id}`),
    ])
    if (!league) throw new PlatformError(404, 'LEAGUE_NOT_FOUND', 'League not found.')
    const week = Number(state?.week) || 0
    const format = resolveLeagueContext(league).superflex ? 'sf' : '1qb'
    // The app's own public API routes, on this deployment.
    const apiBase = new URL(request.url).origin
    const result = await snapshot<Payload>(
      leagueMetricsKey(id, format, week),
      'Sleeper + KTC + ESPN',
      TTL_SECONDS,
      async () => {
        const inputs = await loadLeagueInputs(id, apiBase)
        return {
          payload: {
            version: LEAGUE_METRICS_VERSION,
            inputHash: leagueInputHash(inputs),
            computedAt: new Date().toISOString(),
            metrics: leagueMetrics(inputs),
          },
          season: Number(state?.season) || undefined,
          week: week || undefined,
        }
      },
      (p) => p?.version === LEAGUE_METRICS_VERSION && typeof p.inputHash === 'string'
    )
    return NextResponse.json(
      { ...result.payload, freshness: snapshotMetadata(result) },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    )
  } catch (e) {
    return failure(e)
  }
}
