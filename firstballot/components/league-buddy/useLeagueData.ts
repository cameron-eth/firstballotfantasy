import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { leagueCache } from '@/lib/league-cache'
import { teamScores } from '@/lib/team-score'
import { resolveLeagueContext, type LeagueContext } from '@/lib/league-metrics/context'
import { sleeperPoints } from '@/lib/league-metrics/standings'
import { getCacheVersion, useCacheVersion } from '@/lib/cache-version'
import { sleeperApi } from '@/lib/nextjs-cache'
import type {
  TeamData,
  PlayerData,
  MatchupData,
  SleeperMatchup,
  LeagueOverview,
  TrendingPlayer,
  KtcHistoryPoint,
  SleeperTransaction,
} from './types'
import {
  calculateGradeFromPercentile,
  calculatePositionStrengths,
  calculateRecentForm,
  getOpponentInfo,
  countRosterPositions,
} from './utils'

interface UseLeagueDataReturn {
  teams: TeamData[]
  loading: boolean
  /** False until KTC values have been merged (or failed), so value-based models don't flash fallback results. */
  valuesReady: boolean
  error: string | null
  selectedTeam: TeamData | null
  setSelectedTeam: (team: TeamData | null) => void
  leagueOverview: LeagueOverview | null
  currentMatchups: MatchupData[]
  currentWeek: number
  nflGames: Record<string, { opponent: string; isHome: boolean }>
  allPlayers: Record<string, any>
  playerRankings: Record<string, any>
  rosterPositionsRaw: string[]
  /** League format (superflex or 1QB), resolved once for every metric. */
  leagueContext: LeagueContext
  leagueTransactions: SleeperTransaction[]
  refetch: () => Promise<void>
}

interface SleeperRoster {
  players?: string[]
  roster_id?: number
  owner_id?: string
  rank?: number
  starters?: string[]
  settings?: {
    wins?: number
    losses?: number
    ties?: number
    fpts?: number
    fpts_decimal?: number
    fpts_against?: number
    fpts_against_decimal?: number
    waiver_position?: number
    total_moves?: number
  }
}

interface SleeperUser {
  user_id?: string
  display_name?: string
  first_name?: string
  metadata?: {
    team_name?: string
  }
  avatar?: string
}

interface TierEntry {
  rank: number
  number: number
  name: string
  emphasis: string
  score: number
  positionRank?: number
  delta30?: number | null
}

interface TierResponse {
  players?: {
    sf?: Record<string, TierEntry>
    one_qb?: Record<string, TierEntry>
  }
}

interface TrendingItem {
  player_id: string
  count: number
}

interface LeagueDataBundle {
  teams: TeamData[]
  leagueOverview: LeagueOverview | null
  currentMatchups: MatchupData[]
  currentWeek: number
  nflGames: Record<string, { opponent: string; isHome: boolean }>
  allPlayers: Record<string, any>
  playerRankings: Record<string, any>
  defaultSelectedRosterId: number | null
  rosterPositionsRaw: string[]
  leagueContext: LeagueContext
  leagueTransactions: SleeperTransaction[]
}

function getUserId(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') return undefined
  const maybeUserId = (user as { user_id?: unknown }).user_id
  return typeof maybeUserId === 'string' ? maybeUserId : undefined
}

