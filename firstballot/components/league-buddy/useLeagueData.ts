import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { leagueCache } from '@/lib/league-cache'
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
  getTierFromRank,
  calculateRawScore,
  calculateGradeFromPercentile,
  calculateTeamTrends,
  calculatePositionStrengths,
  calculateRecentForm,
  getOpponentInfo,
  countRosterPositions,
} from './utils'

interface UseLeagueDataReturn {
  teams: TeamData[]
  loading: boolean
  error: string | null
  selectedTeam: TeamData | null
  setSelectedTeam: (team: TeamData | null) => void
  leagueOverview: LeagueOverview | null
  currentMatchups: MatchupData[]
  currentWeek: number
  nflSchedule: any[]
  nflGames: Record<string, { opponent: string; isHome: boolean }>
  allPlayers: Record<string, any>
  playerRankings: Record<string, any>
  rosterPositionsRaw: string[]
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
    fpts?: number
    fpts_against?: number
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

interface RankingPlayer {
  'PLAYER NAME'?: string
  RK?: number
  POS?: string
  TEAM?: string
  [key: string]: unknown
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
  nflSchedule: any[]
  nflGames: Record<string, { opponent: string; isHome: boolean }>
  allPlayers: Record<string, any>
  playerRankings: Record<string, any>
  defaultSelectedRosterId: number | null
  rosterPositionsRaw: string[]
  leagueTransactions: SleeperTransaction[]
}

function getUserId(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') return undefined
  const maybeUserId = (user as { user_id?: unknown }).user_id
  return typeof maybeUserId === 'string' ? maybeUserId : undefined
}

function getFallbackNflSchedule(week: number) {
  const nflSchedule2024: Record<number, Record<string, { opponent: string; isHome: boolean }>> = {
    1: {
      BAL: { opponent: 'KC', isHome: true },
      BUF: { opponent: 'ARI', isHome: true },
      CIN: { opponent: 'NE', isHome: true },
      CLE: { opponent: 'DAL', isHome: true },
      DEN: { opponent: 'SEA', isHome: true },
      HOU: { opponent: 'IND', isHome: true },
      IND: { opponent: 'HOU', isHome: false },
      JAX: { opponent: 'MIA', isHome: true },
      KC: { opponent: 'BAL', isHome: false },
      LV: { opponent: 'LAC', isHome: true },
      LAC: { opponent: 'LV', isHome: false },
      MIA: { opponent: 'JAX', isHome: false },
      NE: { opponent: 'CIN', isHome: false },
      NYJ: { opponent: 'SF', isHome: true },
      PIT: { opponent: 'ATL', isHome: true },
      TEN: { opponent: 'CHI', isHome: true },
      ARI: { opponent: 'BUF', isHome: false },
      ATL: { opponent: 'PIT', isHome: false },
      CAR: { opponent: 'NO', isHome: true },
      CHI: { opponent: 'TEN', isHome: false },
      DAL: { opponent: 'CLE', isHome: false },
      DET: { opponent: 'LAR', isHome: true },
      GB: { opponent: 'MIN', isHome: true },
      LAR: { opponent: 'DET', isHome: false },
      MIN: { opponent: 'GB', isHome: false },
      NO: { opponent: 'CAR', isHome: false },
      NYG: { opponent: 'WAS', isHome: true },
      PHI: { opponent: 'TB', isHome: true },
      SF: { opponent: 'NYJ', isHome: false },
      SEA: { opponent: 'DEN', isHome: false },
      TB: { opponent: 'PHI', isHome: false },
      WAS: { opponent: 'NYG', isHome: false },
    },
  }
  return nflSchedule2024[week] || {}
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

async function fetchLeagueDataBundle(leagueId: string, user?: unknown): Promise<LeagueDataBundle> {
  leagueCache.setLeagueId(leagueId)

  interface NflState {
    week?: number
    display_week?: number
    season_type?: string
  }

  const nflState = (await fetch('https://api.sleeper.app/v1/state/nfl', {
    cache: 'no-store',
  }).then((r) => r.json())) as NflState
  const week = nflState?.week || nflState?.display_week || 1

  const [rosters, users, allPlayersData, league, matchups, rankingsResult, nflScheduleData] =
    (await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, {
        cache: 'no-store',
      }).then((r) => r.json()),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then((r) =>
        r.json()
      ),
      sleeperApi.getAllPlayers(),
      sleeperApi.getLeagueInfo(leagueId),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, {
        cache: 'no-store',
      })
        .then(async (r) => {
          if (!r.ok) return []
          return r.json()
        })
        .catch(() => []),
      fetch('/api/rankings')
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetchWeekSchedule(week),
    ])) as [SleeperRoster[], SleeperUser[], Record<string, any>, any, SleeperMatchup[], any, any[]]

  if (!rosters || !users || !allPlayersData || !league) {
    throw new Error('Invalid data received from API')
  }

  const validUsers = users.filter((u) => u && u.user_id)
  const validRosters = rosters.filter((r) => r && r.roster_id)
  const allSleeperPlayerIds = Array.from(new Set(rosters.flatMap((r) => r.players || [])))

      const rosterStatsMap: Record<
        string,
        {
          fantasy_ppg: number
          total_fantasy_points: number
          games_played: number
          headshot_url?: string | null
        }
      > = {}

      if (allSleeperPlayerIds.length > 0) {
        try {
      const response = await fetch(`/api/roster-stats?player_ids=${allSleeperPlayerIds.join(',')}`, {
            cache: 'no-store',
          })

          if (response.ok) {
            const result = await response.json()
            result.data.forEach(
              (playerStats: {
                sleeper_player_id: string
                fantasy_ppg: number | string
                total_fantasy_points: number | string
                games_played: number
                headshot_url?: string | null
              }) => {
                rosterStatsMap[playerStats.sleeper_player_id] = {
                  fantasy_ppg: parseFloat(String(playerStats.fantasy_ppg)) || 0,
                  total_fantasy_points: parseFloat(String(playerStats.total_fantasy_points)) || 0,
                  games_played: playerStats.games_played || 0,
                  headshot_url: playerStats.headshot_url || null,
                }
              }
            )
      }
    } catch {
      // Non-fatal
    }
  }

  const rankingsArray: RankingPlayer[] = Array.isArray(rankingsResult?.data)
    ? rankingsResult.data
    : Array.isArray(rankingsResult)
      ? rankingsResult
      : []

  const rankingsMap = rankingsArray.reduce((acc: Record<string, any>, player) => {
          const playerName = player['PLAYER NAME']
          const rank = player.RK
          if (playerName && rank !== undefined) {
            acc[playerName] = {
        rank,
              position: player.POS || '',
              team: player.TEAM || '',
              name: playerName,
              tier: rank <= 12 ? 1 : rank <= 36 ? 2 : rank <= 72 ? 3 : rank <= 120 ? 4 : 5,
            }
          }
          return acc
        }, {})

      const enhancedPlayers = { ...allPlayersData }
      Object.entries(rosterStatsMap).forEach(([sleeperId, stats]) => {
    if (!enhancedPlayers[sleeperId]) return
          enhancedPlayers[sleeperId] = {
      ...enhancedPlayers[sleeperId],
            fantasy_ppg: stats.fantasy_ppg,
            fantasy_points_ppr: stats.total_fantasy_points,
            games_played: stats.games_played,
            headshot_url: stats.headshot_url,
        }
      })

      const trending = await sleeperApi.getTrendingPlayers().catch(() => [])
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
        teamName: team1Owner?.metadata?.team_name || team1Owner?.display_name || `Team ${team1.roster_id}`,
              projectedPoints: team1.points || 0,
              actualPoints: team1.points || 0,
              opponentRosterId: team2.roster_id,
        opponentTeamName: team2Owner?.metadata?.team_name || team2Owner?.display_name || `Team ${team2.roster_id}`,
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

  const nflGamesMap: Record<string, { opponent: string; isHome: boolean }> = {
    ...getFallbackNflSchedule(week),
  }
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
            const ranking = rankingsMap[playerName]
            const tempPlayerForOpponent: PlayerData = {
              playerId,
              playerName,
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
              position: player.position,
              team: player.team,
              rank: ranking?.rank || player.search_rank || 999,
              tier: ranking?.tier ? `Tier ${ranking.tier}` : getTierFromRank(player.search_rank),
              age: player.age || 0,
              experience: player.years_exp || 0,
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
            fantasy_ppg: player.fantasy_ppg || 0,
              rankingData: ranking,
            }
          })
          .filter(Boolean) as PlayerData[]

        const rawScore = calculateRawScore(players)
      const currentMatchup = matchups?.find((m) => m.roster_id === roster.roster_id)

        return {
          rosterId: roster.roster_id,
          teamName,
          ownerName: owner?.display_name || 'Unknown',
          ownerAvatar: owner?.avatar || undefined,
          ownerUsername: owner?.display_name || 'Unknown',
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          pointsFor: roster.settings?.fpts || 0,
          pointsAgainst: roster.settings?.fpts_against || 0,
          rank: roster.rank || 0,
          grade: '',
          gradeScore: rawScore,
          players,
          starters: roster.starters || [],
        trends: calculateTeamTrends(players),
        positionStrengths: calculatePositionStrengths(players),
        currentWeekProjection: currentMatchup?.points || 0,
          waiverPosition: roster.settings?.waiver_position || 0,
          totalMoves: roster.settings?.total_moves || 0,
        recentForm: calculateRecentForm(roster, matchups),
      }
    })
    .filter(Boolean) as TeamData[]

  const allScores = teamsData.map((team) => team.gradeScore)
  teamsData.forEach((team) => {
    team.grade = calculateGradeFromPercentile(team.gradeScore, allScores).letter
  })

      try {
        const allPlayerNames = Array.from(
          new Set(
        teamsData.flatMap((team) =>
              team.players
                .filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
                .map((p) => p.playerName)
            )
          )
        ).filter(Boolean)

        if (allPlayerNames.length > 0) {
          const chunkSize = 50
          const ktcHistoryMap: Record<string, KtcHistoryPoint[]> = {}
          const ktcLatestMap: Record<string, { value_sf: number; value_1qb: number }> = {}

          for (let i = 0; i < allPlayerNames.length; i += chunkSize) {
            const chunk = allPlayerNames.slice(i, i + chunkSize)
            try {
              const resp = await fetch(`/api/ktc-values?names=${encodeURIComponent(chunk.join(','))}`)
          if (!resp.ok) continue
                const json = await resp.json()
                if (json.historyMap) {
                  Object.entries(json.historyMap as Record<string, KtcHistoryPoint[]>).forEach(
                    ([name, hist]) => {
                      ktcHistoryMap[name] = hist
                    }
                  )
                }
                if (Array.isArray(json.data)) {
                  json.data.forEach((row: { player_name: string; value_sf: number; value_1qb: number }) => {
                    ktcLatestMap[row.player_name] = {
                      value_sf: row.value_sf,
                      value_1qb: row.value_1qb,
                    }
                  })
              }
            } catch {
          // Non-fatal
            }
          }

      teamsData.forEach((team) => {
            team.players = team.players.map((player) => {
              const hist = ktcHistoryMap[player.playerName]
              const latest = ktcLatestMap[player.playerName]
              const delta =
            hist && hist.length >= 2 ? hist[hist.length - 1].value_sf - hist[0].value_sf : undefined

              return {
                ...player,
                ktcHistory: hist ?? undefined,
                ktcValueSf: latest?.value_sf ?? undefined,
                ktcValue1qb: latest?.value_1qb ?? undefined,
                ktcTrendDelta: delta,
              }
            })
          })
        }
      } catch {
    // Non-fatal
      }

      let leagueTransactions: SleeperTransaction[] = []
      try {
    const weekNums = Array.from({ length: week }, (_, i) => i + 1)
        const txResults = await Promise.all(
          weekNums.map((w) =>
            fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${w}`, {
              cache: 'no-store',
            })
          .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
          )
        )
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

  const totalPoints = validRosters.reduce((sum, roster) => sum + (roster.settings?.fpts || 0), 0)
  const avgPoints = validRosters.length > 0 ? totalPoints / validRosters.length : 0
  const highestScoring = validRosters.reduce(
    (highest: SleeperRoster | null, roster) =>
      (roster.settings?.fpts || 0) > (highest?.settings?.fpts || 0) ? roster : highest,
    null
  )
  const lowestScoring = validRosters.reduce(
    (lowest: SleeperRoster | null, roster) =>
      lowest === null || (roster.settings?.fpts || 0) < (lowest.settings?.fpts || 0) ? roster : lowest,
    null
  )

  const highestOwner = highestScoring
    ? validUsers.find((u) => u.user_id === highestScoring.owner_id)
    : null
  const lowestOwner = lowestScoring
    ? validUsers.find((u) => u.user_id === lowestScoring.owner_id)
    : null

  const userId = getUserId(user)
  const userRoster = userId
    ? validRosters.find((r) => r.owner_id === userId)
    : null

  return {
    teams: teamsData,
    leagueOverview: {
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
    nflSchedule: nflScheduleData,
    nflGames: nflGamesMap,
    allPlayers: enhancedPlayers,
    playerRankings: rankingsMap,
    defaultSelectedRosterId: userRoster?.roster_id || teamsData[0]?.rosterId || null,
    rosterPositionsRaw: Array.isArray(league?.roster_positions) ? league.roster_positions : [],
    leagueTransactions,
  }
}

export function useLeagueData(leagueId: string, user?: unknown): UseLeagueDataReturn {
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null)

  const { data, error, isLoading, mutate } = useSWR(
    leagueId ? ['league-buddy', leagueId, getUserId(user) ?? 'anon'] : null,
    ([, id]) => fetchLeagueDataBundle(id as string, user),
    { revalidateOnFocus: false }
  )

  const teams = data?.teams ?? []
  const leagueOverview = data?.leagueOverview ?? null
  const currentMatchups = data?.currentMatchups ?? []
  const currentWeek = data?.currentWeek ?? 1
  const nflSchedule = data?.nflSchedule ?? []
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
    error: error instanceof Error ? error.message : null,
    selectedTeam,
    setSelectedTeam,
    leagueOverview,
    currentMatchups,
    currentWeek,
    nflSchedule,
    nflGames,
    allPlayers,
    playerRankings,
    rosterPositionsRaw,
    leagueTransactions,
    refetch,
  }
}
