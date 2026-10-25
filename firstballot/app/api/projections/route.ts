import { NextRequest, NextResponse } from 'next/server'
import { analyzeCoverage, type ScoringSettings } from '@/lib/projections/scoring'

import { normalizeProjection, type SleeperProjectionRow } from '@/lib/projections/normalize'

/**
 * Sleeper projections, converted to a league's own scoring and slimmed for the client.
 *
 * This has to be a server route. The upstream payload is ~2 MB for one week and ~3 MB
 * for season totals, nearly all of it players nobody rosters — sending that to the
 * browser (let alone once per week of the season) is not viable. Here we score it,
 * drop unpublished filler rows, and return a compact map. Published zeroes remain valid.
 *
 *   GET /api/projections?leagueId=123           -> season totals, current season
 *   GET /api/projections?leagueId=123&week=3    -> one week
 *
 * `season` defaults to whatever Sleeper says the live season is. Callers should leave
 * it off; passing a hardcoded year is how a board quietly ends up showing last season.
 */

// Sleeper's projections host is api.sleeper.com — note *.com, not the *.app host the
// rest of the API uses — and it 403s a request without a browser-ish User-Agent.
const PROJECTIONS_HOST = 'https://api.sleeper.com'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

const FANTASY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

/** Weekly numbers move with injury news; season totals barely move. */
const WEEKLY_REVALIDATE = 900 // 15 min
const SEASON_REVALIDATE = 21600 // 6 hours

export interface ProjectionEntry {
  /** League-scored projected points. */
  pts: number
  /** Projected games played — 1 for a weekly row, ~18 for a season total. */
  gp: number
  opponent?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const week = params.get('week')
    const leagueId = params.get('leagueId')

    if (week && (!/^\d+$/.test(week) || Number(week) < 1 || Number(week) > 18)) {
      return NextResponse.json({ error: 'Invalid regular-season week' }, { status: 400 })
    }

    const season =
      params.get('season') ||
      (await fetch('https://api.sleeper.app/v1/state/nfl', { next: { revalidate: 600 } })
        .then((r) => (r.ok ? r.json() : null))
        .then((state) => state?.season as string | undefined)
        .catch(() => undefined))

    if (!season) {
      return NextResponse.json({ error: 'Could not resolve the current season' }, { status: 502 })
    }

    const positionQuery = FANTASY_POSITIONS.map((p) => `position[]=${p}`).join('&')
    const path = week ? `${season}/${week}` : season
    const url = `${PROJECTIONS_HOST}/projections/nfl/${path}?season_type=regular&${positionQuery}&order_by=pts_ppr`

    const [projectionResponse, league] = await Promise.all([
      fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        next: { revalidate: week ? WEEKLY_REVALIDATE : SEASON_REVALIDATE },
      }),
      leagueId
        ? fetch(`https://api.sleeper.app/v1/league/${leagueId}`, {
            next: { revalidate: SEASON_REVALIDATE },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ])

    if (!projectionResponse.ok) {
      return NextResponse.json(
        { error: `Sleeper projections returned ${projectionResponse.status}` },
        { status: 502 }
      )
    }

    const rows = (await projectionResponse.json()) as SleeperProjectionRow[]
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: 'Unexpected projections payload' }, { status: 502 })
    }

    if (leagueId && !league?.scoring_settings) {
      return NextResponse.json({ error: 'League scoring unavailable' }, { status: 502 })
    }

    const scoring: ScoringSettings | null = league?.scoring_settings ?? null

    const points: Record<string, ProjectionEntry> = {}
    const statKeys = new Set<string>()

    for (const row of rows) {
      if (!row?.player_id || !row.stats) continue
      for (const key of Object.keys(row.stats)) statKeys.add(key)

      const entry = normalizeProjection(row, scoring)
      if (entry) points[row.player_id] = entry
    }

    const coverage = scoring
      ? analyzeCoverage(scoring, statKeys)
      : { unmatchedKeys: [], exact: false }

    return NextResponse.json(
      {
        season,
        week: week ? Number(week) : null,
        scoring: scoring ? 'league' : 'ppr',
        /** False when a scoring rule pays out but is never projected — all K/DEF in practice. */
        exact: coverage.exact,
        unmatchedKeys: coverage.unmatchedKeys,
        count: Object.keys(points).length,
        generatedAt: new Date().toISOString(),
        byes: week
          ? rows
              .filter(
                (row) =>
                  row.team && row.game_id === null && !Object.hasOwn(row.stats ?? {}, 'pts_ppr')
              )
              .map((row) => row.player_id)
          : [],
        points,
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${week ? WEEKLY_REVALIDATE : SEASON_REVALIDATE}, stale-while-revalidate=3600`,
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load projections' },
      { status: 500 }
    )
  }
}