async function fetchWeekSchedule(week: number): Promise<any[]> {
  const endpoints = [
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${new Date().getFullYear()}`,
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      const data = await response.json()
      if (data.events && data.events.length > 0) {
        return data.events
          .map((event: any) => {
            const competition = event.competitions?.[0]
            if (!competition?.competitors) return null
            const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home')
            const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away')
            if (!homeTeam || !awayTeam) return null
            return {
              home_team: homeTeam.team?.abbreviation,
              away_team: awayTeam.team?.abbreviation,
            }
          })
          .filter(Boolean)
      }
    } catch {
      continue
    }
  }

  return []
}

const PLAYERS_TTL_MS = 6 * 60 * 60 * 1000
let playersMemo: { at: number; data: Promise<Record<string, any>> } | null = null

/** The Sleeper player blob is ~10 MB parsed; keep one copy per session instead of one per refetch. */
function getPlayersOnce(): Promise<Record<string, any>> {
  if (playersMemo && Date.now() - playersMemo.at < PLAYERS_TTL_MS) return playersMemo.data
  const data = sleeperApi.getAllPlayers() as Promise<Record<string, any>>
  playersMemo = { at: Date.now(), data }
  data.catch(() => {
    if (playersMemo?.data === data) playersMemo = null
  })
  return data
}

export function clearPlayersMemo() {
  playersMemo = null
}

const fresh = { cache: 'no-store' } as const

export async function fetchLeagueDataBundle(
  leagueId: string,
  user: unknown,
  version: number
): Promise<LeagueDataBundle> {
  leagueCache.setLeagueId(leagueId)
  const v = `_v=${version}`

  interface NflState {
    week?: number
    display_week?: number
    season_type?: string
  }

  // Wave 1: everything that does not depend on the current week.
  const [nflState, rosters, users, allPlayersData, league, rankingsResult, trending] =
    (await Promise.all([
      fetch('https://api.sleeper.app/v1/state/nfl', fresh).then((r) => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, fresh).then((r) => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, fresh).then((r) => r.json()),
      getPlayersOnce(),
      sleeperApi.getLeagueInfo(leagueId),
      fetch(`/api/dynasty-tiers?${v}`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      sleeperApi.getTrendingPlayers().catch(() => []),
    ])) as [NflState, SleeperRoster[], SleeperUser[], Record<string, any>, any, any, any]
  const week = nflState?.week || nflState?.display_week || 1

  if (!rosters || !users || !allPlayersData || !league) {
    throw new Error('Invalid data received from API')
  }
  const allSleeperPlayerIds = Array.from(new Set(rosters.flatMap((r) => r.players || [])))

  // Wave 2: week-dependent and roster-dependent requests, all in flight together.
  const [matchups, nflScheduleData, statsResponse, txResults] = (await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, fresh)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetchWeekSchedule(week),
    allSleeperPlayerIds.length > 0
      ? fetch(`/api/roster-stats?player_ids=${allSleeperPlayerIds.join(',')}&${v}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
    Promise.all(
      Array.from({ length: week }, (_, i) => i + 1).map((w) =>
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${w}`, fresh)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])
      )
    ),
  ])) as [SleeperMatchup[], any[], any, SleeperTransaction[][]]

  const validUsers = users.filter((u) => u && u.user_id)
  const validRosters = rosters.filter((r) => r && r.roster_id)

  if (!rosters || !users || !allPlayersData || !league) {
    throw new Error('Invalid data received from API')
  }

  const rosterStatsMap: Record<
    string,
    {
      fantasy_ppg: number
      fppg_rank?: number | null
      fppg_position?: string | null
      stats_season?: number
      total_fantasy_points: number
      games_played: number
      headshot_url?: string | null
      career_ppg?: number | null
      career_games?: number
      career_from?: number | null
    }
  > = {}

  if (Array.isArray(statsResponse?.data)) {
    statsResponse.data.forEach(
      (playerStats: {
        sleeper_player_id: string
        fantasy_ppg: number | string
        fppg_rank?: number | null
        fppg_position?: string | null
        stats_season?: number
        total_fantasy_points: number | string
        games_played: number
        headshot_url?: string | null
        career_ppg?: number | null
        career_games?: number
        career_from?: number | null
      }) => {
        if (playerStats.fantasy_ppg == null || !Number.isFinite(Number(playerStats.fantasy_ppg)))
          return
        rosterStatsMap[playerStats.sleeper_player_id] = {
          fantasy_ppg: parseFloat(String(playerStats.fantasy_ppg)) || 0,
          fppg_rank: playerStats.fppg_rank,
          fppg_position: playerStats.fppg_position,
          stats_season: playerStats.stats_season,
          total_fantasy_points: parseFloat(String(playerStats.total_fantasy_points)) || 0,
          games_played: playerStats.games_played || 0,
          headshot_url: playerStats.headshot_url || null,
          career_ppg: playerStats.career_ppg,
          career_games: playerStats.career_games,
          career_from: playerStats.career_from,
        }
      }
    )
  }

  const leagueContext = resolveLeagueContext(league)
  const rankingsMap =
    (rankingsResult as TierResponse)?.players?.[leagueContext.superflex ? 'sf' : 'one_qb'] ?? {}

  const enhancedPlayers = { ...allPlayersData }
  Object.entries(rosterStatsMap).forEach(([sleeperId, stats]) => {
    if (!enhancedPlayers[sleeperId]) return
    enhancedPlayers[sleeperId] = {
      ...enhancedPlayers[sleeperId],
      fantasy_ppg: stats.fantasy_ppg,
      fppg_rank: stats.fppg_rank,
      fppg_position: stats.fppg_position,
      stats_season: stats.stats_season,
      fantasy_points_ppr: stats.total_fantasy_points,
      games_played: stats.games_played,
      headshot_url: stats.headshot_url,
      career_ppg: stats.career_ppg,
      career_games: stats.career_games,
      career_from: stats.career_from,
    }
  })

  const trendingPlayers: TrendingPlayer[] = Array.isArray(trending)
    ? trending
        .map((item: TrendingItem) => {
          const player = allPlayersData[item.player_id]
          return {
            playerId: item.player_id || '',
            playerName: player ? `${player.first_name} ${player.last_name}` : 'Unknown Player',
            position: player?.position || 'N/A',
            team: player?.team || 'N/A',
            addCount: item.count || 0,
            dropCount: 0,
            netChange: item.count || 0,
            espn_id: player?.espn_id,
          }
        })
        .filter((player: TrendingPlayer) => player.playerName !== 'Unknown Player')
    : []

  const matchupData: MatchupData[] = []
  const matchupMap = new Map<number, SleeperMatchup[]>()

  if (matchups && matchups.length > 0) {
    matchups.forEach((matchup) => {
      const matchupId = matchup.matchup_id
      if (!matchupMap.has(matchupId)) {
        matchupMap.set(matchupId, [])
      }
      matchupMap.get(matchupId)!.push(matchup)
    })

    matchupMap.forEach((matchupTeams, matchupId) => {
      if (matchupTeams.length !== 2) return
      const [team1, team2] = matchupTeams

      const team1Owner = validUsers.find(
        (u) => validRosters.find((r) => r.roster_id === team1.roster_id)?.owner_id === u.user_id
      )
      const team2Owner = validUsers.find(
        (u) => validRosters.find((r) => r.roster_id === team2.roster_id)?.owner_id === u.user_id
      )

      matchupData.push({
        rosterId: team1.roster_id,
        teamName:
          team1Owner?.metadata?.team_name || team1Owner?.display_name || `Team ${team1.roster_id}`,
        projectedPoints: team1.points || 0,
        actualPoints: team1.points || 0,
        opponentRosterId: team2.roster_id,
        opponentTeamName:
          team2Owner?.metadata?.team_name || team2Owner?.display_name || `Team ${team2.roster_id}`,
        opponentProjectedPoints: team2.points || 0,
        opponentActualPoints: team2.points || 0,
        isHome: false,
        matchupId,
        starters: team1.starters || [],
        players: team1.players || [],
        startersPoints: team1.starters_points || [],
        playersPoints: team1.players_points || {},
        opponentAvatar: team2Owner?.avatar,
        opponentUsername: team2Owner?.display_name || team2Owner?.metadata?.team_name,
        opponentDisplayName: team2Owner?.display_name,
      })
    })
  }

  const nflGamesMap: Record<string, { opponent: string; isHome: boolean }> = {}
  if (Array.isArray(nflScheduleData) && nflScheduleData.length > 0) {
    nflScheduleData.forEach((game: any) => {
      if (game.home_team && game.away_team) {
        nflGamesMap[game.home_team] = { opponent: game.away_team, isHome: true }
        nflGamesMap[game.away_team] = { opponent: game.home_team, isHome: false }
      }
    })
  }

  const teamsData = rosters
    .map((roster) => {
      if (!roster?.roster_id) return null

      const owner = roster.owner_id ? validUsers.find((u) => u?.user_id === roster.owner_id) : null
      const teamName =
        owner?.metadata?.team_name ||
        owner?.display_name ||
        owner?.first_name ||
        `Team ${roster.roster_id}`

      const players = (roster.players || [])
        .map((playerId) => {
          const player = enhancedPlayers[playerId]
          if (!player) return null

          const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim()
          const ranking = rankingsMap[playerId]
          const tempPlayerForOpponent: PlayerData = {
            playerId,
            playerName,
            fantasyPositions: allPlayersData[playerId]?.fantasy_positions,
            position: player.position,
            team: player.team,
            rank: 999,
            tier: '',
            age: 0,
            experience: 0,
            status: 'Active',
          }
          const opponentInfo = getOpponentInfo(tempPlayerForOpponent, nflGamesMap)

          return {
            playerId,
            playerName,
            fantasyPositions: allPlayersData[playerId]?.fantasy_positions,
            position: player.position,
            team: player.team,
            rank: ranking?.rank || player.search_rank || 999,
            tier: ranking ? `${ranking.name} (Tier ${ranking.number})` : 'Unranked',
            tierNumber: ranking?.number ?? null,
            tierEmphasis: ranking?.emphasis ?? null,
            tierScore: ranking?.score ?? null,
            tierRank: ranking?.rank ?? null,
            tierPositionRank: ranking?.positionRank ?? null,
            ktcDelta30: ranking?.delta30 ?? null,
            age: player.age || 0,
            experience: player.years_exp || 0,
            isRookie: player.years_exp === 0,
            status: player.status || 'Active',
            injury_status: player.injury_status || null,
            injury_start_date: player.injury_start_date || null,
            isOnBye: opponentInfo.opponentTeam === 'BYE' || opponentInfo.opponentTeam === 'TBD',
            espn_id: player.espn_id,
            headshot_url: player.headshot_url,
            fantasy_points_ppr: player.fantasy_points_ppr || 0,
            fantasy_points_half_ppr: player.fantasy_points_half_ppr,
            fantasy_points: player.fantasy_points_ppr || 0,
            games_played: player.games_played || 0,
            fantasy_ppg: player.stats_season ? player.fantasy_ppg : undefined,
            fppg_rank: player.fppg_rank,
            fppg_position: player.fppg_position,
            stats_season: player.stats_season,
            career_ppg: player.career_ppg ?? undefined,
            career_games: player.career_games,
            career_from: player.career_from ?? undefined,
            rankingData: ranking
              ? {
                  rank: ranking.rank,
                  position: player.position,
                  team: player.team,
                  name: playerName,
                  tier: ranking.number,
                }
              : undefined,
          }
        })
        .filter(Boolean) as PlayerData[]

      return {
        rosterId: roster.roster_id,
        teamName,
        ownerName: owner?.display_name || 'Unknown',
        ownerAvatar: owner?.avatar || undefined,
        ownerUsername: owner?.display_name || 'Unknown',
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        ties: roster.settings?.ties || 0,
        pointsFor: sleeperPoints(roster.settings?.fpts, roster.settings?.fpts_decimal),
        pointsAgainst: sleeperPoints(
          roster.settings?.fpts_against,
          roster.settings?.fpts_against_decimal
        ),
        rank: roster.rank || 0,
        grade: '',
        gradeScore: 0,
        players,
        starters: roster.starters || [],
        positionStrengths: calculatePositionStrengths(players, leagueContext),
        waiverPosition: roster.settings?.waiver_position || 0,
        totalMoves: roster.settings?.total_moves || 0,
        recentForm: calculateRecentForm(roster, matchups),
      }
    })
    .filter(Boolean) as TeamData[]

  let leagueTransactions: SleeperTransaction[] = []
  try {
    const allTx: SleeperTransaction[] = txResults
      .flat()
      .filter((tx: SleeperTransaction) => tx.status === 'complete')

    teamsData.forEach((team) => {
      team.transactions = allTx.filter((tx) => tx.roster_ids.includes(team.rosterId))
    })

    leagueTransactions = [...allTx].sort((a, b) => b.created - a.created)
  } catch {
    // Non-fatal
  }

  const pointsOf = (roster: SleeperRoster | null) =>
    sleeperPoints(roster?.settings?.fpts, roster?.settings?.fpts_decimal)
  const totalPoints = validRosters.reduce((sum, roster) => sum + pointsOf(roster), 0)
  const avgPoints = validRosters.length > 0 ? totalPoints / validRosters.length : 0
  const highestScoring = validRosters.reduce(
    (highest: SleeperRoster | null, roster) =>
      pointsOf(roster) > pointsOf(highest) ? roster : highest,
    null
  )
  const lowestScoring = validRosters.reduce(
    (lowest: SleeperRoster | null, roster) =>
      lowest === null || pointsOf(roster) < pointsOf(lowest) ? roster : lowest,
    null
  )

  const highestOwner = highestScoring
    ? validUsers.find((u) => u.user_id === highestScoring.owner_id)
    : null
  const lowestOwner = lowestScoring
    ? validUsers.find((u) => u.user_id === lowestScoring.owner_id)
    : null

  const userId = getUserId(user)
  const userRoster = userId ? validRosters.find((r) => r.owner_id === userId) : null

  return {
    // Graded with the same team score the dashboard uses once KTC values arrive.
    teams: withTeamScores(teamsData, leagueContext),
    leagueOverview: {
      isDynasty: league?.settings?.type === 2,
      totalTeams: rosters.length,
      currentWeek: week,
      seasonType: nflState.season_type || 'regular',
      averagePointsPerTeam: Math.round(avgPoints),
      highestScoringTeam:
        highestOwner?.metadata?.team_name ||
        highestOwner?.display_name ||
        highestOwner?.first_name ||
        `Team ${highestScoring?.roster_id || 'Unknown'}`,
      lowestScoringTeam:
        lowestOwner?.metadata?.team_name ||
        lowestOwner?.display_name ||
        lowestOwner?.first_name ||
        `Team ${lowestScoring?.roster_id || 'Unknown'}`,
      trendingPlayers,
      rosterPositions: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        SUPER_FLEX: 1,
        ...countRosterPositions(league?.roster_positions),
      },
    },
    currentMatchups: matchupData,
    currentWeek: week,
    nflGames: nflGamesMap,
    allPlayers: enhancedPlayers,
    playerRankings: rankingsMap,
    defaultSelectedRosterId: userRoster?.roster_id || teamsData[0]?.rosterId || null,
    rosterPositionsRaw: Array.isArray(league?.roster_positions) ? league.roster_positions : [],
    leagueContext,
    leagueTransactions,
  }
}

export type KtcMaps = {
  history: Record<string, KtcHistoryPoint[]>
  latest: Record<string, { value_sf: number; value_1qb: number }>
}

/** KTC history is the heaviest payload, so it loads after first paint and chunks run in parallel. */
export async function fetchKtcMaps(names: string[], version: number): Promise<KtcMaps> {
  const chunkSize = 50
  const chunks: string[][] = []
  for (let i = 0; i < names.length; i += chunkSize) chunks.push(names.slice(i, i + chunkSize))
  const history: KtcMaps['history'] = {}
  const latest: KtcMaps['latest'] = {}
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const resp = await fetch(
          `/api/ktc-values?names=${encodeURIComponent(chunk.join(','))}&_v=${version}`
        )
        if (!resp.ok) return
        const json = await resp.json()
        if (json.historyMap) Object.assign(history, json.historyMap)
        if (Array.isArray(json.data)) {
          json.data.forEach((row: { player_name: string; value_sf: number; value_1qb: number }) => {
            latest[row.player_name] = { value_sf: row.value_sf, value_1qb: row.value_1qb }
          })
        }
      } catch {
        // Non-fatal
      }
    })
  )
  return { history, latest }
}

export function applyKtc(teams: TeamData[], maps: KtcMaps): TeamData[] {
  return teams.map((team) => ({
    ...team,
    players: team.players.map((player) => {
      const hist = maps.history[player.playerName]
      const latest = maps.latest[player.playerName]
      return {
        ...player,
        ktcHistory: hist ?? undefined,
        ktcValueSf: latest?.value_sf ?? undefined,
        ktcValue1qb: latest?.value_1qb ?? undefined,
        ktcTrendDelta:
          hist && hist.length >= 2 ? hist[hist.length - 1].value_sf - hist[0].value_sf : undefined,
      }
    }),
  }))
}

/** Re-score every team once its values are known, so the grade reflects quality, not roster size. */
export function withTeamScores(teams: TeamData[], ctx: LeagueContext): TeamData[] {
  const scores = teamScores(teams, ctx)
  const all = teams.map((t) => scores.get(t.rosterId)?.composite ?? 0)
  return teams.map((team) => {
    const gradeScore = scores.get(team.rosterId)?.composite ?? 0
    return { ...team, gradeScore, grade: calculateGradeFromPercentile(gradeScore, all).letter }
  })
}

/** Core-position player names to look up in KTC, deduped and sorted (part of the SWR key). */
export function ktcNamesFor(teams: TeamData[]): string[] {
  return Array.from(
    new Set(
      teams.flatMap((team) =>
        team.players
          .filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
          .map((p) => p.playerName)
      )
    )
  )
    .filter(Boolean)
    .sort()
}

/** Until the league loads, the format of Sleeper's default lineup (no teams are valued yet). */
const DEFAULT_LEAGUE_CONTEXT = resolveLeagueContext(null)

export function useLeagueData(leagueId: string, user?: unknown): UseLeagueDataReturn {
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null)

  const version = useCacheVersion()
  const { data, error, isLoading, mutate } = useSWR(
    leagueId ? ['league-buddy-v2-season-stats', leagueId, getUserId(user) ?? 'anon'] : null,
    ([, id]) => fetchLeagueDataBundle(id as string, user, getCacheVersion()),
    { revalidateOnFocus: true, focusThrottleInterval: 300_000, refreshInterval: 900_000 }
  )

  const ktcNames = useMemo(() => ktcNamesFor(data?.teams ?? []), [data?.teams])
  const { data: ktcMaps, error: ktcError } = useSWR(
    ktcNames.length > 0 ? ['league-buddy-ktc', leagueId, version, ktcNames.join('|')] : null,
    () => fetchKtcMaps(ktcNames, version),
    { revalidateOnFocus: false, dedupingInterval: 300_000, keepPreviousData: true }
  )

  const leagueContext = data?.leagueContext ?? DEFAULT_LEAGUE_CONTEXT
  const teams = useMemo(
    () =>
      data?.teams
        ? withTeamScores(ktcMaps ? applyKtc(data.teams, ktcMaps) : data.teams, leagueContext)
        : [],
    [data?.teams, ktcMaps, leagueContext]
  )
  const leagueOverview = data?.leagueOverview ?? null
  const currentMatchups = data?.currentMatchups ?? []
  const currentWeek = data?.currentWeek ?? 1
  const nflGames = data?.nflGames ?? {}
  const allPlayers = data?.allPlayers ?? {}
  const playerRankings = data?.playerRankings ?? {}
  const rosterPositionsRaw = data?.rosterPositionsRaw ?? []
  const leagueTransactions = data?.leagueTransactions ?? []

  const selectedTeam = useMemo(() => {
    if (teams.length === 0) return null
    if (selectedRosterId !== null) {
      return teams.find((team) => team.rosterId === selectedRosterId) ?? null
    }
    const fallbackRosterId = data?.defaultSelectedRosterId
    return teams.find((team) => team.rosterId === fallbackRosterId) ?? teams[0] ?? null
  }, [teams, selectedRosterId, data?.defaultSelectedRosterId])

  const setSelectedTeam = useCallback((team: TeamData | null) => {
    setSelectedRosterId(team?.rosterId ?? null)
  }, [])

  const refetch = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    teams,
    loading: isLoading,
    valuesReady: !!data && (ktcNames.length === 0 || !!ktcMaps || !!ktcError),
    error: error instanceof Error ? error.message : null,
    selectedTeam,
    setSelectedTeam,
    leagueOverview,
    currentMatchups,
    currentWeek,
    nflGames,
    allPlayers,
    playerRankings,
    rosterPositionsRaw,
    leagueContext,
    leagueTransactions,
    refetch,
  }
}
