import 'server-only'
import identities from '@/data/nfl-player-identities.json'
import {
  currentSeasonStats,
  type CurrentSeasonStat,
  type EspnFantasyPlayer,
} from '@/lib/current-season-stats'
import { snapshot, snapshotMetadata } from './snapshots'
import { sleeperRead } from './teams'
import { PlatformError } from './http'
/** ESPN's season totals start here; earlier seasons return no players. */
export const FIRST_ESPN_SEASON = 2018

/** Snapshot key for one season of ESPN PPR totals. */
export const espnSeasonKey = (season: number) => `espn:ppr:${season}`

/**
 * How long past expiry a season may be served, flagged stale, while ESPN is failing
 * (stale-while-error, PR-12). The current season moves weekly, so a day; past seasons are
 * final, so their whole cache lifetime again.
 */
const STALE_CURRENT_SEASON_SECONDS = 24 * 3600

/** One season of ESPN PPR totals, snapshotted. Past seasons are final, so they cache long. */
function espnSeason(season: number, ttlSeconds: number, maxStaleSeconds: number) {
  return snapshot(
    espnSeasonKey(season),
    'ESPN',
    ttlSeconds,
    async () => {
      const filter = {
        players: {
          limit: 3000,
          sortPercOwned: { sortPriority: 1, sortAsc: false },
          filterStatsForTopScoringPeriodIds: { value: 1, additionalValue: [`00${season}`] },
        },
      }
      const r = await fetch(
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leaguedefaults/3?view=kona_player_info`,
        {
          headers: { 'X-Fantasy-Filter': JSON.stringify(filter) },
          cache: 'no-store',
          signal: AbortSignal.timeout(20000),
        }
      )
      if (!r.ok) throw new Error('ESPN_UNAVAILABLE')
      const payload = await r.json()
      if (
        !Array.isArray(payload.players) ||
        payload.players.length >= 3000 ||
        payload.players.length < 100
      )
        throw new Error('INCOMPLETE_COVERAGE')
      return {
        payload: currentSeasonStats(
          payload.players.map((p: { player: EspnFantasyPlayer }) => p.player),
          season
        ),
        season,
      }
    },
    (p) => typeof p === 'object' && p !== null && Object.keys(p).length > 50,
    { maxStaleSeconds }
  )
}

/** Past seasons are final, so they cache for 30 days; the hourly refresh job re-warms them. */
export const PAST_SEASON_TTL = 30 * 24 * 3600

/**
 * Every completed season since FIRST_ESPN_SEASON, or null if any one fails: a missing season
 * would silently understate a career, so the card then shows only the current season.
 */
async function pastSeasons(season: number) {
  try {
    const past = await Promise.all(
      Array.from({ length: season - FIRST_ESPN_SEASON }, (_, i) =>
        espnSeason(FIRST_ESPN_SEASON + i, PAST_SEASON_TTL, PAST_SEASON_TTL)
      )
    )
    return { payloads: past.map((p) => p.payload), stale: past.some((p) => p.stale === true) }
  } catch {
    return null
  }
}

/** Career PPR points per game: total points over total games, past seasons plus this one. */
function careerTotals(
  past: Record<string, CurrentSeasonStat>[],
  current: Record<string, CurrentSeasonStat>
): Record<string, { ppg: number; games: number }> {
  const totals: Record<string, { points: number; games: number }> = {}
  for (const year of [...past, current])
    for (const [id, s] of Object.entries(year)) {
      const t = (totals[id] ??= { points: 0, games: 0 })
      t.points += s.points
      t.games += s.games
    }
  return Object.fromEntries(
    Object.entries(totals).map(([id, t]) => [id, { ppg: t.points / t.games, games: t.games }])
  )
}

export async function playerData(ids: string[], maxIds = 100) {
  if (!ids.length || ids.length > maxIds || ids.some((id) => !/^\w{1,30}$/.test(id)))
    throw new PlatformError(400, 'INVALID_PLAYERS', `Provide 1–${maxIds} player IDs.`)
  const state = await sleeperRead('state/nfl'),
    season = Number(state.season)
  if (!Number.isInteger(season) || season < 2020 || season > new Date().getUTCFullYear() + 1)
    throw new PlatformError(502, 'INVALID_SEASON', 'Season source is invalid.')
  // Past seasons load alongside the current one, so a cold cache costs one round trip, not two.
  const [data, past] = await Promise.all([
    espnSeason(season, 900, STALE_CURRENT_SEASON_SECONDS),
    pastSeasons(season),
  ])
  const career = past && careerTotals(past.payloads, data.payload)
  return {
    season,
    scoring: 'PPR',
    rankPopulation: 'All NFL players with at least one game; ties share rank',
    freshness: snapshotMetadata(data),
    /** Seasons behind career FPPG, or null when one is unavailable (career badges hide). */
    careerSeasons: past
      ? {
          from: FIRST_ESPN_SEASON,
          to: season,
          /** A past season is being served past its expiry while ESPN fails (PR-12). */
          stale: past.stale,
        }
      : null,
    data: ids.map((id) => {
      const identity = (identities as Record<string, { espnId: string; name: string }>)[id],
        s = identity ? data.payload[identity.espnId] : null
      return {
        sleeper_player_id: id,
        player_name: identity?.name ?? 'Unknown',
        fantasy_ppg: s?.ppg ?? null,
        total_fantasy_points: s?.points ?? null,
        games_played: s?.games ?? 0,
        fppg_rank: s?.rank ?? null,
        fppg_position: s?.position ?? null,
        stats_season: season,
        career_ppg: identity ? (career?.[identity.espnId]?.ppg ?? null) : null,
        career_games: identity ? (career?.[identity.espnId]?.games ?? 0) : 0,
        career_from: career ? FIRST_ESPN_SEASON : null,
        stats_source: 'ESPN',
        stats_scoring: 'PPR',
        headshot_url: identity?.espnId
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${identity.espnId}.png`
          : null,
      }
    }),
  }
}
