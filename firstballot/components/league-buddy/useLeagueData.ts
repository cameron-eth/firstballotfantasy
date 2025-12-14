import { useState, useEffect, useCallback } from 'react'
import { leagueCache } from '@/lib/league-cache'
import { sleeperApi } from '@/lib/nextjs-cache'
import type {
  TeamData,
  PlayerData,
  MatchupData,
  SleeperMatchup,
  LeagueOverview,
  TrendingPlayer,
} from './types'
import {
  getTierFromRank,
  calculateRawScore,
  calculateGradeFromPercentile,
  calculateTeamTrends,
  calculatePositionStrengths,
  calculateRecentForm,
  getOpponentInfo,
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
  refetch: () => Promise<void>
}

export function useLeagueData(leagueId: string, user?: any): UseLeagueDataReturn {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [leagueOverview, setLeagueOverview] = useState<LeagueOverview | null>(null)
  const [currentMatchups, setCurrentMatchups] = useState<MatchupData[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [nflSchedule, setNflSchedule] = useState<any[]>([])
  const [nflGames, setNflGames] = useState<Record<string, { opponent: string; isHome: boolean }>>(
    {}
  )
  const [allPlayers, setAllPlayers] = useState<Record<string, any>>({})
  const [playerRankings, setPlayerRankings] = useState<Record<string, any>>({})

  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      setError(null)

      leagueCache.setLeagueId(leagueId)

      interface NflState {
        week?: number
        display_week?: number
        season?: number
        season_type?: string
      }
      const nflState = (await fetch('https://api.sleeper.app/v1/state/nfl', {
        cache: 'no-store',
      }).then((r) => r.json())) as NflState
      const week = nflState?.week || nflState?.display_week
      if (week !== undefined) {
        setCurrentWeek(week)
      }

      const [rosters, users, allPlayersData, league, matchups, rankingsResponse, nflScheduleData] =
        (await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, {
            cache: 'no-store',
          }).then((r) => r.json()),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then(
            (r) => r.json()
          ),
          // Fetch ALL players from Sleeper API - this includes injury_status and injury_start_date for all NFL players
          sleeperApi.getAllPlayers(),
          sleeperApi.getLeagueInfo(leagueId),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, {
            cache: 'no-store',
          })
            .then(async (r) => {
              if (!r.ok) {
                console.error(`Matchups API returned ${r.status}: ${r.statusText}`)
                return []
              }
              const data = await r.json()
              return data
            })
            .catch((err) => {
              console.error(`Failed to fetch matchups for league ${leagueId}, week ${week}:`, err)
              return []
            }),
          fetch('/api/rankings')
            .then((res) => (res.ok ? res.json() : []))
            .catch(() => []),
          // Fetch NFL schedule for current week using ESPN API
          (async () => {
            try {
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
                        if (competition && competition.competitors) {
                          const homeTeam = competition.competitors.find(
                            (c: any) => c.homeAway === 'home'
                          )
                          const awayTeam = competition.competitors.find(
                            (c: any) => c.homeAway === 'away'
                          )
                          if (homeTeam && awayTeam) {
                            return {
                              home_team: homeTeam.team?.abbreviation,
                              away_team: awayTeam.team?.abbreviation,
                            }
                          }
                        }
                        return null
                      })
                      .filter(Boolean)
                  }
                } catch {
                  continue
                }
              }
              return []
            } catch {
              return []
            }
          })(),
        ])) as [any[], any[], Record<string, any>, any, any[], any[], any[]]

      interface SleeperRoster {
        players?: string[]
        roster_id?: number
        owner_id?: string
        settings?: {
          wins?: number
          losses?: number
          fpts?: number
          fpts_against?: number
        }
      }
      const allSleeperPlayerIds = Array.from(
        new Set(rosters.flatMap((r: SleeperRoster) => r.players || []))
      )

      setNflSchedule(nflScheduleData)

      const rosterStatsMap: Record<
        string,
        { fantasy_ppg: number; total_fantasy_points: number; games_played: number; headshot_url?: string | null }
      > = {}

      if (allSleeperPlayerIds.length > 0) {
        try {
          const playerIdsParam = allSleeperPlayerIds.join(',')
          const response = await fetch(`/api/roster-stats?player_ids=${playerIdsParam}`, {
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
              }) => {
                rosterStatsMap[playerStats.sleeper_player_id] = {
                  fantasy_ppg: parseFloat(String(playerStats.fantasy_ppg)) || 0,
                  total_fantasy_points: parseFloat(String(playerStats.total_fantasy_points)) || 0,
                  games_played: playerStats.games_played || 0,
                  headshot_url: playerStats.headshot_url || null,
                }
              }
            )
          } else {
            console.error('Failed to fetch roster stats:', response.statusText)
          }
        } catch (err) {
          console.error('Failed to fetch roster stats:', err)
        }
      }

      if (!rosters || !users || !allPlayersData || !league) {
        throw new Error('Invalid data received from API')
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
      const validUsers = users.filter((u: SleeperUser) => u && u.user_id)
      const validRosters = rosters.filter((r: SleeperRoster) => r && r.roster_id)

      let rankingsMap: Record<string, any> = {}
      if (rankingsResponse && rankingsResponse.length > 0) {
        interface RankingPlayer {
          'PLAYER NAME'?: string
          RK?: number
          TIER?: number
          POS?: string
          TEAM?: string
          [key: string]: any
        }
        rankingsMap = rankingsResponse.reduce((acc: Record<string, any>, player: RankingPlayer) => {
          const playerName = player['PLAYER NAME']
          const rank = player.RK
          if (playerName && rank !== undefined) {
            acc[playerName] = {
              rank: rank,
              position: player.POS || '',
              team: player.TEAM || '',
              name: playerName,
              tier: rank <= 12 ? 1 : rank <= 36 ? 2 : rank <= 72 ? 3 : rank <= 120 ? 4 : 5,
            }
          }
          return acc
        }, {})
      }
      setPlayerRankings(rankingsMap)

      // Create enhanced players object - preserve all fields from allPlayersData including injury info
      // allPlayersData comes from sleeperApi.getAllPlayers() which includes injury_status and injury_start_date for ALL NFL players
      // This is a Record<playerId, SleeperPlayer> where each player has injury_status and injury_start_date fields
      const enhancedPlayers = { ...allPlayersData }

      let mergedCount = 0
      Object.entries(rosterStatsMap).forEach(([sleeperId, stats]) => {
        if (enhancedPlayers[sleeperId]) {
          // Merge stats while preserving all original player data (including injury_status, injury_start_date)
          // The spread operator preserves all existing fields, we're just adding/overwriting stats
          enhancedPlayers[sleeperId] = {
            ...enhancedPlayers[sleeperId], // This preserves injury_status, injury_start_date, and all other fields
            fantasy_ppg: stats.fantasy_ppg,
            fantasy_points_ppr: stats.total_fantasy_points,
            games_played: stats.games_played,
            headshot_url: stats.headshot_url,
          }
          if (stats.fantasy_ppg > 0) mergedCount++
        }
      })

      setAllPlayers(enhancedPlayers)

      const trending = await sleeperApi.getTrendingPlayers().catch(() => [])
      interface TrendingItem {
        player_id: string
        count: number
      }
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
        matchups.forEach((matchup: SleeperMatchup) => {
          const matchupId = matchup.matchup_id
          if (!matchupMap.has(matchupId)) {
            matchupMap.set(matchupId, [])
          }
          matchupMap.get(matchupId)!.push(matchup)
        })

        matchupMap.forEach((teams, matchupId) => {
          if (teams.length === 2) {
            const [team1, team2] = teams

            const team1Owner = validUsers.find(
              (u: any) =>
                validRosters.find((r: any) => r.roster_id === team1.roster_id)?.owner_id ===
                u.user_id
            )
            const team2Owner = validUsers.find(
              (u: any) =>
                validRosters.find((r: any) => r.roster_id === team2.roster_id)?.owner_id ===
                u.user_id
            )

            const team1Name =
              team1Owner?.metadata?.team_name ||
              team1Owner?.display_name ||
              `Team ${team1.roster_id}`
            const team2Name =
              team2Owner?.metadata?.team_name ||
              team2Owner?.display_name ||
              `Team ${team2.roster_id}`

            matchupData.push({
              rosterId: team1.roster_id,
              teamName: team1Name,
              projectedPoints: team1.points || 0,
              actualPoints: team1.points || 0,
              opponentRosterId: team2.roster_id,
              opponentTeamName: team2Name,
              opponentProjectedPoints: team2.points || 0,
              opponentActualPoints: team2.points || 0,
              isHome: false,
              matchupId: matchupId,
              starters: team1.starters || [],
              players: team1.players || [],
              startersPoints: team1.starters_points || [],
              playersPoints: team1.players_points || {},
              opponentAvatar: team2Owner?.avatar,
              opponentUsername: team2Owner?.display_name || team2Owner?.metadata?.team_name,
              opponentDisplayName: team2Owner?.display_name,
            })
          }
        })
      } else {
        console.warn(`⚠️ No matchup data found for week ${week}`)
      }

      const totalPoints = validRosters.reduce(
        (sum: number, roster: any) => sum + (roster.settings?.fpts || 0),
        0
      )
      const avgPoints = totalPoints / validRosters.length
      const highestScoring = validRosters.reduce(
        (highest: SleeperRoster | null, roster: SleeperRoster) =>
          (roster.settings?.fpts || 0) > (highest?.settings?.fpts || 0) ? roster : highest,
        null as SleeperRoster | null
      )
      const lowestScoring = validRosters.reduce(
        (lowest: SleeperRoster, roster: SleeperRoster) =>
          (roster.settings?.fpts || 0) < (lowest.settings?.fpts || 0) ? roster : lowest,
        validRosters[0]
      )

      const highestOwner = highestScoring
        ? validUsers.find((u: SleeperUser) => u.user_id === highestScoring.owner_id)
        : null
      const lowestOwner = lowestScoring
        ? validUsers.find((u: SleeperUser) => u.user_id === lowestScoring.owner_id)
        : null

      setLeagueOverview({
        totalTeams: rosters.length,
        currentWeek: week || 1,
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
        rosterPositions: league?.roster_positions || {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          SUPER_FLEX: 1,
        },
      })

      setCurrentMatchups(matchupData)

      // Build nflGames map for bye week detection (must be done before processing teams)
      const nflGamesMap: Record<string, { opponent: string; isHome: boolean }> = {}

      // Always use fallback schedule for now (until we have a proper NFL schedule API)
      const fallbackSchedule = getFallbackNflSchedule(week || 1)
      Object.entries(fallbackSchedule).forEach(([team, gameInfo]) => {
        nflGamesMap[team] = gameInfo
      })

      // If we have API schedule data, merge it in (it takes precedence)
      if (nflScheduleData && Array.isArray(nflScheduleData) && nflScheduleData.length > 0) {
        nflScheduleData.forEach((game: any) => {
          if (game.home_team && game.away_team) {
            nflGamesMap[game.home_team] = { opponent: game.away_team, isHome: true }
            nflGamesMap[game.away_team] = { opponent: game.home_team, isHome: false }
          }
        })
      } else {
      }

      setNflGames(nflGamesMap)

      const teamsData: (TeamData | null)[] = rosters.map((roster: any) => {
        if (!roster || !roster.roster_id) {
          return null
        }

        const owner = roster.owner_id
          ? validUsers.find((u: SleeperUser) => u?.user_id === roster.owner_id)
          : null
        const teamName =
          owner?.metadata?.team_name ||
          owner?.display_name ||
          owner?.first_name ||
          `Team ${roster.roster_id}`

        const players = (roster.players || [])
          .map((playerId: string) => {
            const player = enhancedPlayers[playerId]
            if (!player) {
              return null
            }

            const firstName = player.first_name || ''
            const lastName = player.last_name || ''
            const playerName = `${firstName} ${lastName}`.trim()
            const ranking = rankingsMap[playerName]

            const fantasyPointsPPR = player.fantasy_points_ppr || 0
            const gamesPlayed = player.games_played || 0
            const fantasyPPG = player.fantasy_ppg || 0

            // Get injury info from Sleeper API - these fields come from allPlayersData
            // allPlayersData is fetched via sleeperApi.getAllPlayers() which includes injury_status and injury_start_date
            const injuryStatus = player.injury_status || null
            const injuryStartDate = player.injury_start_date || null

            // Check if player is on bye week - use getOpponentInfo for accurate detection
            // Create minimal player object for opponent check
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
            // Player is on bye if opponent is 'BYE' or 'TBD' (no game scheduled)
            const isOnBye =
              opponentInfo.opponentTeam === 'BYE' || opponentInfo.opponentTeam === 'TBD'

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
              injury_status: injuryStatus,
              injury_start_date: injuryStartDate,
              isOnBye,
              espn_id: player.espn_id,
              headshot_url: player.headshot_url,
              fantasy_points_ppr: fantasyPointsPPR,
              fantasy_points_half_ppr: player.fantasy_points_half_ppr,
              fantasy_points: fantasyPointsPPR,
              games_played: gamesPlayed,
              fantasy_ppg: fantasyPPG,
              rankingData: ranking,
            }
          })
          .filter(Boolean) as PlayerData[]

        const rawScore = calculateRawScore(players)
        const trends = calculateTeamTrends(players)
        const positionStrengths = calculatePositionStrengths(players)
        const recentForm = calculateRecentForm(roster, matchups)

        interface SleeperMatchup {
          roster_id?: number
          points?: number
          matchup_id?: number
        }
        const currentMatchup = matchups?.find(
          (m: SleeperMatchup) => m.roster_id === roster.roster_id
        )
        const currentWeekProjection = currentMatchup?.points || 0
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
          trends,
          positionStrengths,
          currentWeekProjection,
          waiverPosition: roster.settings?.waiver_position || 0,
          totalMoves: roster.settings?.total_moves || 0,
          recentForm,
        }
      })

      const validTeamsData = teamsData.filter(Boolean) as TeamData[]

      const allScores = validTeamsData.map((team) => team.gradeScore)
      validTeamsData.forEach((team) => {
        const gradeResult = calculateGradeFromPercentile(team.gradeScore, allScores)
        team.grade = gradeResult.letter
      })

      setTeams(validTeamsData)

      let userTeam: TeamData | null = null
      if (user?.user_id) {
        const userRoster = validRosters.find((r: any) => r.owner_id === user.user_id)
        if (userRoster) {
          userTeam = validTeamsData.find((t) => t.rosterId === userRoster.roster_id) || null
        }
      }

      const teamToSelect = userTeam || validTeamsData[0] || null
      setSelectedTeam(teamToSelect)
    } catch (err) {
      console.error('Error fetching league data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load league data')
    } finally {
      setLoading(false)
    }
  }, [leagueId, user])

  useEffect(() => {
    fetchLeagueData()
  }, [fetchLeagueData])

  const getFallbackNflSchedule = useCallback((week: number) => {
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
  }, [])

  const fetchNflScheduleInternal = useCallback(
    async (week: number) => {
      try {
        const endpoints = [
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${new Date().getFullYear()}`,
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,
        ]

        let data = null
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint)
            data = await response.json()
            if (data.events && data.events.length > 0) {
              break
            }
          } catch {
            continue
          }
        }

        if (data && data.events && data.events.length > 0) {
          const games: Record<string, { opponent: string; isHome: boolean }> = {}
          data.events.forEach((event: any) => {
            const competition = event.competitions?.[0]
            if (competition && competition.competitors) {
              const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home')
              const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away')
              if (homeTeam && awayTeam) {
                const homeAbbr = homeTeam.team?.abbreviation
                const awayAbbr = awayTeam.team?.abbreviation
                if (homeAbbr && awayAbbr) {
                  games[homeAbbr] = { opponent: awayAbbr, isHome: true }
                  games[awayAbbr] = { opponent: homeAbbr, isHome: false }
                }
              }
            }
          })
          setNflGames(games)
        } else {
          const fallbackSchedule = getFallbackNflSchedule(week)
          setNflGames(fallbackSchedule)
        }
      } catch (error) {
        console.error('Failed to fetch NFL schedule:', error)
        const fallbackSchedule = getFallbackNflSchedule(week)
        setNflGames(fallbackSchedule)
      }
    },
    [getFallbackNflSchedule]
  )

  useEffect(() => {
    if (currentWeek > 0) {
      fetchNflScheduleInternal(currentWeek)
    }
  }, [currentWeek, fetchNflScheduleInternal])

  return {
    teams,
    loading,
    error,
    selectedTeam,
    setSelectedTeam,
    leagueOverview,
    currentMatchups,
    currentWeek,
    nflSchedule,
    nflGames,
    allPlayers,
    playerRankings,
    refetch: fetchLeagueData,
  }
}
