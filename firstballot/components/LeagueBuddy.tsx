'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'

import { TeamLogo } from '@/components/team-logo'
import { UserAvatar } from '@/components/user-avatar'
import { CurrentLineup } from '@/components/league/CurrentLineup'
import { PlayerNGSStats } from '@/components/player-ngs-stats'
import {
  Users,
  Trophy,
  Zap,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Eye,
  Clipboard,
  ChevronDown,
  Star,
  Flame,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import { leagueCache } from '@/lib/league-cache'
import { sleeperApi } from '@/lib/nextjs-cache'

// Enhanced TypeScript interfaces for better type safety
interface LeagueBuddyProps {
  leagueId: string
  user?: any
  leagues?: any[]
  onLeagueChange?: (leagueId: string) => void
}

interface TeamData {
  rosterId: number
  teamName: string
  ownerName: string
  ownerAvatar?: string
  ownerUsername?: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  grade: string
  gradeScore: number
  players: PlayerData[]
  starters: string[] // Sleeper player IDs of starters from roster
  trends: TeamTrends
  positionStrengths: PositionStrengths
  currentWeekProjection?: number
  waiverPosition: number
  totalMoves: number
  recentForm: string
}

interface PlayerData {
  playerId: string
  playerName: string
  position: string
  team: string
  rank: number
  tier: string
  age: number
  experience: number
  status: string
  espn_id?: string
  fantasy_points_ppr?: number
  fantasy_points_half_ppr?: number
  fantasy_points?: number
  games_played?: number
  fantasy_ppg?: number // Fantasy points per game from NGS
  rankingData?: {
    rank: number
    position: string
    team: string
    name: string
    tier: number
  }
}

interface TeamTrends {
  recentForm: string
  winStreak: number
  avgPointsLast4: number
  bestPlayer: PlayerData
  breakoutCandidate: PlayerData
  sleeperPick: PlayerData
}

interface PositionStrengths {
  QB: number
  RB: number
  WR: number
  TE: number
  FLEX: number
  SFLX: number
}

// Raw Sleeper API matchup structure
interface SleeperMatchup {
  starters: string[]
  roster_id: number
  players: string[]
  matchup_id: number
  points: number
  custom_points: number | null
  starters_points: number[] | null
  players_points: Record<string, number> | null
}

interface MatchupData {
  rosterId: number
  teamName: string
  projectedPoints: number
  actualPoints: number
  opponentRosterId: number
  opponentTeamName: string
  opponentProjectedPoints: number
  opponentActualPoints: number
  isHome: boolean
  matchupId?: number
  starters?: string[]
  players?: string[]
  startersPoints?: number[]
  playersPoints?: Record<string, number>
  opponentAvatar?: string
  opponentUsername?: string
  opponentDisplayName?: string
}

interface LeagueOverview {
  totalTeams: number
  currentWeek: number
  seasonType: string
  averagePointsPerTeam: number
  highestScoringTeam: string
  lowestScoringTeam: string
  trendingPlayers: TrendingPlayer[]
  rosterPositions: Record<string, number>
}

interface TrendingPlayer {
  playerId: string
  playerName: string
  position: string
  team: string
  addCount: number
  dropCount: number
  netChange: number
  espn_id?: string
}

// Constants for better maintainability
const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  A: 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  B: 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  C: 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  D: 'bg-red-400/20 text-red-400 border-red-400',
  F: 'bg-red-400/20 text-red-400 border-red-400',
} as const

const POSITION_COLORS = {
  QB: 'bg-blue-500',
  RB: 'bg-green-500',
  WR: 'bg-yellow-500',
  TE: 'bg-purple-500',
  K: 'bg-pink-500',
  DEF: 'bg-gray-500',
}

// Utility functions for data validation and processing
const validateApiResponse = (response: Response, endpoint: string): boolean => {
  if (!response.ok) {
    console.error(`API Error for ${endpoint}:`, response.status, response.statusText)
    return false
  }
  return true
}

const safeJsonParse = async (response: Response): Promise<any> => {
  try {
    return await response.json()
  } catch (error) {
    console.error('JSON parsing error:', error)
    return null
  }
}

const getTierFromRank = (rank: number): string => {
  if (!rank || rank <= 0) return 'Tier 4'
  if (rank <= 12) return 'Tier 1'
  if (rank <= 24) return 'Tier 2'
  if (rank <= 48) return 'Tier 3'
  return 'Tier 4'
}

const calculateRawScore = (players: PlayerData[]): number => {
  if (!players || players.length === 0) return 0

  const tier1Count = players.filter((p) => p.tier === 'Tier 1').length
  const tier2Count = players.filter((p) => p.tier === 'Tier 2').length
  const avgRank = players.reduce((sum, p) => sum + (p.rank || 999) / players.length, 0)
  const youngPlayers = players.filter((p) => p.age && p.age <= 25).length
  const experiencedPlayers = players.filter((p) => p.experience && p.experience >= 3).length

  let score = 0
  score += tier1Count * 15
  score += tier2Count * 10
  score += Math.max(0, 100 - avgRank)
  score += youngPlayers * 2
  score += experiencedPlayers * 1

  return Math.max(0, score) // Ensure non-negative score
}

const calculateGradeFromPercentile = (
  score: number,
  allScores: number[]
): { letter: string; score: number } => {
  if (!allScores || allScores.length === 0) return { letter: 'F', score: 0 }

  const sortedScores = [...allScores].sort((a, b) => b - a)
  const scoreIndex = sortedScores.findIndex((s) => s <= score)
  const percentile =
    scoreIndex === -1 ? 100 : ((sortedScores.length - scoreIndex) / sortedScores.length) * 100

  let letter = 'C'
  if (percentile >= 90) letter = 'A+'
  else if (percentile >= 80) letter = 'A'
  else if (percentile >= 70) letter = 'A-'
  else if (percentile >= 60) letter = 'B+'
  else if (percentile >= 50) letter = 'B'
  else if (percentile >= 40) letter = 'B-'
  else if (percentile >= 30) letter = 'C+'
  else if (percentile >= 20) letter = 'C'
  else if (percentile >= 10) letter = 'C-'
  else letter = 'D'

  return { letter, score: Math.round(percentile) }
}

const calculateTeamTrends = (players: PlayerData[]): TeamTrends => {
  if (!players || players.length === 0) {
    const emptyPlayer: PlayerData = {
      playerId: '',
      playerName: 'No Players',
      position: 'N/A',
      team: 'N/A',
      rank: 999,
      tier: 'Tier 4',
      age: 0,
      experience: 0,
      status: 'Inactive',
    }
    return {
      recentForm: 'N/A',
      winStreak: 0,
      avgPointsLast4: 0,
      bestPlayer: emptyPlayer,
      breakoutCandidate: emptyPlayer,
      sleeperPick: emptyPlayer,
    }
  }

  const sortedByRank = [...players].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  const youngPlayers = players.filter((p) => p.age && p.age <= 23)
  const breakoutCandidates = youngPlayers
    .filter((p) => (p.rank || 999) <= 10)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))

  return {
    recentForm: 'Hot', // Placeholder
    winStreak: 3, // Placeholder
    avgPointsLast4: 125.5, // Placeholder
    bestPlayer: sortedByRank[0] || players[0],
    breakoutCandidate: breakoutCandidates[0] || players[0],
    sleeperPick: players.find((p) => (p.rank || 999) > 10 && p.age <= 25) || players[0],
  }
}

const calculatePositionStrengths = (players: PlayerData[]): PositionStrengths => {
  const positionCounts: PositionStrengths = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    FLEX: 0,
    SFLX: 0,
  }

  if (players && players.length > 0) {
    players.forEach((player) => {
      const position = player.position?.toUpperCase()
      if (position === 'QB') positionCounts.QB++
      else if (position === 'RB') positionCounts.RB++
      else if (position === 'WR') positionCounts.WR++
      else if (position === 'TE') positionCounts.TE++
      else if (position === 'FLEX') positionCounts.FLEX++
      else if (position === 'SFLX' || position === 'SUPER_FLEX') positionCounts.SFLX++
      // Handle any other positions by adding to FLEX
      else {
        positionCounts.FLEX++
      }
    })
  }

  return positionCounts
}

const calculateRecentForm = (roster: any, matchups: any[]): string => {
  if (!matchups || matchups.length === 0) return 'N/A'

  const rosterMatchups = matchups.filter((m: any) => m.roster_id === roster.roster_id)
  if (rosterMatchups.length === 0) return 'N/A'

  let wins = 0
  let losses = 0
  let ties = 0

  rosterMatchups.forEach((matchup: any) => {
    const opponentMatchup = matchups.find(
      (m: any) => m.matchup_id === matchup.matchup_id && m.roster_id !== roster.roster_id
    )

    if (opponentMatchup) {
      const teamPoints = matchup.points || 0
      const opponentPoints = opponentMatchup.points || 0

      if (teamPoints > opponentPoints) wins++
      else if (teamPoints < opponentPoints) losses++
      else ties++
    }
  })

  const totalGames = wins + losses + ties
  if (totalGames === 0) return 'N/A'

  const winRate = (wins / totalGames) * 100
  if (winRate >= 70) return 'Hot'
  if (winRate >= 50) return 'Neutral'
  if (winRate >= 30) return 'Cold'
  return 'Very Cold'
}

