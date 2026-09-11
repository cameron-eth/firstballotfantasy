/**
 * Resolving which weeks add up to a season total. Kept free of React and network
 * imports so the rule can be tested directly.
 */
export interface LeagueInfo {
  season?: string
  status?: string
  settings?: { playoff_week_start?: number }
}

export interface NflState {
  season?: string
  week?: number
  display_week?: number
  season_type?: string
}

export interface SeasonWindow {
  /** Every regular-season week to total up, 1 through the current one. */
  weeks: number[]
  season: string
  /** Last week that counts toward draft order — the week before the playoffs. */
  lastRegularWeek: number
  /**
   * The week still being played, if any. It is included in `weeks` — a season total
   * has to move as this week scores — but it is the one week that can't be cached.
   */
  liveWeek: number | null
}

/**
 * Which weeks add up to "season Max PF", resolved from Sleeper rather than assumed.
 *
 * Two things this has to get right. Draft position is settled by the regular season,
 * so playoff weeks never count. And the league has to be the one currently being
 * played: league ids change every year, so pairing a past-season league with the live
 * NFL week would total a handful of weeks of a season that already finished. When the
 * league isn't live — it's complete, or it belongs to an earlier season — the answer
 * is its whole regular season.
 */
export function resolveSeasonWindow(
  nflState: NflState | null,
  league: LeagueInfo | null
): SeasonWindow {
  const playoffWeekStart = league?.settings?.playoff_week_start
  const lastRegularWeek = playoffWeekStart && playoffWeekStart > 1 ? playoffWeekStart - 1 : 18
  const season = league?.season || nflState?.season || ''

  const leagueIsLive =
    league?.status !== 'complete' &&
    (!league?.season || !nflState?.season || league.season === nflState.season)

  const nflWeek = nflState?.week || nflState?.display_week || 0
  const inGameWeeks = nflState?.season_type === 'regular' || nflState?.season_type === 'post'

  let throughWeek: number
  let liveWeek: number | null = null
  if (!leagueIsLive) {
    throughWeek = lastRegularWeek
  } else if (inGameWeeks) {
    // The current week is included, not excluded — it is the whole point of a race.
    throughWeek = Math.min(Math.max(nflWeek, 0), lastRegularWeek)
    liveWeek = throughWeek
  } else {
    // Pre-season or off-season: nothing has been scored to total up yet.
    throughWeek = 0
  }

  const weeks: number[] = []
  for (let week = 1; week <= throughWeek; week++) weeks.push(week)
  return { weeks, season, liveWeek, lastRegularWeek }
}