export default function LeagueBuddy({
  leagueId,
  user,
  leagues = [],
  onLeagueChange,
}: LeagueBuddyProps) {
  console.log('🎯 LeagueBuddy mounted with:', { leagueId, user, leagues: leagues.length })

  const router = useRouter()
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
  const [activeSection, setActiveSection] = useState<'overview' | 'roster' | 'league'>('overview')
  const [lineupMode, setLineupMode] = useState<'current' | 'optimized'>('current')
  const [whatIfLineup, setWhatIfLineup] = useState<string[]>([]) // Player IDs for what-if scenario
  const [selectedStarterToSwap, setSelectedStarterToSwap] = useState<string | null>(null) // For what-if swaps

  // Memoized sorted teams to prevent unnecessary re-sorting
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      // Sort by wins first, then by points
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
  }, [teams])

  // Memoized league position rankings
  const leaguePositionRankings = useMemo(() => {
    if (!sortedTeams || sortedTeams.length === 0) return {}

    const calculateLeaguePositionRankings = () => {
      const positions = ['QB', 'RB', 'WR', 'TE']
      const teamPositionScores: Record<string, Record<string, number>> = {}

      // Calculate position scores for each team
      sortedTeams.forEach((team) => {
        if (!team || !team.rosterId || !team.players) return

        teamPositionScores[team.rosterId] = {}

        positions.forEach((position) => {
          const positionPlayers = team.players.filter(
            (p) => p && p.position && p.position === position
          )
          if (positionPlayers.length === 0) {
            teamPositionScores[team.rosterId][position] = 999 // Worst possible score
          } else {
            // Use best player rank for QB, average of top 2 for skill positions
            const sortedRanks = positionPlayers.map((p) => p.rank || 999).sort((a, b) => a - b)
            if (position === 'QB') {
              teamPositionScores[team.rosterId][position] = sortedRanks[0]
            } else {
              // Average of top 2 players for RB/WR/TE
              teamPositionScores[team.rosterId][position] =
                (sortedRanks[0] + (sortedRanks[1] || sortedRanks[0])) / 2
            }
          }
        })

        // FLEX is based on overall team grade score
        teamPositionScores[team.rosterId]['FLEX'] = Math.max(0, 100 - (team.gradeScore || 0))
      })

      // Rank teams by position (1 = best position group in league)
      const positionRankings: Record<string, Record<string, number>> = {}

      const allPositions = [...positions, 'FLEX']
      allPositions.forEach((position) => {
        const teamScores = sortedTeams
          .filter((team) => team && team.rosterId && teamPositionScores[team.rosterId])
          .map((team) => ({
            rosterId: team.rosterId,
            score: teamPositionScores[team.rosterId][position] || 999,
          }))
          .sort((a, b) => a.score - b.score) // Lower score = better rank

        teamScores.forEach((teamScore, index) => {
          if (!positionRankings[teamScore.rosterId]) positionRankings[teamScore.rosterId] = {}
          positionRankings[teamScore.rosterId][position] = index + 1
        })
      })

      return positionRankings
    }

    try {
      return calculateLeaguePositionRankings()
    } catch (error) {
      console.error('Error calculating position rankings:', error)
      return {}
    }
  }, [sortedTeams])

  // Helper functions for tier calculations
  const getContenderTier = useCallback((grade: string, rank: number) => {
    if (['A+', 'A'].includes(grade) && rank <= 2) return 'Powerhouse'
    if (['A-', 'B+', 'B'].includes(grade) && rank <= 6) return 'Contender'
    if (['B-', 'C+', 'C'].includes(grade) && rank <= 10) return 'Pretender'
    return 'Rebuilder'
  }, [])

  const getTierColor = useCallback((tier: string) => {
    switch (tier) {
      case 'Powerhouse':
        return 'bg-green-900/80 text-green-200 border-green-700/50'
      case 'Contender':
        return 'bg-yellow-900/80 text-yellow-200 border-yellow-700/50'
      case 'Pretender':
        return 'bg-orange-900/80 text-orange-200 border-orange-700/50'
      case 'Rebuilder':
        return 'bg-red-900/80 text-red-200 border-red-700/50'
      default:
        return 'bg-gray-900/80 text-gray-200 border-gray-700/50'
    }
  }, [])

  const getRankColor = useCallback((rank: number) => {
    if (rank <= 3) return 'bg-green-900/70 text-green-100 border-green-700/40'
    if (rank <= 6) return 'bg-yellow-900/70 text-yellow-100 border-yellow-700/40'
    if (rank <= 9) return 'bg-orange-900/70 text-orange-100 border-orange-700/40'
    return 'bg-red-900/70 text-red-100 border-red-700/40'
  }, [])

  // Memoized event handlers to prevent unnecessary re-renders
  const handleTeamSelect = useCallback((team: TeamData) => {
    try {
      if (!team || !team.rosterId) {
        console.error('Invalid team data:', team)
        return
      }
      setSelectedTeam(team)
    } catch (error) {
      console.error('Error selecting team:', error)
    }
  }, [])

  const handleTradeMarketClick = useCallback(() => {
    router.push(`/trade-market?leagueId=${leagueId}`)
  }, [router, leagueId])

  const handleScoutingPortalClick = useCallback(() => {
    router.push(`/scouting-portal?leagueId=${leagueId}`)
  }, [router, leagueId])

  const handleDraftBuddyClick = useCallback(() => {
    router.push(`/draft-buddy?leagueId=${leagueId}`)
  }, [router, leagueId])

  // Fallback NFL schedule function
  const getFallbackNflSchedule = useCallback((week: number) => {
    // Static NFL schedule for 2024 season - this would need to be updated for 2025
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

    const weekSchedule = nflSchedule2024[week] || {}
    console.log(
      '🔄 Using fallback schedule for week',
      week,
      ':',
      Object.keys(weekSchedule).length,
      'teams'
    )
    return weekSchedule
  }, [])

  // Fetch NFL schedule data
  const fetchNflSchedule = useCallback(async (week: number) => {
    try {
      console.log('🔍 Fetching NFL schedule for week', week)

      // Try multiple ESPN API endpoints
      const endpoints = [
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${new Date().getFullYear()}`,
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,
      ]

      let data = null
      for (const endpoint of endpoints) {
        try {
          console.log('🌐 Trying endpoint:', endpoint)
          const response = await fetch(endpoint)
          data = await response.json()
          console.log('📊 API Response:', data)

          if (data.events && data.events.length > 0) {
            console.log('✅ Found events:', data.events.length)
            break
          }
        } catch (endpointError) {
          console.log('❌ Endpoint failed:', endpoint, endpointError)
          continue
        }
      }

      if (data && data.events && data.events.length > 0) {
        const games: Record<string, { opponent: string; isHome: boolean }> = {}

        data.events.forEach((event: any, index: number) => {
          console.log(`🏈 Processing event ${index}:`, event)
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
                console.log(`📝 Added game: ${awayAbbr} @ ${homeAbbr}`)
              }
            }
          }
        })

        setNflGames(games)
        console.log(
          '📅 NFL Schedule loaded for week',
          week,
          ':',
          Object.keys(games).length,
          'teams'
        )
        console.log('🎮 Games:', games)
      } else {
        console.log('⚠️ No events found in API response, using fallback schedule')
        // Fallback to static schedule for current NFL season
        const fallbackSchedule = getFallbackNflSchedule(week)
        setNflGames(fallbackSchedule)
      }
    } catch (error) {
      console.error('❌ Failed to fetch NFL schedule:', error)
      // Fallback to static schedule
      const fallbackSchedule = getFallbackNflSchedule(week)
      setNflGames(fallbackSchedule)
    }
  }, [])

  // Optimized data fetching with better error handling
  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      setError(null)

      // Cache the league ID for other components to use
      leagueCache.setLeagueId(leagueId)

      // Fetch NFL state to get current week - ALWAYS get fresh data (no cache)
      const nflState = (await fetch('https://api.sleeper.app/v1/state/nfl', {
        cache: 'no-store',
      }).then((r) => r.json())) as any
      const week = nflState?.week || nflState?.display_week // Always get current week from API
      console.log('NFL State (FRESH):', {
        week,
        season: nflState?.season,
        seasonType: nflState?.season_type,
      })
      setCurrentWeek(week)

      // Fetch all data in parallel - ROSTERS, USERS & MATCHUPS are ALWAYS FRESH (no cache)
      const [rosters, users, allPlayers, league, matchups, rankingsResponse, nflSchedule] =
        (await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, {
            cache: 'no-store',
          }).then((r) => r.json()),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }).then(
            (r) => r.json()
          ),
          sleeperApi.getAllPlayers(),
          sleeperApi.getLeagueInfo(leagueId),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`, {
            cache: 'no-store',
          })
            .then(async (r) => {
              console.log(`📊 Matchups API response status: ${r.status} for league ${leagueId}, week ${week}`)
              if (!r.ok) {
                console.warn(`⚠️ Matchups API returned ${r.status}: ${r.statusText}`)
                return []
              }
              const data = await r.json()
              console.log(`✅ Matchups API returned ${data?.length || 0} entries`)
              return data
            })
            .catch((err) => {
              console.error(`❌ Failed to fetch matchups for league ${leagueId}, week ${week}:`, err)
              return []
            }),
          fetch('/api/rankings')
            .then((res) => (res.ok ? res.json() : []))
            .catch(() => []),
          Promise.resolve([]), // NFL schedule not available from Sleeper API
        ])) as [any[], any[], Record<string, any>, any, any[], any[], any[]]

      // SIMPLE: Get stats for all roster players using their Sleeper IDs
      const allSleeperPlayerIds = Array.from(new Set(rosters.flatMap((r: any) => r.players || [])))

      console.log('🏈 Fetching stats for', allSleeperPlayerIds.length, 'roster players...')
      console.log('📅 NFL Schedule for week', week, ':', nflSchedule.length, 'games')
      console.log('📅 NFL Schedule data:', nflSchedule.slice(0, 3)) // Show first 3 games for debugging

      // Set NFL schedule state
      setNflSchedule(nflSchedule)

      // Fetch stats directly - API handles Sleeper ID -> GSIS ID -> Stats mapping
      const rosterStatsMap: Record<
        string,
        { fantasy_ppg: number; total_fantasy_points: number; games_played: number }
      > = {}

      if (allSleeperPlayerIds.length > 0) {
        try {
          const playerIdsParam = allSleeperPlayerIds.join(',')
          const response = await fetch(`/api/roster-stats?player_ids=${playerIdsParam}`, {
            cache: 'no-store',
          })

          if (response.ok) {
            const result = await response.json()
            console.log('📊 Roster Stats Response:', result.count, 'players')

            // Map by Sleeper player ID (simple!)
            result.data.forEach((playerStats: any) => {
              rosterStatsMap[playerStats.sleeper_player_id] = {
                fantasy_ppg: parseFloat(playerStats.fantasy_ppg) || 0,
                total_fantasy_points: parseFloat(playerStats.total_fantasy_points) || 0,
                games_played: playerStats.games_played || 0,
              }
            })

            console.log('✅ Loaded stats for', Object.keys(rosterStatsMap).length, 'players')
            console.log(
              '📈 Sample roster stats:',
              Object.entries(rosterStatsMap)
                .slice(0, 5)
                .map(([id, stats]) => ({
                  id,
                  name: result.data.find((p: any) => p.sleeper_player_id === id)?.player_name,
                  fantasy_ppg: stats.fantasy_ppg,
                }))
            )
          } else {
            console.error('❌ Failed to fetch stats:', response.statusText)
          }
        } catch (err) {
          console.error('❌ Failed to fetch stats:', err)
        }
      }

      console.log('Roster data fetched (FRESH):', {
        rosterCount: rosters?.length,
        matchupCount: matchups?.length,
      })

      // Log league status to help debug matchup issues
      console.log('📋 League Info:', {
        leagueId,
        name: league?.name,
        status: league?.status,
        season: league?.season,
        seasonType: league?.season_type,
        draftId: league?.draft_id,
        previousLeagueId: league?.previous_league_id,
        playoffWeekStart: league?.settings?.playoff_week_start,
        playoffTeams: league?.settings?.num_teams_in_playoff,
      })

      if (!rosters || !users || !allPlayers || !league) {
        throw new Error('Invalid data received from API')
      }

      // Filter out any null or invalid users/rosters
      const validUsers = users.filter((u: any) => u && u.user_id)
      const validRosters = rosters.filter((r: any) => r && r.roster_id)

      // Process rankings data
      let rankingsMap: Record<string, any> = {}
      if (rankingsResponse && rankingsResponse.length > 0) {
        rankingsMap = rankingsResponse.reduce((acc: any, player: any) => {
          const playerName = player['PLAYER NAME']
          if (playerName) {
            acc[playerName] = {
              rank: player.RK,
              position: player.POS,
              team: player.TEAM,
              name: playerName,
              tier:
                player.RK <= 12
                  ? 1
                  : player.RK <= 36
                    ? 2
                    : player.RK <= 72
                      ? 3
                      : player.RK <= 120
                        ? 4
                        : 5,
            }
          }
          return acc
        }, {})
      }

      // SIMPLE: Merge stats directly into allPlayers using Sleeper player IDs
      const enhancedPlayers = { ...allPlayers }
      let mergedCount = 0
      Object.entries(rosterStatsMap).forEach(([sleeperId, stats]) => {
        if (enhancedPlayers[sleeperId]) {
          enhancedPlayers[sleeperId] = {
            ...enhancedPlayers[sleeperId],
            fantasy_ppg: stats.fantasy_ppg,
            fantasy_points_ppr: stats.total_fantasy_points,
            games_played: stats.games_played,
          }
          if (stats.fantasy_ppg > 0) mergedCount++
        }
      })

      console.log(
        '✅ Enhanced',
        Object.values(enhancedPlayers).filter((p) => p.fantasy_ppg > 0).length,
        'players with stats'
      )
      console.log(`🔄 Merged ${mergedCount} players with fantasy_ppg > 0 from rosterStatsMap`)

      setAllPlayers(enhancedPlayers)

      // Process trending players with Next.js caching
      const trending = await sleeperApi.getTrendingPlayers().catch(() => [])

      const trendingPlayers: TrendingPlayer[] = Array.isArray(trending)
        ? trending
            .map((item: any) => {
              const player = allPlayers[item.player_id]
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

      // Process matchups correctly according to Sleeper API format
      const matchupData: MatchupData[] = []
      const matchupMap = new Map<number, SleeperMatchup[]>()

      if (matchups && matchups.length > 0) {
        console.log(`🏈 Processing ${matchups.length} matchup entries for week ${week}:`, matchups)
        // Group matchups by matchup_id (teams with same matchup_id play each other)
        matchups.forEach((matchup: SleeperMatchup) => {
          const matchupId = matchup.matchup_id
          if (!matchupMap.has(matchupId)) {
            matchupMap.set(matchupId, [])
          }
          matchupMap.get(matchupId)!.push(matchup)
        })

        // Create matchup pairs
        matchupMap.forEach((teams, matchupId) => {
          if (teams.length === 2) {
            const [team1, team2] = teams

            // Find team names
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

            // Add both matchup perspectives with full Sleeper API data including player points
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

        console.log(`✅ Processed ${matchupData.length} matchup pairs:`, matchupData)
      } else {
        console.warn(`⚠️ No matchup data found for week ${week}`, {
          leagueId,
          leagueName: league?.name,
          leagueStatus: league?.status,
          season: league?.season,
          currentWeek: week,
          playoffWeekStart: league?.settings?.playoff_week_start,
          note: 'This could mean: (1) Season hasn\'t started, (2) Draft not complete, (3) League ended, or (4) API error'
        })
      }

      // Calculate league overview stats
      const totalPoints = validRosters.reduce(
        (sum: number, roster: any) => sum + (roster.settings?.fpts || 0),
        0
      )
      const avgPoints = totalPoints / validRosters.length
      const highestScoring = validRosters.reduce(
        (highest: any, roster: any) =>
          (roster.settings?.fpts || 0) > (highest?.settings?.fpts || 0) ? roster : highest,
        null
      )
      const lowestScoring = validRosters.reduce(
        (lowest: any, roster: any) =>
          (roster.settings?.fpts || 0) < (lowest?.settings?.fpts || 0) ? roster : lowest,
        validRosters[0]
      )

      const highestOwner = highestScoring
        ? validUsers.find((u: any) => u.user_id === highestScoring.owner_id)
        : null
      const lowestOwner = lowestScoring
        ? validUsers.find((u: any) => u.user_id === lowestScoring.owner_id)
        : null

      setLeagueOverview({
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
        rosterPositions: league?.roster_positions || {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          SUPER_FLEX: 1,
        },
      })

      // Set the processed matchup data
      setCurrentMatchups(matchupData)

      // Process teams data with validation
      const teamsData: (TeamData | null)[] = rosters.map((roster: any) => {
        // Add null checks for roster data
        if (!roster || !roster.roster_id) {
          return null
        }

        const owner = roster.owner_id
          ? validUsers.find((u: any) => u?.user_id === roster.owner_id)
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
            const ranking = playerRankings[playerName]

            // Use already-merged NGS stats from enhanced allPlayers (merged by GSIS ID)
            const fantasyPointsPPR = player.fantasy_points_ppr || 0
            const gamesPlayed = player.games_played || 0
            const fantasyPPG = player.fantasy_ppg || 0

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
              espn_id: player.espn_id,
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

        const currentMatchup = matchups?.find((m: any) => m.roster_id === roster.roster_id)
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
          starters: roster.starters || [], // Store starters from roster
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

      // Find and select the user's team (match owner_id with user.user_id)
      console.log('🔍 User matching debug:', {
        userProp: user,
        userId: user?.user_id,
        validRosterOwners: validRosters.map((r: any) => ({
          rosterId: r.roster_id,
          ownerId: r.owner_id,
        })),
      })

      let userTeam: TeamData | null = null
      if (user?.user_id) {
        const userRoster = validRosters.find((r: any) => r.owner_id === user.user_id)
        if (userRoster) {
          userTeam = validTeamsData.find((t) => t.rosterId === userRoster.roster_id) || null
          console.log('✅ Found user team:', userTeam?.teamName, 'Roster ID:', userRoster.roster_id)
        } else {
          console.warn(
            '⚠️ User roster not found. User ID:',
            user.user_id,
            'not in roster owner_ids'
          )
        }
      } else {
        console.warn('⚠️ No user.user_id provided to LeagueBuddy component')
      }

      // Set the user's team as selected, or fall back to first team if user not in league
      const teamToSelect = userTeam || validTeamsData[0] || null
      console.log(
        '📍 Setting selected team:',
        teamToSelect?.teamName,
        'Roster ID:',
        teamToSelect?.rosterId
      )
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

  // Fetch NFL schedule when current week changes
  useEffect(() => {
    if (currentWeek > 0) {
      fetchNflSchedule(currentWeek)
    }
  }, [currentWeek, fetchNflSchedule])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 overflow-x-hidden">
        {/* Mobile Skeleton - Centered Layout */}
        <div className="md:hidden pl-2 pr-6 py-4 sm:px-6 sm:py-6">
          <div className="max-w-md sm:max-w-none mx-auto sm:mx-0 space-y-6">
            {/* League Switcher Skeleton */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4 !bg-slate-700" />
                <Skeleton className="h-14 w-full rounded-lg !bg-slate-700" />
              </CardContent>
            </Card>

            {/* Mobile Action Buttons Skeleton */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="flex-1 h-14 rounded-lg !bg-slate-700" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Info Skeleton */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full !bg-slate-700" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-40 mb-2 !bg-slate-700" />
                    <Skeleton className="h-4 w-32 !bg-slate-700" />
                  </div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-8 rounded !bg-slate-700" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matchup Skeleton */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <Skeleton className="h-4 w-16 mx-auto mb-2 !bg-slate-700" />
                  <Skeleton className="h-5 w-32 mx-auto !bg-slate-700" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-12 w-12 rounded-full !bg-slate-700" />
                    <div>
                      <Skeleton className="h-4 w-8 mb-1 !bg-slate-700" />
                      <Skeleton className="h-6 w-12 !bg-slate-700" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-8 !bg-slate-700" />
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <Skeleton className="h-4 w-20 mb-1 !bg-slate-700" />
                      <Skeleton className="h-6 w-8 ml-auto !bg-slate-700" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full !bg-slate-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lineup Skeleton */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32 mb-4 !bg-slate-700" />
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full !bg-slate-700" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1 !bg-slate-700" />
                          <Skeleton className="h-3 w-20 !bg-slate-700" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1 !bg-slate-700" />
                        <Skeleton className="h-3 w-16 !bg-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Desktop Skeleton - Sidebar Layout */}
        <div className="hidden md:block">
          <SidebarProvider defaultOpen={true}>
            <Sidebar collapsible="none" className="!bg-slate-800 !border-slate-700">
              {/* Sidebar Skeleton */}
              <SidebarHeader className="p-4 border-b border-slate-700 !bg-slate-800">
                <div className="space-y-4">
                  {/* League selector skeleton */}
                  <div>
                    <Skeleton className="h-4 w-16 mb-2 !bg-slate-700" />
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                  </div>

                  {/* Team info skeleton */}
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full !bg-slate-700" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2 !bg-slate-700" />
                      <Skeleton className="h-3 w-20 !bg-slate-700" />
                    </div>
                  </div>
                </div>
              </SidebarHeader>

              <SidebarContent className="!bg-slate-800">
                <SidebarGroup className="!bg-slate-800 p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                  </div>
                </SidebarGroup>

                <SidebarGroup className="!bg-slate-800 p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                    <Skeleton className="h-10 w-full !bg-slate-700" />
                  </div>
                </SidebarGroup>
              </SidebarContent>

              <SidebarFooter className="p-4 border-t border-slate-700 !bg-slate-800">
                <Skeleton className="h-8 w-full !bg-slate-700" />
              </SidebarFooter>
            </Sidebar>

            {/* Main Content Skeleton */}
            <SidebarInset className="!bg-slate-900">
              <div className="p-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-48 !bg-slate-700" />
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-6 w-24 !bg-slate-700" />
                        <Skeleton className="h-6 w-24 !bg-slate-700" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Matchup skeleton */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 flex-1">
                          <Skeleton className="h-12 w-12 rounded-full !bg-slate-700" />
                          <div>
                            <Skeleton className="h-4 w-16 mb-2 !bg-slate-700" />
                            <Skeleton className="h-8 w-20 !bg-slate-700" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-8 !bg-slate-700" />
                        <div className="flex items-center space-x-3 flex-1 justify-end">
                          <div className="text-right">
                            <Skeleton className="h-4 w-24 mb-2 !bg-slate-700" />
                            <Skeleton className="h-8 w-20 !bg-slate-700" />
                          </div>
                          <Skeleton className="h-12 w-12 rounded-full !bg-slate-700" />
                        </div>
                      </div>
                    </div>

                    {/* Lineup skeleton */}
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-40 !bg-slate-700" />
                      <div className="grid grid-cols-1 gap-3">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <Skeleton className="h-12 w-12 rounded !bg-slate-700" />
                                <div className="flex-1">
                                  <Skeleton className="h-4 w-32 mb-2 !bg-slate-700" />
                                  <Skeleton className="h-3 w-24 !bg-slate-700" />
                                </div>
                              </div>
                              <Skeleton className="h-6 w-16 !bg-slate-700" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-mono">{error}</p>
            <Button
              onClick={fetchLeagueData}
              className="mt-4 bg-yellow-400 text-black hover:bg-yellow-300"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check if this is a pre-season league with no players
  const teamsWithPlayers = teams.filter((team) => team.players.length > 0)
  if (teams.length > 0 && teamsWithPlayers.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
            <p className="text-yellow-400 font-mono text-lg mb-2">PRE-SEASON LEAGUE</p>
            <p className="text-slate-300 mb-4">
              This league appears to be in pre-season mode. Team data will be available once the
              draft is completed and the season begins.
            </p>
            <div className="text-sm text-slate-400 space-y-1">
              <p>• League has {teams.length} teams registered</p>
              <p>• Current week: {currentWeek}</p>
              <p>• Season type: {leagueOverview?.seasonType || 'Unknown'}</p>
            </div>
            <Button
              onClick={fetchLeagueData}
              className="mt-4 bg-yellow-400 text-black hover:bg-yellow-300"
            >
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Desktop Sidebar - Hidden on Mobile */}
      <Sidebar
        collapsible="none"
        className="!bg-gradient-to-b !from-slate-800 !to-slate-900 !border-slate-700/50 hidden md:block"
      >
        {/* Team Info Header */}
        <SidebarHeader className="p-5 border-b border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
          {/* League Switcher */}
          {leagues.length > 1 && onLeagueChange && (
            <div className="mb-5">
              <label className="text-[10px] text-yellow-400 font-mono mb-2 block uppercase tracking-widest font-semibold">
                League
              </label>
              <Select value={leagueId} onValueChange={onLeagueChange}>
                <SelectTrigger className="!bg-slate-700/50 !border-slate-600/50 !text-slate-100 hover:!bg-slate-600/50 hover:!border-yellow-400/30 !transition-all !duration-200 !h-11 !rounded-lg !shadow-sm">
                  <SelectValue placeholder="Select a league" />
                </SelectTrigger>
                <SelectContent className="!bg-slate-700 !border-slate-600">
                  {leagues.map((league) => (
                    <SelectItem
                      key={league.league_id}
                      value={league.league_id}
                      className={`!text-slate-200 hover:!bg-slate-600 focus:!bg-slate-600 ${
                        league.league_id === leagueId ? '!bg-yellow-400/20 !text-yellow-400' : ''
                      }`}
                    >
                      <div className="flex flex-col py-1 text-left">
                        <span
                          className={`font-semibold text-sm text-left ${
                            league.league_id === leagueId ? 'text-yellow-400' : ''
                          }`}
                        >
                          {league.name}
                        </span>
                        <span
                          className={`text-xs text-left ${
                            league.league_id === leagueId ? 'text-yellow-400/70' : 'text-slate-400'
                          }`}
                        >
                          {league.total_rosters} teams • {league.season}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AnimatePresence mode="wait">
            {selectedTeam && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <UserAvatar
                      avatarId={selectedTeam.ownerAvatar}
                      displayName={selectedTeam.ownerName}
                      username={selectedTeam.ownerUsername}
                      size={48}
                      className="ring-2 ring-yellow-400/40 shadow-lg"
                    />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-yellow-400 font-mono truncate mb-1.5 leading-tight">
                      {selectedTeam.teamName}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}
                      >
                        GRADE {selectedTeam.grade}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="!bg-slate-600/50 !border-slate-500 !text-slate-300 text-[10px] font-mono px-2 py-0.5"
                      >
                        RANK #
                        {sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-600/30">
                  <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">
                    Record
                  </span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {selectedTeam.wins}-{selectedTeam.losses}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SidebarHeader>

        {/* Navigation Items */}
        <SidebarContent className="!bg-transparent">
          {/* Main Navigation Group */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="!bg-transparent px-3 py-2">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="!text-yellow-400 font-mono text-[10px] uppercase tracking-widest hover:!bg-slate-700/30 cursor-pointer flex items-center justify-between w-full transition-all duration-200 !px-3 !py-2.5 rounded-lg font-bold">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" />
                    Navigation
                  </div>
                  <motion.div
                    animate={{ rotate: 0 }}
                    className="group-data-[state=closed]/collapsible:-rotate-90 transition-transform duration-200 ease-out"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.15,
                    ease: 'easeOut',
                  }}
                >
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                      >
                        <SidebarMenuItem>
                          <motion.div
                            whileHover={{ scale: 1.015, x: 2 }}
                            whileTap={{ scale: 0.985 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 25,
                              mass: 0.5,
                            }}
                          >
                            <SidebarMenuButton
                              onClick={() => setActiveSection('overview')}
                              isActive={activeSection === 'overview'}
                              className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                                activeSection === 'overview'
                                  ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                  : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                              }`}
                            >
                              <Target className="h-4 w-4" />
                              <span className="font-medium">Overview</span>
                            </SidebarMenuButton>
                          </motion.div>
                        </SidebarMenuItem>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <SidebarMenuItem>
                          <motion.div
                            whileHover={{ scale: 1.015, x: 2 }}
                            whileTap={{ scale: 0.985 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 25,
                              mass: 0.5,
                            }}
                          >
                            <SidebarMenuButton
                              onClick={() => setActiveSection('roster')}
                              isActive={activeSection === 'roster'}
                              className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                                activeSection === 'roster'
                                  ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                  : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                              }`}
                            >
                              <Users className="h-4 w-4" />
                              <span className="font-medium">My Team</span>
                            </SidebarMenuButton>
                          </motion.div>
                        </SidebarMenuItem>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        <SidebarMenuItem>
                          <motion.div
                            whileHover={{ scale: 1.015, x: 2 }}
                            whileTap={{ scale: 0.985 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 25,
                              mass: 0.5,
                            }}
                          >
                            <SidebarMenuButton
                              onClick={() => setActiveSection('league')}
                              isActive={activeSection === 'league'}
                              className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                                activeSection === 'league'
                                  ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                  : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                              }`}
                            >
                              <Trophy className="h-4 w-4" />
                              <span className="font-medium">League</span>
                            </SidebarMenuButton>
                          </motion.div>
                        </SidebarMenuItem>
                      </motion.div>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </motion.div>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          <SidebarSeparator className="!bg-slate-700/30 !mx-3" />

          {/* Quick Actions Group */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="!bg-transparent px-3 py-2">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="!text-yellow-400 font-mono text-[10px] uppercase tracking-widest hover:!bg-slate-700/30 cursor-pointer flex items-center justify-between w-full transition-all duration-200 !px-3 !py-2.5 rounded-lg font-bold">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Quick Actions
                  </div>
                  <motion.div
                    animate={{ rotate: 0 }}
                    className="group-data-[state=closed]/collapsible:-rotate-90 transition-transform duration-200 ease-out"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.15,
                    ease: 'easeOut',
                  }}
                >
                  <SidebarGroupContent>
                    <SidebarMenu>{/* Action buttons removed */}</SidebarMenu>
                  </SidebarGroupContent>
                </motion.div>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>

        {/* Footer - League Info */}
        <SidebarFooter className="p-4 border-t border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {leagueOverview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30"
              >
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-600/30">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-semibold">
                    League Stats
                  </span>
                </div>
                <div className="space-y-2">
                  <motion.div
                    className="flex items-center justify-between"
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className="text-xs text-slate-400 font-mono">Week:</span>
                    <span className="text-yellow-400 font-mono font-bold text-sm">
                      {currentWeek}
                    </span>
                  </motion.div>
                  <motion.div
                    className="flex items-center justify-between"
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className="text-xs text-slate-400 font-mono">Teams:</span>
                    <span className="text-yellow-400 font-mono font-bold text-sm">
                      {sortedTeams.length}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="!bg-slate-900 overflow-x-hidden">
        <div className="pl-2 pr-6 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 max-w-md sm:max-w-none mx-auto sm:mx-0">
          {/* Mobile Navigation & League Switcher - Only visible on mobile */}
          <div className="md:hidden mb-6 space-y-6">
            {/* Mobile League Switcher */}
            {leagues.length > 1 && onLeagueChange && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <label className="text-sm text-yellow-400 font-mono mb-3 block">
                    Select League
                  </label>
                  <Select value={leagueId} onValueChange={onLeagueChange}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 hover:border-yellow-400/30 transition-all duration-200 h-12 rounded-lg px-4">
                      <SelectValue placeholder="Select a league" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {leagues.map((league) => (
                        <SelectItem
                          key={league.league_id}
                          value={league.league_id}
                          className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600"
                        >
                          <div className="flex flex-col py-2 text-left">
                            <span
                              className={`font-semibold text-sm text-left ${
                                league.league_id === leagueId ? 'text-yellow-400' : ''
                              }`}
                            >
                              {league.name}
                            </span>
                            <span
                              className={`text-xs text-left ${
                                league.league_id === leagueId
                                  ? 'text-yellow-400/70'
                                  : 'text-slate-400'
                              }`}
                            >
                              {league.total_rosters} teams • {league.season}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' &&
            selectedTeam &&
            leagueOverview &&
            (() => {
              console.log('🎯 Looking for matchup:', {
                selectedTeamRosterId: selectedTeam.rosterId,
                currentMatchupsCount: currentMatchups.length,
                currentMatchupsRosterIds: currentMatchups.map((m) => m.rosterId),
                currentWeek,
              })
              const userMatchup = currentMatchups.find((m) => m.rosterId === selectedTeam.rosterId)
              console.log('📊 User matchup:', userMatchup ? 'FOUND' : 'NOT FOUND', userMatchup)
              const pointDiff = userMatchup
                ? userMatchup.actualPoints - userMatchup.opponentActualPoints
                : 0
              const isWinning = pointDiff > 0
              const isTied = pointDiff === 0

              return (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    {/* Header: Team Info + Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-slate-700">
                      <div className="flex items-center space-x-4">
                        <UserAvatar
                          avatarId={selectedTeam.ownerAvatar}
                          displayName={selectedTeam.ownerName}
                          username={selectedTeam.ownerUsername}
                          size={48}
                          className="ring-2 ring-yellow-400/30"
                        />
                        <div>
                          <h2 className="text-xl font-bold text-yellow-400 font-mono mb-1">
                            {selectedTeam.teamName}
                          </h2>
                          <div className="flex items-center space-x-3 text-sm">
                            <Badge
                              variant="outline"
                              className={`text-xs font-mono ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}
                            >
                              {selectedTeam.grade}
                            </Badge>
                            <span className="text-slate-400">
                              #
                              {sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) +
                                1}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {selectedTeam.wins}-{selectedTeam.losses}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-yellow-400 font-mono text-xs">
                              {(() => {
                                const totalProjection = selectedTeam.players.reduce(
                                  (sum, player) => {
                                    const playerRank =
                                      playerRankings[
                                        `${player.playerName}` as keyof typeof playerRankings
                                      ]
                                    return sum + (playerRank?.projection || 0)
                                  },
                                  0
                                )
                                return `${totalProjection.toFixed(1)} avg`
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Hidden on mobile */}
                      <div className="hidden md:flex items-center space-x-2">
                        <button
                          className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
                          onClick={handleTradeMarketClick}
                        >
                          <Trophy className="h-4 w-4" />
                          <span>Trade</span>
                        </button>
                        <button
                          className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
                          onClick={handleScoutingPortalClick}
                        >
                          <Eye className="h-4 w-4" />
                          <span>Scout</span>
                        </button>
                        <button
                          className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
                          onClick={handleDraftBuddyClick}
                        >
                          <Users className="h-4 w-4" />
                          <span>Draft</span>
                        </button>
                      </div>
                    </div>

                    {/* Matchup Score - Compact with Avatars */}
                    {userMatchup ? (
                      <div className="bg-slate-700/30 rounded-lg p-3 mt-3">
                        <div className="text-center mb-2">
                          <div className="text-slate-500 font-mono text-xs mb-1">
                            WEEK {currentWeek}
                          </div>
                          <div
                            className={`text-sm font-bold ${isWinning ? 'text-green-400' : isTied ? 'text-slate-300' : 'text-red-400'}`}
                          >
                            {isWinning ? 'WINNING' : isTied ? 'TIED' : 'LOSING'}
                            {userMatchup.actualPoints > 0 && (
                              <span className="ml-2">by {Math.abs(pointDiff).toFixed(1)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Your Team */}
                          <div className="flex flex-col items-center space-y-1 flex-1">
                            <UserAvatar
                              avatarId={selectedTeam.ownerAvatar}
                              displayName={selectedTeam.ownerName}
                              username={selectedTeam.ownerUsername}
                              size={40}
                              className="ring-2 ring-yellow-400/50 flex-shrink-0"
                            />
                            <div className="text-center">
                              <div className="text-slate-400 text-xs font-mono mb-1">YOU</div>
                              <div className="text-xl font-bold text-slate-100 font-mono">
                                {userMatchup.actualPoints > 0
                                  ? userMatchup.actualPoints.toFixed(1)
                                  : '0'}
                              </div>
                            </div>
                          </div>

                          {/* VS */}
                          <div className="text-slate-600 font-mono text-sm px-2 flex-shrink-0">
                            VS
                          </div>

                          {/* Opponent Team */}
                          <div className="flex flex-col items-center space-y-1 flex-1">
                            <UserAvatar
                              avatarId={userMatchup.opponentAvatar}
                              displayName={
                                userMatchup.opponentDisplayName || userMatchup.opponentTeamName
                              }
                              username={
                                userMatchup.opponentUsername || userMatchup.opponentTeamName
                              }
                              size={40}
                              className="ring-2 ring-blue-400/50 flex-shrink-0"
                            />
                            <div className="text-center">
                              <div className="text-slate-400 text-xs font-mono mb-1 truncate">
                                {userMatchup.opponentTeamName.toUpperCase()}
                              </div>
                              <div className="text-xl font-bold text-slate-100 font-mono">
                                {userMatchup.opponentActualPoints > 0
                                  ? userMatchup.opponentActualPoints.toFixed(1)
                                  : '0'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Target className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No matchup for Week {currentWeek}</p>
                      </div>
                    )}

                    {/* Mobile Action Buttons - Only visible on mobile */}
                    <div className="md:hidden flex items-center justify-center space-x-3 mt-3">
                      <button
                        className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
                        onClick={handleTradeMarketClick}
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Trade</span>
                      </button>
                      <button
                        className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 font-mono text-xs px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400/50 transition-all"
                        onClick={handleScoutingPortalClick}
                      >
                        <Eye className="h-4 w-4" />
                        <span>Scout</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

          {/* Lineup Manager - Current vs Optimized with What-If */}
          {selectedTeam &&
            leagueOverview &&
            (() => {
              const rosterPositions = leagueOverview.rosterPositions || {
                QB: 1,
                RB: 2,
                WR: 2,
                TE: 1,
                FLEX: 1,
                SUPER_FLEX: 1,
              }

              // Get current starters from roster data (not matchup, as matchup may be empty for current week)
              const currentStarters = selectedTeam.starters || []
              console.log('📋 Current starters from roster:', currentStarters.length, 'players')

              // Helper function to get NFL opponent - using static schedule for now
              const getOpponentInfo = (player: PlayerData) => {
                // Debug logging
                console.log('🔍 Getting opponent info for:', player.playerName, player.team)
                console.log('📊 Available NFL games:', Object.keys(nflGames).length, nflGames)

                // Use real NFL schedule data from ESPN API
                const gameInfo = nflGames[player.team]
                console.log('🎮 Game info for', player.team, ':', gameInfo)

                if (gameInfo) {
                  // We have real schedule data for this team
                  const { opponent, isHome } = gameInfo
                  console.log(
                    '✅ Found matchup:',
                    player.team,
                    'vs',
                    opponent,
                    isHome ? 'HOME' : 'AWAY'
                  )

                  // Basic matchup rating based on opponent defensive strength
                  const toughDefenses = ['BAL', 'SF', 'BUF', 'DAL', 'PIT', 'CLE', 'NYJ', 'PHI']
                  const eliteMatchups = ['ARI', 'CAR', 'DEN', 'LV', 'NYG', 'WAS', 'ATL', 'IND']
                  const goodMatchups = ['GB', 'KC', 'LAC', 'MIA', 'TB', 'HOU']

                  let matchupRating = 'Average'
                  if (toughDefenses.includes(opponent)) matchupRating = 'Tough'
                  else if (eliteMatchups.includes(opponent)) matchupRating = 'Elite'
                  else if (goodMatchups.includes(opponent)) matchupRating = 'Good'
                  else matchupRating = 'Great'

                  return {
                    opponentTeam: opponent,
                    isHome,
                    matchupRating,
                    gameTime: null,
                  }
                }

                // Fallback if no schedule data available
                console.log('⚠️ No matchup data for', player.team, '- using TBD')
                return {
                  opponentTeam: 'TBD',
                  isHome: false,
                  matchupRating: 'Average',
                  gameTime: null,
                }
              }

              // Calculate point projection based on actual FFP/G and matchup
              const calculateProjection = (player: PlayerData, matchupRating: string) => {
                // Use fantasy_ppg from NGS database (already calculated correctly in ETL pipeline)
                let avgFPPG = 0

                if (player.fantasy_ppg && player.fantasy_ppg > 0) {
                  // Use pre-calculated PPG from NGS database
                  avgFPPG = player.fantasy_ppg
                } else {
                  // Fallback: estimate based on rank if no fantasy data available
                  switch (player.position) {
                    case 'QB':
                      if (player.rank <= 6) avgFPPG = 22
                      else if (player.rank <= 12) avgFPPG = 19
                      else if (player.rank <= 18) avgFPPG = 17
                      else if (player.rank <= 24) avgFPPG = 15
                      else avgFPPG = 12
                      break
                    case 'RB':
                      if (player.rank <= 12) avgFPPG = 16
                      else if (player.rank <= 24) avgFPPG = 13
                      else if (player.rank <= 36) avgFPPG = 11
                      else if (player.rank <= 48) avgFPPG = 9
                      else avgFPPG = 7
                      break
                    case 'WR':
                      if (player.rank <= 12) avgFPPG = 15
                      else if (player.rank <= 24) avgFPPG = 12
                      else if (player.rank <= 36) avgFPPG = 10
                      else if (player.rank <= 48) avgFPPG = 8
                      else avgFPPG = 6
                      break
                    case 'TE':
                      if (player.rank <= 6) avgFPPG = 12
                      else if (player.rank <= 12) avgFPPG = 9
                      else if (player.rank <= 18) avgFPPG = 7
                      else avgFPPG = 5
                      break
                    default:
                      avgFPPG = 8
                  }
                }

                // Apply matchup modifier
                let matchupModifier = 1.0
                if (matchupRating === 'Elite') matchupModifier = 1.15
                else if (matchupRating === 'Great') matchupModifier = 1.08
                else if (matchupRating === 'Good') matchupModifier = 1.03
                else if (matchupRating === 'Average') matchupModifier = 1.0
                else if (matchupRating === 'Tough') matchupModifier = 0.88

                // Add slight variance for realism
                const variance = (Math.random() * 2 - 1) * 1.2

                return Math.max(0, Math.round((avgFPPG * matchupModifier + variance) * 10) / 10)
              }

              // Build lineup based on mode (current, optimized, or what-if)
              const buildLineup = (mode: 'current' | 'optimized', whatIfStarters?: string[]) => {
                console.log('🏗️ Building lineup:', {
                  mode,
                  selectedTeam: selectedTeam?.teamName,
                  playerCount: selectedTeam?.players.length,
                  currentStartersCount: currentStarters.length,
                })

                const lineup: {
                  position: string
                  player: PlayerData
                  slotType: 'starter' | 'flex' | 'superflex'
                }[] = []
                const bench: PlayerData[] = []
                const usedPlayers = new Set<string>()

                if (mode === 'current' && whatIfStarters && whatIfStarters.length > 0) {
                  // What-if scenario - use custom starters
                  whatIfStarters.forEach((playerId) => {
                    const player = selectedTeam.players.find((p) => p.playerId === playerId)
                    if (player) {
                      lineup.push({ position: player.position, player, slotType: 'starter' })
                      usedPlayers.add(playerId)
                    }
                  })
                } else if (mode === 'current' && currentStarters.length > 0) {
                  // Current lineup from Sleeper
                  currentStarters.forEach((playerId) => {
                    const player = selectedTeam.players.find((p) => p.playerId === playerId)
                    if (player) {
                      lineup.push({ position: player.position, player, slotType: 'starter' })
                      usedPlayers.add(playerId)
                    }
                  })
                } else {
                  // Optimized lineup
                  const qbs = selectedTeam.players
                    .filter((p) => p.position === 'QB')
                    .sort((a, b) => a.rank - b.rank)
                  const rbs = selectedTeam.players
                    .filter((p) => p.position === 'RB')
                    .sort((a, b) => a.rank - b.rank)
                  const wrs = selectedTeam.players
                    .filter((p) => p.position === 'WR')
                    .sort((a, b) => a.rank - b.rank)
                  const tes = selectedTeam.players
                    .filter((p) => p.position === 'TE')
                    .sort((a, b) => a.rank - b.rank)
                  const flexEligible = [...rbs, ...wrs, ...tes].sort((a, b) => a.rank - b.rank)
                  const superFlexEligible = [...qbs, ...rbs, ...wrs, ...tes].sort(
                    (a, b) => a.rank - b.rank
                  )

                  // Fill QB slots
                  for (let i = 0; i < (rosterPositions.QB || 0); i++) {
                    if (qbs[i]) {
                      lineup.push({ position: 'QB', player: qbs[i], slotType: 'starter' })
                      usedPlayers.add(qbs[i].playerId)
                    }
                  }

                  // Fill RB slots
                  for (let i = 0; i < (rosterPositions.RB || 0); i++) {
                    if (rbs[i]) {
                      lineup.push({ position: 'RB', player: rbs[i], slotType: 'starter' })
                      usedPlayers.add(rbs[i].playerId)
                    }
                  }

                  // Fill WR slots
                  for (let i = 0; i < (rosterPositions.WR || 0); i++) {
                    if (wrs[i]) {
                      lineup.push({ position: 'WR', player: wrs[i], slotType: 'starter' })
                      usedPlayers.add(wrs[i].playerId)
                    }
                  }

                  // Fill TE slots
                  for (let i = 0; i < (rosterPositions.TE || 0); i++) {
                    if (tes[i]) {
                      lineup.push({ position: 'TE', player: tes[i], slotType: 'starter' })
                      usedPlayers.add(tes[i].playerId)
                    }
                  }

                  // Fill FLEX slots
                  const remainingFlex = flexEligible.filter((p) => !usedPlayers.has(p.playerId))
                  for (let i = 0; i < (rosterPositions.FLEX || 0); i++) {
                    if (remainingFlex[i]) {
                      lineup.push({ position: 'FLEX', player: remainingFlex[i], slotType: 'flex' })
                      usedPlayers.add(remainingFlex[i].playerId)
                    }
                  }

                  // Fill SUPER_FLEX slots
                  const remainingSuperFlex = superFlexEligible.filter(
                    (p) => !usedPlayers.has(p.playerId)
                  )
                  for (let i = 0; i < (rosterPositions.SUPER_FLEX || 0); i++) {
                    if (remainingSuperFlex[i]) {
                      lineup.push({
                        position: 'SUPER_FLEX',
                        player: remainingSuperFlex[i],
                        slotType: 'superflex',
                      })
                      usedPlayers.add(remainingSuperFlex[i].playerId)
                    }
                  }
                }

                // Everyone else goes to bench
                selectedTeam.players.forEach((p) => {
                  if (!usedPlayers.has(p.playerId)) {
                    bench.push(p)
                  }
                })

                console.log('✅ Lineup built:', {
                  mode,
                  startersCount: lineup.length,
                  benchCount: bench.length,
                  starters: lineup.map((s) => `${s.player.playerName} (${s.position})`),
                })

                return { lineup, bench }
              }

              // Get the appropriate lineup based on current mode
              const { lineup, bench } = buildLineup(
                lineupMode,
                whatIfLineup.length > 0 ? whatIfLineup : undefined
              )

              // Get current lineup for comparison when showing optimized
              const { lineup: currentLineupData } = buildLineup('current')
              const currentPlayerIds = new Set(
                currentLineupData.map((slot) => slot.player.playerId)
              )
              const optimizedPlayerIds = new Set(lineup.map((slot) => slot.player.playerId))

              // Find players that changed between current and optimized
              const playersAddedInOptimized = lineup.filter(
                (slot) => !currentPlayerIds.has(slot.player.playerId)
              )
              const playersRemovedInOptimized = currentLineupData.filter(
                (slot) => !optimizedPlayerIds.has(slot.player.playerId)
              )

              // Handle player swap for what-if scenarios
              const handleSwapPlayer = (starterPlayerId: string, benchPlayerId: string) => {
                const newStarters = lineup.map((slot) => slot.player.playerId)
                const starterIndex = newStarters.indexOf(starterPlayerId)
                if (starterIndex !== -1) {
                  newStarters[starterIndex] = benchPlayerId
                  setWhatIfLineup(newStarters)
                }
              }

              // Reset what-if to current lineup
              const handleResetWhatIf = () => {
                setWhatIfLineup([])
              }

              // Calculate total projected points using season averages with fallback
              const totalProjection = lineup.reduce((sum, slot) => {
                let ppg = slot.player.fantasy_ppg || 0
                // Fallback to Sleeper's own stats if NGS data is missing
                if (
                  !ppg &&
                  slot.player.fantasy_points_ppr &&
                  slot.player.games_played &&
                  slot.player.games_played > 0
                ) {
                  ppg = slot.player.fantasy_points_ppr / slot.player.games_played
                }
                return sum + ppg
              }, 0)

              // Calculate bench potential using season averages with fallback
              const benchProjections = bench.slice(0, 5).map((player) => {
                let ppg = player.fantasy_ppg || 0
                // Fallback to Sleeper's own stats if NGS data is missing
                if (
                  !ppg &&
                  player.fantasy_points_ppr &&
                  player.games_played &&
                  player.games_played > 0
                ) {
                  ppg = player.fantasy_points_ppr / player.games_played
                }
                return ppg
              })
              const benchPotential = benchProjections.reduce((sum, proj) => sum + proj, 0)

              // Count players by matchup quality
              const matchupBreakdown = lineup.reduce(
                (acc, slot) => {
                  const { matchupRating } = getOpponentInfo(slot.player)
                  acc[matchupRating] = (acc[matchupRating] || 0) + 1
                  return acc
                },
                {} as Record<string, number>
              )

              return (
                <Card className="bg-slate-800 border-slate-700 mt-6">
                  <CardHeader>
                    {/* Mobile-first layout */}
                    <div className="space-y-3 mb-4">
                      {/* Title and Description - Simplified for mobile */}
                      <div>
                        <CardTitle className="text-yellow-400 font-mono flex items-center text-lg">
                          <Target className="h-5 w-5 mr-2" />
                          {lineupMode === 'current' ? 'CURRENT' : 'OPTIMIZED'} LINEUP - WEEK{' '}
                          {currentWeek}
                        </CardTitle>
                        <p className="text-slate-400 text-sm mt-1">
                          {lineupMode === 'current'
                            ? 'Your active lineup on Sleeper'
                            : 'AI-optimized based on rankings, stats, and matchups'}
                        </p>
                      </div>
                    </div>

                    {/* Mode Toggle - Simplified for mobile */}
                    <div className="space-y-2">
                      {/* Buttons - Mobile full width, Desktop inline */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setLineupMode('current')
                            handleResetWhatIf()
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
                            lineupMode === 'current'
                              ? 'bg-yellow-400 text-slate-900'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          Current
                        </button>
                        <button
                          onClick={() => {
                            setLineupMode('optimized')
                            handleResetWhatIf()
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
                            lineupMode === 'optimized'
                              ? 'bg-yellow-400 text-slate-900'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          Optimized
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Optimized Changes Summary */}
                    {lineupMode === 'optimized' && playersAddedInOptimized.length > 0 && (
                      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                        <h3 className="text-yellow-400 font-mono text-sm mb-3 flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          OPTIMIZED CHANGES ({playersAddedInOptimized.length} swap
                          {playersAddedInOptimized.length > 1 ? 's' : ''})
                        </h3>
                        <div className="space-y-2">
                          {playersAddedInOptimized.map((addedSlot, idx) => {
                            const removedSlot = playersRemovedInOptimized[idx]
                            if (!removedSlot) return null

                            const addedFPPG = addedSlot.player.fantasy_ppg || 0
                            const removedFPPG = removedSlot.player.fantasy_ppg || 0
                            const improvement = addedFPPG - removedFPPG

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 text-xs bg-slate-800/50 rounded p-2"
                              >
                                <div className="flex items-center space-x-2 flex-1">
                                  <TeamLogo team={removedSlot.player.team} size={20} />
                                  <span className="text-slate-400">
                                    {removedSlot.player.playerName}
                                  </span>
                                  <span className="text-slate-600 font-mono">
                                    {removedFPPG.toFixed(1)}
                                  </span>
                                </div>
                                <div className="text-yellow-400">→</div>
                                <div className="flex items-center space-x-2 flex-1 justify-end">
                                  <span className="text-green-400 font-mono font-bold">
                                    {addedFPPG.toFixed(1)}
                                  </span>
                                  <span className="text-slate-300 font-semibold">
                                    {addedSlot.player.playerName}
                                  </span>
                                  <TeamLogo team={addedSlot.player.team} size={20} />
                                  {improvement > 0 && (
                                    <span className="text-green-400 text-xs">
                                      +{improvement.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Starters Section */}
                    <div>
                      <h3 className="text-green-400 font-mono text-sm mb-3 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        STARTERS ({lineup.length})
                      </h3>
                      {/* Mobile: Compact horizontal rows, Desktop: Grid cards */}
                      <div className="md:hidden space-y-2">
                        {lineup.map((slot, idx) => {
                          const { opponentTeam, isHome, matchupRating } = getOpponentInfo(
                            slot.player
                          )
                          // Get fantasy_ppg with fallback to Sleeper's own stats
                          let avgFPPG = slot.player.fantasy_ppg || null
                          if (
                            !avgFPPG &&
                            slot.player.fantasy_points_ppr &&
                            slot.player.games_played &&
                            slot.player.games_played > 0
                          ) {
                            avgFPPG = slot.player.fantasy_points_ppr / slot.player.games_played
                          }

                          // Get actual points for this week from matchup data
                          const userMatchup = currentMatchups.find(
                            (m) => m.rosterId === selectedTeam.rosterId
                          )
                          const actualPoints =
                            userMatchup?.playersPoints?.[slot.player.playerId] || 0
                          const predictedPoints = avgFPPG || 0
                          const pointsDiff = actualPoints - predictedPoints
                          const isUnderperforming = actualPoints > 0 && pointsDiff < -2

                          // Check if this player is new in optimized lineup
                          const isNewInOptimized =
                            lineupMode === 'optimized' &&
                            !currentPlayerIds.has(slot.player.playerId)

                          // Check if this starter has a better bench alternative
                          const starterFPPG = slot.player.fantasy_ppg || 0
                          const eligibleBench = bench.filter(
                            (b) =>
                              (b.position === slot.position ||
                                (slot.position === 'FLEX' &&
                                  ['RB', 'WR', 'TE'].includes(b.position)) ||
                                (slot.position === 'SUPERFLEX' &&
                                  ['QB', 'RB', 'WR', 'TE'].includes(b.position))) &&
                              (b.fantasy_ppg || 0) > 0
                          )
                          const bestBench = eligibleBench.reduce(
                            (best, current) =>
                              (current.fantasy_ppg || 0) > (best.fantasy_ppg || 0) ? current : best,
                            eligibleBench[0] || slot.player
                          )
                          const hasBetterBench =
                            bestBench && (bestBench.fantasy_ppg || 0) > starterFPPG
                          const benchFPPG = bestBench?.fantasy_ppg || 0

                          const ratingColor =
                            matchupRating === 'Elite'
                              ? 'text-green-400'
                              : matchupRating === 'Great'
                                ? 'text-blue-400'
                                : matchupRating === 'Good'
                                  ? 'text-yellow-400'
                                  : matchupRating === 'Average'
                                    ? 'text-orange-400'
                                    : 'text-red-400'

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                hasBetterBench && lineupMode === 'current'
                                  ? 'bg-yellow-400/10 border-yellow-400/50 ring-2 ring-yellow-400/30'
                                  : isUnderperforming
                                    ? 'bg-slate-800/50 border-slate-600/50 opacity-60'
                                    : isNewInOptimized
                                      ? 'bg-yellow-400/10 border-yellow-400/50'
                                      : matchupRating === 'Elite' || matchupRating === 'Great'
                                        ? 'bg-green-500/5 border-green-500/30'
                                        : matchupRating === 'Tough'
                                          ? 'bg-red-500/5 border-red-500/20'
                                          : 'bg-slate-700/30 border-slate-600'
                              }`}
                            >
                              {/* Left: Position + Player Info */}
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <Badge
                                  className={`text-xs font-bold px-1.5 py-0.5 ${
                                    slot.position === 'QB'
                                      ? 'bg-pink-500/20 text-pink-400'
                                      : slot.position === 'RB'
                                        ? 'bg-teal-500/20 text-teal-400'
                                        : slot.position === 'WR'
                                          ? 'bg-blue-500/20 text-blue-400'
                                          : 'bg-purple-500/20 text-purple-400'
                                  }`}
                                >
                                  {slot.position}
                                </Badge>
                                <TeamLogo
                                  team={slot.player.team}
                                  size={24}
                                  className="flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-slate-100 truncate">
                                    {slot.player.playerName}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {slot.position} #{slot.player.rank} • {slot.player.team}
                                    {isNewInOptimized && (
                                      <span className="text-yellow-400 ml-1">⚡</span>
                                    )}
                                    {isUnderperforming && (
                                      <span className="text-red-400 ml-1">⚠️</span>
                                    )}
                                  </div>
                                  {hasBetterBench && lineupMode === 'current' && (
                                    <div className="mt-1 p-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-md">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-yellow-400 font-semibold">
                                          SWAP SUGGESTION
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-300 mt-0.5">
                                        <span className="text-yellow-400 font-semibold">
                                          {bestBench.playerName}
                                        </span>
                                        <span className="text-slate-400">
                                          {' '}
                                          ({benchFPPG.toFixed(1)} FPPG)
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Center: Matchup Info */}
                              <div className="flex items-center space-x-2 px-2">
                                <div className="text-center">
                                  <div className="text-xs text-slate-400">
                                    {isHome ? 'vs' : '@'} {opponentTeam}
                                  </div>
                                  <div className={`text-xs font-semibold ${ratingColor}`}>
                                    {matchupRating}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Points */}
                              <div className="text-right flex-shrink-0">
                                {actualPoints > 0 ? (
                                  <>
                                    <div
                                      className={`text-lg font-bold font-mono ${
                                        pointsDiff > 0
                                          ? 'text-green-400'
                                          : pointsDiff < -2
                                            ? 'text-red-400'
                                            : 'text-yellow-400'
                                      }`}
                                    >
                                      {actualPoints.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {pointsDiff > 0
                                        ? `+${pointsDiff.toFixed(1)}`
                                        : pointsDiff.toFixed(1)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-lg font-bold font-mono text-yellow-400">
                                      {avgFPPG ? avgFPPG.toFixed(1) : '--'}
                                    </div>
                                    <div className="text-xs text-slate-400">proj</div>
                                  </>
                                )}
                                {hasBetterBench && lineupMode === 'current' && (
                                  <div className="mt-1 text-xs text-yellow-400 font-semibold">
                                    +{(benchFPPG - starterFPPG).toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop: Original grid layout */}
                      <div className="hidden md:grid grid-cols-2 gap-3">
                        {lineup.map((slot, idx) => {
                          const { opponentTeam, isHome, matchupRating } = getOpponentInfo(
                            slot.player
                          )
                          // Get fantasy_ppg with fallback to Sleeper's own stats
                          let avgFPPG = slot.player.fantasy_ppg || null
                          if (
                            !avgFPPG &&
                            slot.player.fantasy_points_ppr &&
                            slot.player.games_played &&
                            slot.player.games_played > 0
                          ) {
                            avgFPPG = slot.player.fantasy_points_ppr / slot.player.games_played
                          }

                          // Get actual points for this week from matchup data
                          const userMatchup = currentMatchups.find(
                            (m) => m.rosterId === selectedTeam.rosterId
                          )
                          const actualPoints =
                            userMatchup?.playersPoints?.[slot.player.playerId] || 0
                          const predictedPoints = avgFPPG || 0
                          const pointsDiff = actualPoints - predictedPoints
                          const isUnderperforming = actualPoints > 0 && pointsDiff < -2

                          // Check if this player is new in optimized lineup
                          const isNewInOptimized =
                            lineupMode === 'optimized' &&
                            !currentPlayerIds.has(slot.player.playerId)

                          // Check if this starter has a better bench alternative
                          const starterFPPG = slot.player.fantasy_ppg || 0
                          const eligibleBench = bench.filter(
                            (b) =>
                              (b.position === slot.position ||
                                (slot.position === 'FLEX' &&
                                  ['RB', 'WR', 'TE'].includes(b.position)) ||
                                (slot.position === 'SUPERFLEX' &&
                                  ['QB', 'RB', 'WR', 'TE'].includes(b.position))) &&
                              (b.fantasy_ppg || 0) > 0
                          )
                          const bestBench = eligibleBench.reduce(
                            (best, current) =>
                              (current.fantasy_ppg || 0) > (best.fantasy_ppg || 0) ? current : best,
                            eligibleBench[0] || slot.player
                          )
                          const hasBetterBench =
                            bestBench && (bestBench.fantasy_ppg || 0) > starterFPPG
                          const benchFPPG = bestBench?.fantasy_ppg || 0

                          const ratingColor =
                            matchupRating === 'Elite'
                              ? 'text-green-400 bg-green-400/10 border-green-400/30'
                              : matchupRating === 'Great'
                                ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
                                : matchupRating === 'Good'
                                  ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                                  : matchupRating === 'Average'
                                    ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
                                    : 'text-red-400 bg-red-400/10 border-red-400/30'

                          // Determine confidence level based on whether we have real NGS data
                          const hasRealData = !!avgFPPG
                          const isTopRanked = slot.player.rank <= 24
                          const confidence =
                            hasRealData && isTopRanked ? 'HIGH' : hasRealData ? 'MEDIUM' : 'LOW'
                          const confidenceColor =
                            confidence === 'HIGH'
                              ? 'text-green-400'
                              : confidence === 'MEDIUM'
                                ? 'text-yellow-400'
                                : 'text-slate-500'

                          // Get recommendation badge based on rank
                          let recommendationBadge = ''
                          if (slot.player.rank <= 6 && ['QB', 'TE'].includes(slot.player.position))
                            recommendationBadge = 'MUST START'
                          else if (
                            slot.player.rank <= 12 &&
                            ['RB', 'WR'].includes(slot.player.position)
                          )
                            recommendationBadge = 'MUST START'
                          else if (avgFPPG && avgFPPG >= 15) recommendationBadge = 'STRONG START'
                          else if (slot.slotType === 'flex' || slot.slotType === 'superflex')
                            recommendationBadge = 'FLEX PLAY'

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border transition-all hover:shadow-lg ${
                                hasBetterBench && lineupMode === 'current'
                                  ? 'bg-yellow-400/10 border-yellow-400/50 ring-2 ring-yellow-400/30'
                                  : isUnderperforming
                                    ? 'bg-slate-800/50 border-slate-600/50 opacity-60'
                                    : isNewInOptimized
                                      ? 'bg-yellow-400/10 border-yellow-400/50 ring-2 ring-yellow-400/30'
                                      : matchupRating === 'Elite' || matchupRating === 'Great'
                                        ? 'bg-green-500/5 border-green-500/30'
                                        : matchupRating === 'Tough'
                                          ? 'bg-red-500/5 border-red-500/20'
                                          : 'bg-slate-700/30 border-slate-600'
                              }`}
                            >
                              {/* Top Row: Position, Matchup, Projection */}
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 font-mono text-xs font-bold px-2">
                                    {slot.position}
                                  </Badge>
                                  {isNewInOptimized && (
                                    <Badge className="bg-yellow-400 text-slate-900 border-yellow-400 font-mono text-xs font-bold px-2 animate-pulse">
                                      ⚡ OPTIMIZED IN
                                    </Badge>
                                  )}
                                  {isUnderperforming && (
                                    <Badge className="bg-red-400/20 text-red-400 border-red-400/30 font-mono text-xs px-2">
                                      UNDERPERFORMING
                                    </Badge>
                                  )}
                                  {hasBetterBench && lineupMode === 'current' && (
                                    <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono text-xs px-2 animate-pulse">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                                        <span>
                                          SWAP: {bestBench.playerName} ({benchFPPG.toFixed(1)})
                                        </span>
                                      </div>
                                    </Badge>
                                  )}
                                  {recommendationBadge &&
                                    !isNewInOptimized &&
                                    !isUnderperforming &&
                                    !hasBetterBench && (
                                      <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 font-mono text-xs px-2">
                                        {recommendationBadge}
                                      </Badge>
                                    )}
                                </div>
                                <Badge
                                  className={`${ratingColor} border font-mono text-xs px-2 py-1`}
                                >
                                  {matchupRating}
                                </Badge>
                              </div>

                              {/* Player Info Row */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <TeamLogo
                                    team={slot.player.team}
                                    size={48}
                                    className="flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <div className="text-slate-100 font-semibold text-base truncate">
                                        {slot.player.playerName}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs mb-1">
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-slate-600/20 text-slate-400"
                                      >
                                        {slot.player.position} #{slot.player.rank}
                                      </Badge>
                                      <span className="text-slate-500">•</span>
                                      <div className="flex items-center space-x-1">
                                        {isHome ? (
                                          <>
                                            <span className="text-green-400 font-semibold">vs</span>
                                            <TeamLogo team={opponentTeam} size={16} />
                                            <span className="text-slate-300 font-medium">
                                              {opponentTeam}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-blue-400 font-semibold">@</span>
                                            <TeamLogo team={opponentTeam} size={16} />
                                            <span className="text-slate-300 font-medium">
                                              {opponentTeam}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Points Column */}
                                <div className="text-right flex-shrink-0">
                                  {actualPoints > 0 ? (
                                    <>
                                      <div className="text-xs text-slate-500 uppercase font-mono mb-0.5">
                                        Week {currentWeek}
                                      </div>
                                      <div
                                        className={`font-bold font-mono text-2xl mb-1 ${
                                          pointsDiff > 0
                                            ? 'text-green-400'
                                            : pointsDiff < -2
                                              ? 'text-red-400'
                                              : 'text-yellow-400'
                                        }`}
                                      >
                                        {actualPoints.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        <span className="font-mono">
                                          {pointsDiff > 0
                                            ? `+${pointsDiff.toFixed(1)}`
                                            : pointsDiff.toFixed(1)}{' '}
                                          vs pred
                                        </span>
                                      </div>
                                    </>
                                  ) : avgFPPG ? (
                                    <>
                                      <div className="text-xs text-slate-500 uppercase font-mono mb-0.5">
                                        Season Avg
                                      </div>
                                      <div className="text-yellow-400 font-bold font-mono text-2xl mb-1">
                                        {avgFPPG.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        <span className="font-mono">PPG</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-xs text-slate-500 uppercase font-mono mb-0.5">
                                        Estimated
                                      </div>
                                      <div className="text-slate-400 font-bold font-mono text-2xl mb-1">
                                        --
                                      </div>
                                      <div className={`text-xs font-mono ${confidenceColor}`}>
                                        No Data
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Bench Section */}
                    {bench.length > 0 && (
                      <div>
                        <h3 className="text-slate-400 font-mono text-sm mb-3 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          BENCH ({bench.length}) - Top Alternatives
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {bench
                            .sort((a, b) => a.rank - b.rank)
                            .slice(0, 8)
                            .map((player, idx) => {
                              const { opponentTeam, isHome, matchupRating } =
                                getOpponentInfo(player)
                              const projection = calculateProjection(player, matchupRating)
                              const avgFPPG = player.fantasy_ppg || null
                              const matchupColor =
                                matchupRating === 'Elite' || matchupRating === 'Great'
                                  ? 'border-l-2 border-l-green-400/50'
                                  : matchupRating === 'Tough'
                                    ? 'border-l-2 border-l-red-400/50'
                                    : ''

                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg bg-slate-700/50 border border-slate-700 hover:bg-slate-700/70 transition-all ${matchupColor}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <TeamLogo
                                        team={player.team}
                                        size={40}
                                        className="flex-shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <div className="text-slate-200 text-sm font-semibold truncate">
                                            {player.playerName}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs">
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-slate-600/20 text-slate-400"
                                          >
                                            {player.position} #{player.rank}
                                          </Badge>
                                          <span className="text-slate-600">•</span>
                                          <div className="flex items-center space-x-1">
                                            {isHome ? (
                                              <>
                                                <span className="text-slate-500">vs</span>
                                                <span className="text-slate-400">
                                                  {opponentTeam}
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-slate-500">@</span>
                                                <span className="text-slate-400">
                                                  {opponentTeam}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {avgFPPG ? (
                                        <>
                                          <div className="text-xs text-slate-400 mb-1">
                                            <span className="font-semibold">FPPG:</span>{' '}
                                            <span className="font-mono">{avgFPPG.toFixed(1)}</span>
                                          </div>
                                          <div className="text-slate-300 font-mono text-lg font-semibold">
                                            {projection.toFixed(1)}
                                          </div>
                                          <div className="text-xs text-slate-500">Proj</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="text-slate-300 font-mono text-lg font-semibold">
                                            {projection.toFixed(1)}
                                          </div>
                                          <div className="text-xs text-slate-500 uppercase">
                                            {matchupRating}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          {bench.length > 8 && (
                            <div className="text-center text-xs text-slate-500 py-2">
                              + {bench.length - 8} more on bench
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

          {/* ROSTER SECTION */}
          {activeSection === 'roster' && selectedTeam && (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-blue-400 font-mono text-lg mb-4">POSITION STRENGTHS</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">QB:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.QB}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">RB:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.RB}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">WR:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.WR}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">TE:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.TE}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">FLEX:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.FLEX}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-slate-300 font-mono">SFLX:</span>
                    <span className="text-slate-100 font-bold">
                      {selectedTeam.positionStrengths.SFLX}
                    </span>
                  </div>
                </div>
              </div>

              {/* NGS PLAYER INSIGHTS */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-yellow-400 font-mono text-xl font-bold">
                    NGS PLAYER INSIGHTS
                  </h3>
                </div>

                {/* Insights Categories Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Most Efficient Players */}
                  <Card className="bg-gradient-to-br from-green-900/20 to-slate-700 border-green-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        MOST EFFICIENT
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTeam.players
                        .filter((p) => p.fantasy_ppg && p.fantasy_ppg > 8)
                        .sort((a, b) => (b.fantasy_ppg || 0) - (a.fantasy_ppg || 0))
                        .slice(0, 3)
                        .map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo team={player.team} size={24} className="flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-slate-100 font-semibold text-sm truncate">
                                  {player.playerName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {player.position} • #{player.rank}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-green-400 font-bold font-mono">
                                {player.fantasy_ppg?.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-slate-500">PPG</div>
                            </div>
                          </div>
                        ))}
                      {selectedTeam.players.filter((p) => p.fantasy_ppg && p.fantasy_ppg > 8)
                        .length === 0 && (
                        <div className="text-slate-500 text-sm text-center py-4">
                          No high performers yet
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trade Bait */}
                  <Card className="bg-gradient-to-br from-blue-900/20 to-slate-700 border-blue-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        TRADE BAIT
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTeam.players
                        .filter(
                          (p) => p.rank >= 50 && p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg > 5
                        )
                        .sort((a, b) => (b.fantasy_ppg || 0) - (a.fantasy_ppg || 0))
                        .slice(0, 3)
                        .map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo team={player.team} size={24} className="flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-slate-100 font-semibold text-sm truncate">
                                  {player.playerName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {player.position} • #{player.rank}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge className="!bg-blue-500/20 !text-blue-400 text-xs">
                                SELL HIGH
                              </Badge>
                            </div>
                          </div>
                        ))}
                      {selectedTeam.players.filter(
                        (p) => p.rank >= 50 && p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg > 5
                      ).length === 0 && (
                        <div className="text-slate-500 text-sm text-center py-4">
                          No trade targets
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Breakout Candidates */}
                  <Card className="bg-gradient-to-br from-purple-900/20 to-slate-700 border-purple-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        BREAKOUT WATCH
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTeam.players
                        .filter((p) => p.age && p.age <= 24 && p.rank <= 150)
                        .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                        .slice(0, 3)
                        .map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo team={player.team} size={24} className="flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-slate-100 font-semibold text-sm truncate">
                                  {player.playerName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {player.position} • {player.age}yo
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge className="!bg-purple-500/20 !text-purple-400 text-xs">
                                HOLD
                              </Badge>
                            </div>
                          </div>
                        ))}
                      {selectedTeam.players.filter((p) => p.age && p.age <= 24 && p.rank <= 150)
                        .length === 0 && (
                        <div className="text-slate-500 text-sm text-center py-4">
                          No young talent
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Underperformers */}
                  <Card className="bg-gradient-to-br from-red-900/20 to-slate-700 border-red-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        UNDERPERFORMING
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTeam.players
                        .filter((p) => p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg < 8)
                        .sort((a, b) => (a.fantasy_ppg || 0) - (b.fantasy_ppg || 0))
                        .slice(0, 3)
                        .map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo team={player.team} size={24} className="flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-slate-100 font-semibold text-sm truncate">
                                  {player.playerName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {player.position} • #{player.rank}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-red-400 font-bold font-mono">
                                {player.fantasy_ppg?.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-slate-500">PPG</div>
                            </div>
                          </div>
                        ))}
                      {selectedTeam.players.filter(
                        (p) => p.rank <= 100 && p.fantasy_ppg && p.fantasy_ppg < 8
                      ).length === 0 && (
                        <div className="text-slate-500 text-sm text-center py-4">
                          All performing well!
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* FULL TEAM ROSTER */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-green-400 font-mono text-lg mb-4">FULL ROSTER</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTeam.players.map((player, index) => (
                    <Card
                      key={index}
                      className="p-3 bg-slate-700 border-slate-600 hover:border-green-400/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <TeamLogo team={player.team} size={40} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-slate-100 truncate">
                              {player.playerName}
                            </h4>
                            <Badge
                              variant="secondary"
                              className={`text-xs px-1 py-0 ${POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]} text-white`}
                            >
                              {player.position}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{player.team}</span>
                            <span>#{player.rank}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-xs bg-slate-600/20 text-slate-300 border-slate-600"
                            >
                              {player.tier}
                            </Badge>
                            {player.age && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-400/20 text-blue-400 border-blue-400"
                              >
                                {player.age}yo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* NGS Advanced Metrics */}
                      <div className="pt-3 border-t border-slate-600">
                        <PlayerNGSStats
                          playerName={player.playerName}
                          position={player.position}
                          compact={true}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Team Insights - formerly Trends */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-green-400 font-mono text-lg mb-4">TEAM INSIGHTS</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-400 text-sm">BEST PLAYER</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        <TeamLogo team={selectedTeam.trends.bestPlayer.team} size={48} />
                        <div>
                          <h4 className="font-semibold text-slate-100">
                            {selectedTeam.trends.bestPlayer.playerName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            #{selectedTeam.trends.bestPlayer.rank} •{' '}
                            {selectedTeam.trends.bestPlayer.position}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-yellow-400 text-sm">BREAKOUT CANDIDATE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        <TeamLogo team={selectedTeam.trends.breakoutCandidate.team} size={48} />
                        <div>
                          <h4 className="font-semibold text-slate-100">
                            {selectedTeam.trends.breakoutCandidate.playerName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            #{selectedTeam.trends.breakoutCandidate.rank} •{' '}
                            {selectedTeam.trends.breakoutCandidate.position}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-purple-400 text-sm">SLEEPER PICK</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        <TeamLogo team={selectedTeam.trends.sleeperPick.team} size={48} />
                        <div>
                          <h4 className="font-semibold text-slate-100">
                            {selectedTeam.trends.sleeperPick.playerName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            #{selectedTeam.trends.sleeperPick.rank} •{' '}
                            {selectedTeam.trends.sleeperPick.position}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Team Analysis - formerly separate Analysis tab */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-purple-400 font-mono text-lg mb-4">TEAM ANALYSIS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-green-400 text-sm">TEAM STRENGTHS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Tier 1 Players:</span>
                          <span className="text-green-400 font-semibold">
                            {selectedTeam.players.filter((p) => p.tier === 'Tier 1').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Tier 2 Players:</span>
                          <span className="text-blue-400 font-semibold">
                            {selectedTeam.players.filter((p) => p.tier === 'Tier 2').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Young Players (≤25):</span>
                          <span className="text-purple-400 font-semibold">
                            {selectedTeam.players.filter((p) => p.age && p.age <= 25).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Top 50 Players:</span>
                          <span className="text-green-400 font-semibold">
                            {selectedTeam.players.filter((p) => p.rank <= 50).length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-orange-400 text-sm">SEASON PROJECTIONS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Projected Record:</span>
                          <span className="text-green-400 font-bold">
                            {(() => {
                              const totalGames = selectedTeam.wins + selectedTeam.losses
                              const currentWinRate =
                                totalGames > 0 ? selectedTeam.wins / totalGames : 0.5
                              const adjustedWinRate = Math.min(
                                0.85,
                                Math.max(
                                  0.15,
                                  currentWinRate + (selectedTeam.gradeScore - 50) / 200
                                )
                              )
                              const projectedWins = Math.round(adjustedWinRate * 14)
                              const projectedLosses = 14 - projectedWins
                              return `${projectedWins}-${projectedLosses}`
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Projected Finish:</span>
                          <span className="text-blue-400 font-bold">
                            {(() => {
                              const teamRank =
                                sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) +
                                1
                              const gradeAdjustment =
                                selectedTeam.gradeScore > 70
                                  ? -1
                                  : selectedTeam.gradeScore < 30
                                    ? 1
                                    : 0
                              const projectedRank = Math.max(
                                1,
                                Math.min(teams.length, teamRank + gradeAdjustment)
                              )
                              return `${projectedRank}${projectedRank === 1 ? 'st' : projectedRank === 2 ? 'nd' : projectedRank === 3 ? 'rd' : 'th'}`
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Playoff Chance:</span>
                          <span className="text-purple-400 font-bold">
                            {(() => {
                              const teamRank =
                                sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) +
                                1
                              const totalTeams = teams.length
                              const playoffSpots = Math.max(4, Math.ceil(totalTeams / 2))

                              let baseChance = 0
                              if (teamRank <= playoffSpots / 2) baseChance = 85
                              else if (teamRank <= playoffSpots) baseChance = 65
                              else if (teamRank <= playoffSpots + 2) baseChance = 35
                              else baseChance = 15

                              const gradeBonus = (selectedTeam.gradeScore - 50) * 0.5
                              const finalChance = Math.max(5, Math.min(95, baseChance + gradeBonus))
                              return `${Math.round(finalChance)}%`
                            })()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* LEAGUE SECTION - Matchup Details */}
          {activeSection === 'league' && selectedTeam && (
            <>
              <div className="space-y-4">
                {(() => {
                  // Find current matchup for this team
                  const teamMatchup = currentMatchups.find(
                    (m) => m.rosterId === selectedTeam.rosterId
                  )

                  if (!teamMatchup) {
                    return (
                      <Card className="bg-slate-700 border-slate-600">
                        <CardContent className="p-12 text-center">
                          <Target className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                          <p className="text-slate-400 mb-2">No matchup available</p>
                          <p className="text-sm text-slate-500">
                            {currentWeek === 1
                              ? "Season hasn't started yet"
                              : 'Matchup data will appear once the week begins'}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  }

                  const opponent = teams.find((t) => t.rosterId === teamMatchup.opponentRosterId)

                  if (!opponent) {
                    return (
                      <Card className="bg-slate-700 border-slate-600">
                        <CardContent className="p-12 text-center">
                          <Target className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                          <p className="text-slate-400">Opponent data not available</p>
                        </CardContent>
                      </Card>
                    )
                  }

                  const teamPoints = teamMatchup.actualPoints || 0
                  const oppPoints = teamMatchup.opponentActualPoints || 0
                  const isWinning = teamPoints > oppPoints
                  const pointDiff = Math.abs(teamPoints - oppPoints)

                  return (
                    <>
                      {/* Matchup Header */}
                      <Card className="bg-gradient-to-r from-slate-700 to-slate-600 border-slate-500">
                        <CardContent className="p-6">
                          <div className="text-center mb-4">
                            <h3 className="text-yellow-400 font-mono text-lg mb-1">
                              Week {currentWeek} Matchup
                            </h3>
                            <p className="text-slate-400 text-sm">Head to Head Analysis</p>
                          </div>

                          <div className="grid grid-cols-3 gap-4 items-center">
                            {/* Your Team */}
                            <div className="text-center">
                              <UserAvatar
                                avatarId={selectedTeam.ownerAvatar}
                                displayName={selectedTeam.ownerName}
                                username={selectedTeam.ownerUsername}
                                size={64}
                                className="mx-auto mb-3 ring-2 ring-yellow-400/50"
                              />
                              <div className="font-bold text-white text-lg mb-1">
                                {selectedTeam.teamName}
                              </div>
                              <Badge
                                className={
                                  GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]
                                }
                              >
                                {selectedTeam.grade}
                              </Badge>
                              <div
                                className={`text-3xl font-bold mt-3 ${isWinning ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {teamPoints.toFixed(1)}
                              </div>
                            </div>

                            {/* VS Indicator */}
                            <div className="text-center">
                              <div className="text-slate-400 font-mono text-2xl font-bold mb-2">
                                VS
                              </div>
                              {teamPoints > 0 && oppPoints > 0 && (
                                <div
                                  className={`text-sm ${isWinning ? 'text-green-400' : 'text-red-400'}`}
                                >
                                  {isWinning ? '+' : '-'}
                                  {pointDiff.toFixed(1)}
                                </div>
                              )}
                            </div>

                            {/* Opponent Team */}
                            <div className="text-center">
                              <UserAvatar
                                avatarId={opponent.ownerAvatar}
                                displayName={opponent.ownerName}
                                username={opponent.ownerUsername}
                                size={64}
                                className="mx-auto mb-3 ring-2 ring-blue-400/50"
                              />
                              <div className="font-bold text-white text-lg mb-1">
                                {opponent.teamName}
                              </div>
                              <Badge
                                className={
                                  GRADE_COLORS[opponent.grade as keyof typeof GRADE_COLORS]
                                }
                              >
                                {opponent.grade}
                              </Badge>
                              <div
                                className={`text-3xl font-bold mt-3 ${!isWinning ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {oppPoints.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Team Comparison Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Position Group Comparisons */}
                        <Card className="bg-slate-700 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-blue-400 text-sm">
                              POSITION MATCHUPS
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {['QB', 'RB', 'WR', 'TE', 'FLEX'].map((pos) => {
                                const yourRank =
                                  leaguePositionRankings[selectedTeam.rosterId]?.[pos] || 12
                                const oppRank =
                                  leaguePositionRankings[opponent.rosterId]?.[pos] || 12
                                const advantage = yourRank < oppRank

                                return (
                                  <div key={pos} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 flex-1">
                                      <Badge
                                        className={`${getRankColor(yourRank)} font-mono text-xs w-8 justify-center`}
                                      >
                                        {yourRank}
                                      </Badge>
                                      <span className="text-slate-300 text-sm font-mono">
                                        {pos}
                                      </span>
                                    </div>
                                    {advantage ? (
                                      <TrendingUp className="h-4 w-4 text-green-400" />
                                    ) : yourRank === oppRank ? (
                                      <div className="w-4 h-0.5 bg-yellow-400"></div>
                                    ) : (
                                      <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
                                    )}
                                    <Badge
                                      className={`${getRankColor(oppRank)} font-mono text-xs w-8 justify-center`}
                                    >
                                      {oppRank}
                                    </Badge>
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Overall Stats Comparison */}
                        <Card className="bg-slate-700 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-green-400 text-sm">
                              SEASON STATS COMPARISON
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm">Record:</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-slate-100 font-mono">
                                    {selectedTeam.wins}-{selectedTeam.losses}
                                  </span>
                                  <span className="text-slate-400">vs</span>
                                  <span className="text-slate-100 font-mono">
                                    {opponent.wins}-{opponent.losses}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm">Points For:</span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`font-mono ${selectedTeam.pointsFor > opponent.pointsFor ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {Math.round(selectedTeam.pointsFor)}
                                  </span>
                                  <span className="text-slate-400">vs</span>
                                  <span
                                    className={`font-mono ${opponent.pointsFor > selectedTeam.pointsFor ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {Math.round(opponent.pointsFor)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm">PPG:</span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`font-mono ${selectedTeam.pointsFor / Math.max(selectedTeam.wins + selectedTeam.losses, 1) > opponent.pointsFor / Math.max(opponent.wins + opponent.losses, 1) ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {Math.round(
                                      selectedTeam.pointsFor /
                                        Math.max(selectedTeam.wins + selectedTeam.losses, 1)
                                    )}
                                  </span>
                                  <span className="text-slate-400">vs</span>
                                  <span
                                    className={`font-mono ${opponent.pointsFor / Math.max(opponent.wins + opponent.losses, 1) > selectedTeam.pointsFor / Math.max(selectedTeam.wins + selectedTeam.losses, 1) ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {Math.round(
                                      opponent.pointsFor /
                                        Math.max(opponent.wins + opponent.losses, 1)
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm">League Rank:</span>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={`${getRankColor(sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1)} font-mono text-xs`}
                                  >
                                    #
                                    {sortedTeams.findIndex(
                                      (t) => t.rosterId === selectedTeam.rosterId
                                    ) + 1}
                                  </Badge>
                                  <span className="text-slate-400">vs</span>
                                  <Badge
                                    className={`${getRankColor(sortedTeams.findIndex((t) => t.rosterId === opponent.rosterId) + 1)} font-mono text-xs`}
                                  >
                                    #
                                    {sortedTeams.findIndex(
                                      (t) => t.rosterId === opponent.rosterId
                                    ) + 1}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Start/Sit Helper */}
                      <Card className="bg-slate-700 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-yellow-400 text-sm flex items-center">
                            <Target className="h-4 w-4 mr-2" />
                            START/SIT HELPER - WEEK {currentWeek}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-400 text-xs mb-4">
                            Your roster with Week {currentWeek} opponent matchups
                          </p>

                          {/* Group by position */}
                          {['QB', 'RB', 'WR', 'TE'].map((position) => {
                            const positionPlayers = selectedTeam.players.filter(
                              (p) => p.position === position
                            )
                            if (positionPlayers.length === 0) return null

                            return (
                              <div key={position} className="mb-6">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                      position === 'QB'
                                        ? 'bg-blue-500'
                                        : position === 'RB'
                                          ? 'bg-green-500'
                                          : position === 'WR'
                                            ? 'bg-yellow-500'
                                            : 'bg-purple-500'
                                    }`}
                                  >
                                    {position}
                                  </div>
                                  <h4 className="text-slate-200 font-mono text-sm font-semibold">
                                    {position} OPTIONS ({positionPlayers.length})
                                  </h4>
                                </div>

                                <div className="space-y-2">
                                  {positionPlayers
                                    .sort((a, b) => a.rank - b.rank) // Sort by rank to show best players first
                                    .map((player, idx) => {
                                      // Generate a mock NFL opponent - in real implementation, this would come from NFL schedule data
                                      const nflTeams = [
                                        'ARI',
                                        'ATL',
                                        'BAL',
                                        'BUF',
                                        'CAR',
                                        'CHI',
                                        'CIN',
                                        'CLE',
                                        'DAL',
                                        'DEN',
                                        'DET',
                                        'GB',
                                        'HOU',
                                        'IND',
                                        'JAX',
                                        'KC',
                                        'LAC',
                                        'LAR',
                                        'LV',
                                        'MIA',
                                        'MIN',
                                        'NE',
                                        'NO',
                                        'NYG',
                                        'NYJ',
                                        'PHI',
                                        'PIT',
                                        'SEA',
                                        'SF',
                                        'TB',
                                        'TEN',
                                        'WAS',
                                      ]

                                      // Use player's team as seed for consistent opponent matchup
                                      const seed = player.team
                                        .split('')
                                        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
                                      const opponentIndex = (seed + player.rank) % nflTeams.length
                                      const opponentTeam = nflTeams[opponentIndex]
                                      const isHome = seed % 2 === 0

                                      // Calculate matchup rating based on opponent defense strength (mock data)
                                      // In real implementation, this would be based on actual defensive rankings
                                      // Tough defenses: BAL, SF, BUF, DAL, PIT, CLE
                                      // Elite matchups: ARI, CAR, DEN, LV, NYG, WAS
                                      const toughDefenses = [
                                        'BAL',
                                        'SF',
                                        'BUF',
                                        'DAL',
                                        'PIT',
                                        'CLE',
                                        'NYJ',
                                        'PHI',
                                      ]
                                      const eliteMatchups = [
                                        'ARI',
                                        'CAR',
                                        'DEN',
                                        'LV',
                                        'NYG',
                                        'WAS',
                                        'ATL',
                                        'IND',
                                      ]
                                      const goodMatchups = ['GB', 'KC', 'LAC', 'MIA', 'TB', 'HOU']

                                      let matchupRating = 'Average'
                                      if (toughDefenses.includes(opponentTeam)) {
                                        matchupRating = 'Tough'
                                      } else if (eliteMatchups.includes(opponentTeam)) {
                                        matchupRating = 'Elite'
                                      } else if (goodMatchups.includes(opponentTeam)) {
                                        matchupRating = 'Good'
                                      } else {
                                        matchupRating = Math.random() > 0.5 ? 'Great' : 'Average'
                                      }

                                      const ratingColor =
                                        matchupRating === 'Elite'
                                          ? 'text-green-400 bg-green-400/10 border-green-400/30'
                                          : matchupRating === 'Great'
                                            ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
                                            : matchupRating === 'Good'
                                              ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                                              : matchupRating === 'Average'
                                                ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
                                                : 'text-red-400 bg-red-400/10 border-red-400/30'

                                      return (
                                        <div
                                          key={idx}
                                          className="p-3 bg-slate-600 rounded-lg border border-slate-500 hover:border-yellow-400/50 transition-all"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            {/* Player Info */}
                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                              <TeamLogo team={player.team} size={32} />
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                  <div className="text-slate-100 font-semibold text-sm truncate">
                                                    {player.playerName}
                                                  </div>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs bg-slate-500/20 flex-shrink-0"
                                                  >
                                                    #{player.rank}
                                                  </Badge>
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs">
                                                  <span className="text-slate-400">
                                                    {player.team}
                                                  </span>
                                                  <span className="text-slate-500">•</span>
                                                  <div className="flex items-center space-x-1">
                                                    {isHome ? (
                                                      <>
                                                        <span className="text-green-400">vs</span>
                                                        <TeamLogo team={opponentTeam} size={16} />
                                                        <span className="text-slate-300">
                                                          {opponentTeam}
                                                        </span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <span className="text-blue-400">@</span>
                                                        <TeamLogo team={opponentTeam} size={16} />
                                                        <span className="text-slate-300">
                                                          {opponentTeam}
                                                        </span>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Matchup Rating */}
                                            <div className="flex-shrink-0">
                                              <Badge
                                                className={`${ratingColor} border font-mono text-xs px-2 py-1`}
                                              >
                                                {matchupRating}
                                              </Badge>
                                            </div>
                                          </div>

                                          {/* Position-specific advice */}
                                          {idx === 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-500">
                                              <div className="flex items-start space-x-2">
                                                <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-slate-300">
                                                  <span className="text-green-400 font-semibold">
                                                    START:
                                                  </span>{' '}
                                                  Top ranked {position} on your roster
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            )
                          })}

                          <div className="mt-4 p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-slate-300">
                                <p className="font-semibold text-blue-400 mb-1">PRO TIP:</p>
                                <p>
                                  Green matchups (vs) indicate home games. Blue matchups (@) are
                                  away games. Elite/Great ratings suggest strong start candidates.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Key Players Matchup */}
                      <Card className="bg-slate-700 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-purple-400 text-sm">
                            KEY PLAYERS MATCHUP
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Your Best Players */}
                            <div>
                              <h4 className="text-yellow-400 font-mono text-xs mb-3">
                                {selectedTeam.teamName}
                              </h4>
                              <div className="space-y-2">
                                {selectedTeam.players.slice(0, 5).map((player, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-2 bg-slate-600 rounded"
                                  >
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <TeamLogo team={player.team} size={24} />
                                      <div className="min-w-0">
                                        <div className="text-slate-100 text-sm font-semibold truncate">
                                          {player.playerName}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                          {player.position} • {player.team}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs bg-slate-500/20">
                                      #{player.rank}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Opponent's Best Players */}
                            <div>
                              <h4 className="text-blue-400 font-mono text-xs mb-3">
                                {opponent.teamName}
                              </h4>
                              <div className="space-y-2">
                                {opponent.players.slice(0, 5).map((player, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-2 bg-slate-600 rounded"
                                  >
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <TeamLogo team={player.team} size={24} />
                                      <div className="min-w-0">
                                        <div className="text-slate-100 text-sm font-semibold truncate">
                                          {player.playerName}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                          {player.position} • {player.team}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs bg-slate-500/20">
                                      #{player.rank}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )
                })()}
              </div>

              {/* League Standings */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-purple-400 font-mono text-lg">
                    LEAGUE STANDINGS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sortedTeams.slice(0, 10).map((team, idx) => {
                      const rank = idx + 1
                      const isCurrentTeam = team.rosterId === selectedTeam.rosterId
                      return (
                        <div
                          key={team.rosterId}
                          className={`p-3 rounded-lg border transition-all ${
                            isCurrentTeam
                              ? 'bg-yellow-400/10 border-yellow-400/30 ring-2 ring-yellow-400/20'
                              : 'bg-slate-800 border-slate-600 hover:bg-slate-750'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`text-xl font-bold ${
                                  rank === 1
                                    ? 'text-yellow-400'
                                    : rank === 2
                                      ? 'text-slate-300'
                                      : rank === 3
                                        ? 'text-orange-400'
                                        : 'text-slate-400'
                                }`}
                              >
                                #{rank}
                              </div>
                              <div>
                                <div
                                  className={`font-semibold ${isCurrentTeam ? 'text-yellow-400' : 'text-slate-100'}`}
                                >
                                  {team.teamName}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {team.wins}-{team.losses} • {team.pointsFor.toFixed(1)} PF
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-bold ${
                                  team.gradeScore >= 70
                                    ? 'text-green-400'
                                    : team.gradeScore >= 50
                                      ? 'text-blue-400'
                                      : team.gradeScore >= 30
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                                }`}
                              >
                                {team.grade}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* League Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-green-400 text-sm">LEAGUE LEADERS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-slate-400">Most Points</div>
                      <div className="font-semibold text-slate-100">
                        {sortedTeams[0]?.teamName} ({sortedTeams[0]?.pointsFor.toFixed(1)})
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Best Record</div>
                      <div className="font-semibold text-slate-100">
                        {sortedTeams.sort((a, b) => b.wins - a.wins)[0]?.teamName} (
                        {sortedTeams.sort((a, b) => b.wins - a.wins)[0]?.wins}-
                        {sortedTeams.sort((a, b) => b.wins - a.wins)[0]?.losses})
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Highest Graded</div>
                      <div className="font-semibold text-slate-100">
                        {sortedTeams.sort((a, b) => b.gradeScore - a.gradeScore)[0]?.teamName} (
                        {sortedTeams.sort((a, b) => b.gradeScore - a.gradeScore)[0]?.grade})
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-blue-400 text-sm">YOUR RANK</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-slate-400">Overall</div>
                      <div className="font-semibold text-slate-100">
                        #{sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1} of{' '}
                        {teams.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Points Rank</div>
                      <div className="font-semibold text-slate-100">
                        #
                        {sortedTeams
                          .sort((a, b) => b.pointsFor - a.pointsFor)
                          .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Grade Rank</div>
                      <div className="font-semibold text-slate-100">
                        #
                        {sortedTeams
                          .sort((a, b) => b.gradeScore - a.gradeScore)
                          .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-orange-400 text-sm">LEAGUE AVG</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-slate-400">Avg Points</div>
                      <div className="font-semibold text-slate-100">
                        {(teams.reduce((sum, t) => sum + t.pointsFor, 0) / teams.length).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg Wins</div>
                      <div className="font-semibold text-slate-100">
                        {(teams.reduce((sum, t) => sum + t.wins, 0) / teams.length).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg Grade</div>
                      <div className="font-semibold text-slate-100">
                        {(() => {
                          const avgScore =
                            teams.reduce((sum, t) => sum + t.gradeScore, 0) / teams.length
                          return avgScore >= 90
                            ? 'A'
                            : avgScore >= 80
                              ? 'B+'
                              : avgScore >= 70
                                ? 'B'
                                : avgScore >= 60
                                  ? 'C+'
                                  : avgScore >= 50
                                    ? 'C'
                                    : 'D'
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Team Rankings */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="relative">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-t-xl"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] rounded-t-xl"></div>

                  <CardTitle className="relative text-yellow-400 font-mono flex items-center space-x-3">
                    <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <span className="text-xl">TEAM RANKINGS</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Comprehensive Team Rankings - Responsive Layout */}
                  <div className="mb-6">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-600">
                                <th className="text-left p-3 text-slate-200 font-mono text-sm min-w-[200px]">
                                  Team
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[120px]">
                                  Contender Tier
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[100px]">
                                  Starter Rank
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                                  QB
                                  <br />
                                  Rank
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                                  RB
                                  <br />
                                  Rank
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                                  WR
                                  <br />
                                  Rank
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                                  TE
                                  <br />
                                  Rank
                                </th>
                                <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">
                                  FLEX
                                  <br />
                                  Rank
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedTeams
                                .filter((team) => team && team.rosterId)
                                .map((team, index) => {
                                  try {
                                    const contenderTier = getContenderTier(
                                      team.grade || 'F',
                                      index + 1
                                    )
                                    const teamRankings = leaguePositionRankings[team.rosterId] || {}
                                    const qbRank = teamRankings['QB'] || 12
                                    const rbRank = teamRankings['RB'] || 12
                                    const wrRank = teamRankings['WR'] || 12
                                    const teRank = teamRankings['TE'] || 12
                                    const flexRank = teamRankings['FLEX'] || 12

                                    return (
                                      <tr
                                        key={team.rosterId}
                                        className={`border-t border-slate-600 hover:bg-slate-600/50 cursor-pointer transition-all ${
                                          selectedTeam?.rosterId === team.rosterId
                                            ? 'bg-yellow-400/10 border-yellow-400'
                                            : ''
                                        }`}
                                        onClick={() => handleTeamSelect(team)}
                                      >
                                        <td className="p-3">
                                          <div className="flex items-center space-x-3">
                                            <UserAvatar
                                              avatarId={team.ownerAvatar}
                                              displayName={team.ownerName}
                                              username={team.ownerUsername}
                                              size={32}
                                              className="flex-shrink-0"
                                            />
                                            <div className="min-w-0">
                                              <div className="font-semibold text-slate-100 truncate">
                                                {team.teamName}
                                              </div>
                                              <div className="text-xs text-gray-400 truncate">
                                                {team.ownerName}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getTierColor(contenderTier)} font-mono text-xs px-3 py-1 border`}
                                          >
                                            {contenderTier}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(index + 1)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {index + 1}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(qbRank)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {qbRank}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(rbRank)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {rbRank}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(wrRank)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {wrRank}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(teRank)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {teRank}
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge
                                            variant="outline"
                                            className={`${getRankColor(flexRank)} font-mono text-sm px-2 py-1 border`}
                                          >
                                            {flexRank}
                                          </Badge>
                                        </td>
                                      </tr>
                                    )
                                  } catch (error) {
                                    console.error('Error rendering team row:', error, team)
                                    return null
                                  }
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                      {sortedTeams
                        .filter((team) => team && team.rosterId)
                        .map((team, index) => {
                          try {
                            const contenderTier = getContenderTier(team.grade || 'F', index + 1)
                            const teamRankings = leaguePositionRankings[team.rosterId] || {}
                            const qbRank = teamRankings['QB'] || 12
                            const rbRank = teamRankings['RB'] || 12
                            const wrRank = teamRankings['WR'] || 12
                            const teRank = teamRankings['TE'] || 12
                            const flexRank = teamRankings['FLEX'] || 12

                            return (
                              <Card
                                key={team.rosterId}
                                className={`bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 cursor-pointer transition-all duration-200 ${
                                  selectedTeam?.rosterId === team.rosterId
                                    ? 'ring-2 ring-yellow-400/50 border-yellow-400/50'
                                    : ''
                                }`}
                                onClick={() => handleTeamSelect(team)}
                              >
                                <CardContent className="p-4">
                                  {/* Team Header */}
                                  <div className="flex items-center justify-between mb-3 gap-2">
                                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(index + 1)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}
                                      >
                                        #{index + 1}
                                      </Badge>
                                      <UserAvatar
                                        avatarId={team.ownerAvatar}
                                        displayName={team.ownerName}
                                        username={team.ownerUsername}
                                        size={28}
                                        className="flex-shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-100 text-xs truncate">
                                          {team.teamName.length > 18
                                            ? team.teamName.substring(0, 15) + '...'
                                            : team.teamName}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">
                                          {team.ownerName.length > 12
                                            ? team.ownerName.substring(0, 9) + '...'
                                            : team.ownerName}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`${getTierColor(contenderTier)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}
                                    >
                                      {contenderTier}
                                    </Badge>
                                  </div>

                                  {/* Position Rankings Grid */}
                                  <div className="grid grid-cols-5 gap-2">
                                    <div className="text-center">
                                      <div className="text-xs text-slate-400 font-mono mb-1">
                                        QB
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(qbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
                                      >
                                        {qbRank}
                                      </Badge>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-slate-400 font-mono mb-1">
                                        RB
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(rbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
                                      >
                                        {rbRank}
                                      </Badge>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-slate-400 font-mono mb-1">
                                        WR
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(wrRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
                                      >
                                        {wrRank}
                                      </Badge>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-slate-400 font-mono mb-1">
                                        TE
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(teRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
                                      >
                                        {teRank}
                                      </Badge>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-slate-400 font-mono mb-1">
                                        FLEX
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${getRankColor(flexRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
                                      >
                                        {flexRank}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          } catch (error) {
                            console.error('Error rendering team row:', error, team)
                            return null
                          }
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
