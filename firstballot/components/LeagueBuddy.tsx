"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TeamLogo } from "@/components/team-logo"
import { UserAvatar } from "@/components/user-avatar"
import { BarChart3, TrendingUp, Users, Trophy, Target, Zap, Calendar, Award, Loader2, AlertCircle, TrendingDown, ArrowUp, ArrowDown, Minus, ArrowLeft, ArrowRight, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { leagueCache } from '@/lib/league-cache'
import { sleeperApi } from '@/lib/nextjs-cache'


// Enhanced TypeScript interfaces for better type safety
interface LeagueBuddyProps {
  leagueId: string
  user?: any
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
}

interface LeagueOverview {
  totalTeams: number
  currentWeek: number
  seasonType: string
  averagePointsPerTeam: number
  highestScoringTeam: string
  lowestScoringTeam: string
  trendingPlayers: TrendingPlayer[]
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

interface Transaction {
  transactionId: string
  type: 'trade' | 'free_agent' | 'waiver'
  status: string
  week: number
  rosterIds: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draftPicks: any[]
  waiverBudget: any[]
  creator: string
  created: number
  consenterIds: number[]
  metadata: any
}

// Constants for better maintainability
const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  'B': 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'D': 'bg-red-400/20 text-red-400 border-red-400',
  'F': 'bg-red-400/20 text-red-400 border-red-400',
} as const

const POSITION_COLORS = {
  'QB': 'bg-blue-500',
  'RB': 'bg-green-500',
  'WR': 'bg-yellow-500',
  'TE': 'bg-purple-500',
  'K': 'bg-pink-500',
  'DEF': 'bg-gray-500',
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

  const tier1Count = players.filter(p => p.tier === 'Tier 1').length
  const tier2Count = players.filter(p => p.tier === 'Tier 2').length
  const avgRank = players.reduce((sum, p) => sum + (p.rank || 999) / players.length, 0)
  const youngPlayers = players.filter(p => p.age && p.age <= 25).length
  const experiencedPlayers = players.filter(p => p.experience && p.experience >= 3).length

  let score = 0
  score += tier1Count * 15
  score += tier2Count * 10
  score += Math.max(0, 100 - avgRank)
  score += youngPlayers * 2
  score += experiencedPlayers * 1

  return Math.max(0, score) // Ensure non-negative score
}

const calculateGradeFromPercentile = (score: number, allScores: number[]): { letter: string, score: number } => {
  if (!allScores || allScores.length === 0) return { letter: 'F', score: 0 }

  const sortedScores = [...allScores].sort((a, b) => b - a)
  const scoreIndex = sortedScores.findIndex(s => s <= score)
  const percentile = scoreIndex === -1 ? 100 : ((sortedScores.length - scoreIndex) / sortedScores.length) * 100
  
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
      status: 'Inactive'
    }
    return {
      recentForm: 'N/A',
      winStreak: 0,
      avgPointsLast4: 0,
      bestPlayer: emptyPlayer,
      breakoutCandidate: emptyPlayer,
      sleeperPick: emptyPlayer
    }
  }

  const sortedByRank = [...players].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  const youngPlayers = players.filter(p => p.age && p.age <= 23)
  const breakoutCandidates = youngPlayers.filter(p => (p.rank || 999) <= 10).sort((a, b) => (a.rank || 999) - (b.rank || 999))

  return {
    recentForm: 'Hot', // Placeholder
    winStreak: 3, // Placeholder
    avgPointsLast4: 125.5, // Placeholder
    bestPlayer: sortedByRank[0] || players[0],
    breakoutCandidate: breakoutCandidates[0] || players[0],
    sleeperPick: players.find(p => (p.rank || 999) > 10 && p.age <= 25) || players[0]
  }
}

const calculatePositionStrengths = (players: PlayerData[]): PositionStrengths => {
  const positionCounts: PositionStrengths = {
    QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SFLX: 0
  };

  if (players && players.length > 0) {
    players.forEach(player => {
      const position = player.position?.toUpperCase()
      if (position === 'QB') positionCounts.QB++;
      else if (position === 'RB') positionCounts.RB++;
      else if (position === 'WR') positionCounts.WR++;
      else if (position === 'TE') positionCounts.TE++;
      else if (position === 'FLEX') positionCounts.FLEX++;
      else if (position === 'SFLX' || position === 'SUPER_FLEX') positionCounts.SFLX++;
      // Handle any other positions by adding to FLEX
      else {
        positionCounts.FLEX++;
      }
    });
  }

  return positionCounts;
}

const calculateRecentForm = (roster: any, matchups: any[]): string => {
  if (!matchups || matchups.length === 0) return 'N/A';
  
  const rosterMatchups = matchups.filter((m: any) => m.roster_id === roster.roster_id);
  if (rosterMatchups.length === 0) return 'N/A';

  let wins = 0;
  let losses = 0;
  let ties = 0;

  rosterMatchups.forEach((matchup: any) => {
    const opponentMatchup = matchups.find((m: any) => 
      m.matchup_id === matchup.matchup_id && m.roster_id !== roster.roster_id
    );
    
    if (opponentMatchup) {
      const teamPoints = matchup.points || 0;
      const opponentPoints = opponentMatchup.points || 0;
      
      if (teamPoints > opponentPoints) wins++;
      else if (teamPoints < opponentPoints) losses++;
      else ties++;
    }
  });

  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 'N/A';

  const winRate = (wins / totalGames) * 100;
  if (winRate >= 70) return 'Hot';
  if (winRate >= 50) return 'Neutral';
  if (winRate >= 30) return 'Cold';
  return 'Very Cold';
}

export default function LeagueBuddy({ leagueId, user }: LeagueBuddyProps) {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'teams' | 'trends' | 'players' | 'transactions'>('overview')
  const [leagueOverview, setLeagueOverview] = useState<LeagueOverview | null>(null)
  const [currentMatchups, setCurrentMatchups] = useState<MatchupData[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showTransactionsSidebar, setShowTransactionsSidebar] = useState(false)
  const [allPlayers, setAllPlayers] = useState<Record<string, any>>({})
  const [playerRankings, setPlayerRankings] = useState<Record<string, any>>({})
  const [mobileTeamIndex, setMobileTeamIndex] = useState(0)
  const [mobileTrendingIndex, setMobileTrendingIndex] = useState(0)
  const [teamDisplayIndex, setTeamDisplayIndex] = useState(0)
  const [sortBy, setSortBy] = useState<'gradeScore' | 'pointsFor' | 'wins'>("gradeScore")

  // Memoized sorted teams to prevent unnecessary re-sorting
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      // Sort by wins first, then by points
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
  }, [teams])

  // Memoized event handlers to prevent unnecessary re-renders
  const handleTeamSelect = useCallback((team: TeamData) => {
    setSelectedTeam(team)
  }, [])

  const handleTransactionsToggle = useCallback(() => {
    setShowTransactionsSidebar(prev => !prev)
  }, [])

  const handleMobileTeamNavigation = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setMobileTeamIndex(prev => prev > 0 ? prev - 1 : teams.length - 1)
    } else {
      setMobileTeamIndex(prev => prev < teams.length - 1 ? prev + 1 : 0)
    }
  }, [teams.length])

  const handleMobileTeamSelect = useCallback((team: TeamData) => {
    setSelectedTeam(team)
    // Auto-scroll to the selected team card
    const teamIndex = teams.findIndex(t => t.rosterId === team.rosterId)
    setMobileTeamIndex(teamIndex)
  }, [teams])

  const handleMobileTrendingNavigation = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setMobileTrendingIndex(prev => prev > 0 ? prev - 1 : (leagueOverview?.trendingPlayers.length || 6) - 1)
    } else {
      setMobileTrendingIndex(prev => prev < (leagueOverview?.trendingPlayers.length || 6) - 1 ? prev + 1 : 0)
    }
  }, [leagueOverview?.trendingPlayers.length])

  const handleTeamDisplayNavigation = useCallback((direction: 'prev' | 'next') => {
    const maxIndex = Math.max(0, Math.ceil(sortedTeams.length / 4) - 1)
    if (direction === 'prev') {
      setTeamDisplayIndex(prev => prev > 0 ? prev - 1 : maxIndex)
    } else {
      setTeamDisplayIndex(prev => prev < maxIndex ? prev + 1 : 0)
    }
  }, [sortedTeams.length])

  const handleTradeMarketClick = useCallback(() => {
    router.push(`/trade-market?leagueId=${leagueId}`)
  }, [router, leagueId])

  const handleDraftBuddyClick = useCallback(() => {
    router.push(`/draft-buddy?leagueId=${leagueId}`)
  }, [router, leagueId])

  const handleScoutingPortalClick = useCallback(() => {
    router.push(`/scouting-portal?leagueId=${leagueId}`)
  }, [router, leagueId])

  // Optimized data fetching with better error handling
  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      setError(null)
      
      // Cache the league ID for other components to use
      leagueCache.setLeagueId(leagueId)

      // Fetch NFL state to get current week using Next.js caching
      const nflState = await sleeperApi.getNflState() as any
      const week = nflState.week || 1
      setCurrentWeek(week)

      // Fetch all data in parallel with Next.js caching
      const [rosters, users, allPlayers, league, matchups, transactionsResponse, rankingsResponse] = await Promise.all([
        sleeperApi.getLeagueRosters(leagueId),
        sleeperApi.getLeagueUsers(leagueId),
        sleeperApi.getAllPlayers(),
        sleeperApi.getLeagueInfo(leagueId),
        sleeperApi.getLeagueMatchups(leagueId, week).catch(() => []),
        sleeperApi.getTransactions(leagueId, week).catch(() => []),
        fetch('/api/rankings').then(res => res.ok ? res.json() : []).catch(() => [])
      ]) as [any[], any[], Record<string, any>, any, any[], any[], any[]]

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
              tier: player.RK <= 12 ? 1 : player.RK <= 36 ? 2 : player.RK <= 72 ? 3 : player.RK <= 120 ? 4 : 5
            }
          }
          return acc
        }, {})
      }

      setAllPlayers(allPlayers)

      // Process transactions with validation
      const processedTransactions: Transaction[] = (transactionsResponse || []).map((tx: any) => ({
        transactionId: tx.transaction_id || '',
        type: tx.type || 'free_agent',
        status: tx.status || 'complete',
        week: tx.leg || week,
        rosterIds: tx.roster_ids || [],
        adds: tx.adds || null,
        drops: tx.drops || null,
        draftPicks: tx.draft_picks || [],
        waiverBudget: tx.waiver_budget || [],
        creator: tx.creator || '',
        created: tx.created || Date.now(),
        consenterIds: tx.consenter_ids || [],
        metadata: tx.metadata || {}
      }))

      setTransactions(processedTransactions)

      // Process trending players with Next.js caching
      const trending = await sleeperApi.getTrendingPlayers().catch(() => [])
      
      const trendingPlayers: TrendingPlayer[] = Array.isArray(trending) ? trending.map((item: any) => {
        const player = allPlayers[item.player_id]
        return {
          playerId: item.player_id || '',
          playerName: player ? `${player.first_name} ${player.last_name}` : 'Unknown Player',
          position: player?.position || 'N/A',
          team: player?.team || 'N/A',
          addCount: item.count || 0,
          dropCount: 0,
          netChange: item.count || 0,
          espn_id: player?.espn_id
        }
      }).filter((player: TrendingPlayer) => player.playerName !== 'Unknown Player') : []

      // Process matchups with deduplication
      const matchupData: MatchupData[] = []
      const matchupMap = new Map()
      
      if (matchups && matchups.length > 0) {
        matchups.forEach((matchup: any) => {
          const key = `${matchup.roster_id}-${matchup.opponent}`
          if (!matchupMap.has(key)) {
            matchupMap.set(key, true)
            matchupData.push({
              rosterId: matchup.roster_id,
              teamName: '', // Will be filled later
              projectedPoints: matchup.points || 0,
              actualPoints: matchup.points || 0,
              opponentRosterId: matchup.opponent,
              opponentTeamName: '', // Will be filled later
              opponentProjectedPoints: matchup.opponent_points || 0,
              opponentActualPoints: matchup.opponent_points || 0,
              isHome: false
            })
          }
        })
      }

      // Calculate league overview stats
      const totalPoints = validRosters.reduce((sum: number, roster: any) => sum + (roster.settings?.fpts || 0), 0)
      const avgPoints = totalPoints / validRosters.length
      const highestScoring = validRosters.reduce((highest: any, roster: any) => 
        (roster.settings?.fpts || 0) > (highest?.settings?.fpts || 0) ? roster : highest, null)
      const lowestScoring = validRosters.reduce((lowest: any, roster: any) => 
        (roster.settings?.fpts || 0) < (lowest?.settings?.fpts || 0) ? roster : lowest, validRosters[0])

      const highestOwner = highestScoring ? validUsers.find((u: any) => u.user_id === highestScoring.owner_id) : null
      const lowestOwner = lowestScoring ? validUsers.find((u: any) => u.user_id === lowestScoring.owner_id) : null

      setLeagueOverview({
        totalTeams: rosters.length,
        currentWeek: week,
        seasonType: nflState.season_type || 'regular',
        averagePointsPerTeam: Math.round(avgPoints),
        highestScoringTeam: highestOwner?.metadata?.team_name || highestOwner?.display_name || highestOwner?.first_name || `Team ${highestScoring?.roster_id || 'Unknown'}`,
        lowestScoringTeam: lowestOwner?.metadata?.team_name || lowestOwner?.display_name || lowestOwner?.first_name || `Team ${lowestScoring?.roster_id || 'Unknown'}`,
        trendingPlayers
      })

      // Process teams data with validation
      const teamsData: (TeamData | null)[] = rosters.map((roster: any) => {
        // Add null checks for roster data
        if (!roster || !roster.roster_id) {
          return null
        }
        
        const owner = roster.owner_id ? validUsers.find((u: any) => u?.user_id === roster.owner_id) : null
        const teamName = owner?.metadata?.team_name || owner?.display_name || owner?.first_name || `Team ${roster.roster_id}`
        
        const players = (roster.players || []).map((playerId: string) => {
          const player = allPlayers[playerId]
          if (!player) {
            return null
          }
          
          const playerName = `${player.first_name} ${player.last_name}`
          const ranking = playerRankings[playerName]
          
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
            rankingData: ranking
          }
        }).filter(Boolean) as PlayerData[]

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
          trends,
          positionStrengths,
          currentWeekProjection,
          waiverPosition: roster.settings?.waiver_position || 0,
          totalMoves: roster.settings?.total_moves || 0,
          recentForm
        }
      })

      const validTeamsData = teamsData.filter(Boolean) as TeamData[]
      
      const allScores = validTeamsData.map(team => team.gradeScore)
      validTeamsData.forEach(team => {
        const gradeResult = calculateGradeFromPercentile(team.gradeScore, allScores)
        team.grade = gradeResult.letter
      })
      
      setTeams(validTeamsData)
      setSelectedTeam(validTeamsData[0] || null)

    } catch (err) {
      console.error('Error fetching league data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load league data')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchLeagueData()
  }, [fetchLeagueData])

  // Auto-select team on mobile navigation
  useEffect(() => {
    if (teams.length > 0 && mobileTeamIndex >= 0 && mobileTeamIndex < teams.length) {
      const selectedTeam = teams[mobileTeamIndex]
      setSelectedTeam(selectedTeam)
    }
  }, [mobileTeamIndex, teams])

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-green-400 font-mono">LOADING LEAGUE DATA...</p>
          </div>
        </CardContent>
      </Card>
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
  const teamsWithPlayers = teams.filter(team => team.players.length > 0)
  if (teams.length > 0 && teamsWithPlayers.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
            <p className="text-yellow-400 font-mono text-lg mb-2">PRE-SEASON LEAGUE</p>
            <p className="text-slate-300 mb-4">
              This league appears to be in pre-season mode. Team data will be available once the draft is completed and the season begins.
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
    <div className="flex flex-col space-y-6">
      {/* Transactions Header */}
      <Card className="bg-slate-800 border-slate-700 w-full mb-6">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>TRANSACTIONS</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Week {currentWeek} Transactions</h3>
            <div className="flex items-center space-x-3">
              <button 
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 hover:text-yellow-300 font-mono text-sm px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                onClick={handleTradeMarketClick}
              >
                <span className="font-semibold">Trade Market</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 hover:text-yellow-300 font-mono text-sm px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                onClick={handleDraftBuddyClick}
              >
                <span className="font-semibold">Draft Buddy</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* <button 
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 hover:text-yellow-300 font-mono text-sm px-3 py-2 rounded-lg border border-slate-600 hover:border-yellow-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                onClick={handleScoutingPortalClick}
              >
                <span className="font-semibold">Scouting Portal</span>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button> */}
            </div>
          </div>
          
          <div className="flex flex-row gap-3 overflow-x-auto pb-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 min-w-[250px]">
                <Zap className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No transactions this week</p>
              </div>
            ) : (
              transactions.map((tx, index) => {
                // Get team names for the transaction
                const teamNames = tx.rosterIds.map(rosterId => {
                  const team = teams.find(t => t.rosterId === rosterId)
                  return team?.teamName || `Team ${rosterId}`
                }).join(' & ')

                // Get player names for adds and drops
                const addedPlayers = tx.adds ? Object.keys(tx.adds).map(playerId => {
                  const player = allPlayers[playerId]
                  return player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`
                }) : []
                
                const droppedPlayers = tx.drops ? Object.keys(tx.drops).map(playerId => {
                  const player = allPlayers[playerId]
                  return player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`
                }) : []

                return (
                  <div 
                    key={tx.transactionId} 
                    className="bg-slate-700 border-slate-600 p-3 rounded-lg min-w-[260px] max-w-xs flex-shrink-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={`text-xs px-2 py-1 ${
                        tx.type === 'trade' ? 'bg-blue-400/20 text-blue-400 border-blue-400' :
                        tx.type === 'waiver' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400' :
                        'bg-green-400/20 text-green-400 border-green-400'
                      }`}>
                        {tx.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-400">Week {tx.week}</span>
                    </div>
                    
                    <div className="text-sm text-slate-100 mb-2">
                      <span className="font-semibold">{teamNames}</span>
                    </div>

                    {tx.type === 'trade' && (
                      <div className=" text-slate-300  space-y-1">
                        {addedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-green-400">Added:</span> <span className="text-gray-300">{addedPlayers.join(', ')}</span>
                          </div>
                        )}
                        {droppedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-red-400">Dropped:</span> <span className="text-gray-300">{droppedPlayers.join(', ')}</span>
                          </div>
                        )}
                        {tx.draftPicks.length > 0 && (
                          <div className="text-xs">
                            <span className="text-blue-400 italic">Draft Picks:</span> {tx.draftPicks.length} picks traded
                          </div>
                        )}
                      </div>
                    )}

                    {tx.type === 'free_agent' && (
                      <div className="space-y-1">
                        {addedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-green-400">Signed:</span> <span className="text-gray-300">{addedPlayers.join(', ')}</span>
                          </div>
                        )}
                        {droppedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-red-400">Dropped:</span> <span className="text-gray-300">{droppedPlayers.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {tx.type === 'waiver' && (
                      <div className="space-y-1">
                        {addedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-yellow-400">Claimed:</span> <span className="text-gray-300">{addedPlayers.join(', ')}</span>
                          </div>
                        )}
                        {droppedPlayers.length > 0 && (
                          <div className="text-xs">
                            <span className="text-red-400">Dropped:</span> <span className="text-gray-300">{droppedPlayers.join(', ')}</span>
                          </div>
                        )}
                        {tx.waiverBudget.length > 0 && (
                          <div className="text-xs">
                            <span className="text-purple-400">FAAB:</span> ${tx.waiverBudget[0]?.amount || 0}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-slate-600">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(tx.created).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className={`text-xs px-1 py-0 ${
                        tx.status === 'complete' ? 'bg-green-400/20 text-green-400 border-green-400' :
                        tx.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400' :
                        'bg-red-400/20 text-red-400 border-red-400'
                      }`}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>



      {/* Main Content */}
      <div className="flex-1 space-y-6">
       

        {/* League Overview Dashboard */}
        {leagueOverview && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>LEAGUE OVERVIEW</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Standings</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{leagueOverview.totalTeams} Teams</div>
                    <div className="text-xs text-gray-400">Week {leagueOverview.currentWeek}</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-gray-400">Avg. Points</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{leagueOverview.averagePointsPerTeam}</div>
                    <div className="text-xs text-gray-400">Per Team</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-gray-400">Highest Scoring</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-100 truncate">{leagueOverview.highestScoringTeam}</div>
                    <div className="text-xs text-gray-400">Top Team</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-gray-400">Lowest Scoring</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-100 truncate">{leagueOverview.lowestScoringTeam}</div>
                    <div className="text-xs text-gray-400">Bottom Team</div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Week Matchups */}
              {currentMatchups.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <span>Week {currentWeek} Matchups</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentMatchups.slice(0, 4).map((matchup, index) => (
                      <Card key={index} className="bg-slate-700 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-slate-100 truncate">{matchup.teamName}</div>
                              <div className="text-sm text-gray-400">
                                {matchup.actualPoints > 0 ? `${matchup.actualPoints.toFixed(1)} pts` : 'No score yet'}
                              </div>
                            </div>
                            <div className="mx-2 sm:mx-4 text-gray-500 text-center flex-shrink-0">vs</div>
                            <div className="flex-1 text-right">
                              <div className="font-semibold text-slate-100 truncate text-right">{matchup.opponentTeamName}</div>
                              <div className="text-sm text-gray-400 text-right">
                                {matchup.opponentActualPoints > 0 ? `${matchup.opponentActualPoints.toFixed(1)} pts` : 'No score yet'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <span>Week {currentWeek} Matchups</span>
                  </h3>
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="p-6 text-center">
                      <div className="text-gray-400">
                        {currentWeek === 1 ? (
                          <p>Season hasn't started yet. Matchups will appear here once games begin.</p>
                        ) : (
                          <p>No matchups found for Week {currentWeek}. This could be a bye week or the season hasn't started.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Trending Players */}
              {leagueOverview.trendingPlayers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <span>Trending Players (24h)</span>
                  </h3>
                  
                  {/* Mobile Single Player Display */}
                  <div className="md:hidden mb-6">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMobileTrendingNavigation('prev')}
                          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-green-400"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-300 font-medium">
                          {mobileTrendingIndex + 1} of {Math.min(leagueOverview.trendingPlayers.length, 6)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMobileTrendingNavigation('next')}
                          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-green-400"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Quick Jump Dots */}
                      <div className="flex items-center space-x-1">
                        {leagueOverview.trendingPlayers.slice(0, 5).map((player, index) => (
                          <button
                            key={player.playerId}
                            onClick={() => setMobileTrendingIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              mobileTrendingIndex === index 
                                ? 'bg-green-400' 
                                : 'bg-slate-600 hover:bg-slate-500'
                            }`}
                          />
                        ))}
                        {leagueOverview.trendingPlayers.length > 5 && (
                          <span className="text-xs text-slate-400 ml-1">+{leagueOverview.trendingPlayers.length - 5}</span>
                        )}
                      </div>
                    </div>

                    {/* Single Player Card */}
                    <div className="w-full">
                      {leagueOverview.trendingPlayers[mobileTrendingIndex] && (
                        <Card className="w-full bg-slate-700 border-slate-600 ring-2 ring-green-400">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <TeamLogo team={leagueOverview.trendingPlayers[mobileTrendingIndex].team} size={48} className="flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-100 truncate text-lg">{leagueOverview.trendingPlayers[mobileTrendingIndex].playerName}</div>
                                <div className="text-sm text-gray-400">{leagueOverview.trendingPlayers[mobileTrendingIndex].position} • {leagueOverview.trendingPlayers[mobileTrendingIndex].team}</div>
                                <div className="text-sm text-green-400 font-semibold">+{leagueOverview.trendingPlayers[mobileTrendingIndex].addCount} adds</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                  
                  {/* Desktop Grid */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {leagueOverview.trendingPlayers.slice(0, 6).map((player, index) => (
                      <Card key={index} className="bg-slate-700 border-slate-600">
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <TeamLogo team={player.team} size={32} className="flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-100 truncate">{player.playerName}</div>
                              <div className="text-xs text-gray-400">{player.position} • {player.team}</div>
                              <div className="text-xs text-green-400">+{player.addCount} adds</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Rankings */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>TEAM RANKINGS</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Sort/Filter Dropdown */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-slate-300 text-sm">Sort by:</span>
              <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectItem value="gradeScore">Grade Score</SelectItem>
                  <SelectItem value="pointsFor">Points For</SelectItem>
                  <SelectItem value="wins">Wins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Enhanced Mobile Team Selector */}
            <div className="md:hidden mb-6">
              {/* Navigation Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMobileTeamNavigation('prev')}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-yellow-400"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-300 font-medium">
                    {sortedTeams.findIndex(t => t.rosterId === selectedTeam?.rosterId) + 1} of {sortedTeams.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMobileTeamNavigation('next')}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-yellow-400"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {/* Quick Jump Selector */}
                <div className="flex items-center space-x-1">
                  {sortedTeams.slice(0, 5).map((team, index) => (
                    <button
                      key={team.rosterId}
                      onClick={() => handleMobileTeamSelect(team)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        selectedTeam?.rosterId === team.rosterId 
                          ? 'bg-yellow-400' 
                          : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                  {sortedTeams.length > 5 && (
                    <span className="text-xs text-slate-400 ml-1">+{sortedTeams.length - 5}</span>
                  )}
                </div>
              </div>
              {/* Single Team Card Display */}
              <div className="relative">
                <div className="w-full">
                  {selectedTeam && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card 
                        className="w-full cursor-pointer transition-all hover:border-yellow-400 hover:bg-slate-700 border-yellow-400 ring-2 ring-yellow-400 bg-slate-700"
                      >
                        <div className="p-4">
                          {/* Team Header */}
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl font-bold text-yellow-400">#{sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</div>
                            <UserAvatar
                              avatarId={selectedTeam.ownerAvatar}
                              displayName={selectedTeam.ownerName}
                              username={selectedTeam.ownerUsername}
                              size={36}
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-slate-100 truncate text-sm">{selectedTeam.teamName}</h3>
                              <p className="text-xs text-gray-400 truncate">{selectedTeam.ownerName}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS] + " text-xs px-2 py-1 border"}>
                            {selectedTeam.grade}
                          </Badge>
                        </div>
                        
                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 mb-3">
                          <div className="flex justify-between">
                            <span>Score:</span>
                            <span className="text-slate-100 font-medium">{selectedTeam.gradeScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Players:</span>
                            <span className="text-slate-100 font-medium">{selectedTeam.players.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Record:</span>
                            <span className="text-slate-100 font-medium">{selectedTeam.wins}-{selectedTeam.losses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points:</span>
                            <span className="text-slate-100 font-medium">{Math.round(selectedTeam.pointsFor)}</span>
                          </div>
                          {selectedTeam.currentWeekProjection !== undefined && (
                            <div className="flex justify-between">
                              <span>Proj:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.currentWeekProjection.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Waiver:</span>
                            <span className="text-slate-100 font-medium">#{selectedTeam.waiverPosition}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Moves:</span>
                            <span className="text-slate-100 font-medium">{selectedTeam.totalMoves}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Form:</span>
                            <div className="flex items-center space-x-1">
                              {selectedTeam.recentForm === 'Hot' && <ArrowUp className="h-2 w-2 text-green-400" />}
                              {selectedTeam.recentForm === 'Cold' && <ArrowDown className="h-2 w-2 text-red-400" />}
                              {selectedTeam.recentForm === 'Neutral' && <Minus className="h-2 w-2 text-yellow-400" />}
                              <span className={`text-xs font-medium ${
                                selectedTeam.recentForm === 'Hot' ? 'text-green-400' :
                                selectedTeam.recentForm === 'Cold' ? 'text-red-400' :
                                selectedTeam.recentForm === 'Neutral' ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {selectedTeam.recentForm}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Position Strengths */}
                        <div className="mb-3 pt-3 border-t border-slate-600">
                          <p className="text-xs text-slate-400 mb-2 font-medium">Position Strengths:</p>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span className="text-slate-300">QB:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.QB}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-slate-300">RB:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.RB}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                              <span className="text-slate-300">WR:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.WR}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                              <span className="text-slate-300">TE:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.TE}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                              <span className="text-slate-300">FLEX:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.FLEX}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                              <span className="text-slate-300">SFLX:</span>
                              <span className="text-slate-100 font-medium">{selectedTeam.positionStrengths.SFLX}</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Players */}
                        <div className="pt-3 border-t border-slate-600">
                          <p className="text-xs text-slate-400 mb-2 font-medium">Top Players:</p>
                          <div className="flex space-x-2">
                            {selectedTeam.players.slice(0, 3).map((player, idx) => (
                              <TeamLogo
                                key={idx}
                                team={player.team}
                                size={24}
                                className="flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
                

              </div>
            </div>

            {/* Desktop Team Grid - 1x4 Layout with Navigation */}
            <div className="hidden md:block">
              {/* Navigation Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTeamDisplayNavigation('prev')}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-yellow-400"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-300 font-medium">
                    Teams {teamDisplayIndex * 4 + 1}-{Math.min((teamDisplayIndex + 1) * 4, sortedTeams.length)} of {sortedTeams.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTeamDisplayNavigation('next')}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-yellow-400"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Page Indicators */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.ceil(sortedTeams.length / 4) }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setTeamDisplayIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        teamDisplayIndex === index 
                          ? 'bg-yellow-400' 
                          : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 1x4 Team Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {sortedTeams.slice(teamDisplayIndex * 4, (teamDisplayIndex + 1) * 4).map((team, index) => {
                  const actualIndex = teamDisplayIndex * 4 + index
                  return (
                    <motion.div
                      key={team.rosterId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <Card 
                        className={`p-4 cursor-pointer transition-all hover:border-yellow-400 hover:bg-slate-700 ${
                          selectedTeam?.rosterId === team.rosterId ? 'border-yellow-400 ring-2 ring-yellow-400 bg-slate-700' : 'bg-slate-800 border-slate-700'
                        }`}
                        onClick={() => handleTeamSelect(team)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl font-bold text-yellow-400">#{actualIndex + 1}</div>
                            <UserAvatar
                              avatarId={team.ownerAvatar}
                              displayName={team.ownerName}
                              username={team.ownerUsername}
                              size={40}
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-slate-100 truncate">{team.teamName}</h3>
                              <p className="text-sm text-gray-400 truncate">{team.ownerName}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={GRADE_COLORS[team.grade as keyof typeof GRADE_COLORS] + " text-sm px-2 py-1 border"}>
                            {team.grade}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-200">
                          <div className="flex justify-between">
                            <span>Grade Score:</span>
                            <span className="text-slate-100">{team.gradeScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Players:</span>
                            <span className="text-slate-100">{team.players.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Record:</span>
                            <span className="text-slate-100">{team.wins}-{team.losses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points For:</span>
                            <span className="text-slate-100">{Math.round(team.pointsFor)}</span>
                          </div>
                          {team.currentWeekProjection !== undefined && (
                            <div className="flex justify-between">
                              <span>Week {currentWeek} Proj:</span>
                              <span className="text-slate-100">{team.currentWeekProjection.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Waiver Pos:</span>
                            <span className="text-slate-100">#{team.waiverPosition}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Moves:</span>
                            <span className="text-slate-100">{team.totalMoves}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Recent Form:</span>
                            <div className="flex items-center space-x-1">
                              {team.recentForm === 'Hot' && <ArrowUp className="h-3 w-3 text-green-400" />}
                              {team.recentForm === 'Cold' && <ArrowDown className="h-3 w-3 text-red-400" />}
                              {team.recentForm === 'Neutral' && <Minus className="h-3 w-3 text-yellow-400" />}
                              <span className={`text-xs ${
                                team.recentForm === 'Hot' ? 'text-green-400' :
                                team.recentForm === 'Cold' ? 'text-red-400' :
                                team.recentForm === 'Neutral' ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {team.recentForm}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Position Strengths */}
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <p className="text-xs text-slate-400 mb-2">Position Strengths:</p>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-slate-300">QB:</span>
                              <span className="text-slate-100">{team.positionStrengths.QB}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-slate-300">RB:</span>
                              <span className="text-slate-100">{team.positionStrengths.RB}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-slate-300">WR:</span>
                              <span className="text-slate-100">{team.positionStrengths.WR}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-slate-300">TE:</span>
                              <span className="text-slate-100">{team.positionStrengths.TE}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              <span className="text-slate-300">FLEX:</span>
                              <span className="text-slate-100">{team.positionStrengths.FLEX}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              <span className="text-slate-300">SFLX:</span>
                              <span className="text-slate-100">{team.positionStrengths.SFLX}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <p className="text-xs text-slate-400 mb-1">Top Players:</p>
                          <div className="flex space-x-1">
                            {team.players.slice(0, 3).map((player, idx) => (
                              <TeamLogo
                                key={idx}
                                team={player.team}
                                size={24}
                                className="flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Team Details */}
        {selectedTeam && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-400/10 rounded-lg border border-blue-400/20">
                  <span className="text-blue-400 font-bold text-lg">{sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</span>
                </div>
                <UserAvatar
                  avatarId={selectedTeam.ownerAvatar}
                  displayName={selectedTeam.ownerName}
                  username={selectedTeam.ownerUsername}
                  size={48}
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-yellow-400 font-mono tracking-wide">{selectedTeam.teamName}</h2>
                  <p className="text-lg font-semibold text-yellow-400 font-mono">DETAILED ANALYSIS</p>
                </div>
                <Badge variant="outline" className={`text-lg px-4 py-2 ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]} border-2`}>
                  {selectedTeam.grade}
                </Badge>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-1">
              <Tabs defaultValue="roster" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-transparent border-0 p-0 h-auto">
                  <TabsTrigger 
                    value="roster" 
                    className="text-slate-200 data-[state=active]:bg-slate-700/80 data-[state=active]:text-yellow-400 font-mono text-sm py-3 rounded-lg transition-all duration-200"
                  >
                    Roster
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trends" 
                    className="text-slate-200 data-[state=active]:bg-slate-700/80 data-[state=active]:text-yellow-400 font-mono text-sm py-3 rounded-lg transition-all duration-200"
                  >
                    Trends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="power" 
                    className="text-slate-200 data-[state=active]:bg-slate-700/80 data-[state=active]:text-yellow-400 font-mono text-sm py-3 rounded-lg transition-all duration-200"
                  >
                    Power Ranking
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="text-slate-200 data-[state=active]:bg-slate-700/80 data-[state=active]:text-yellow-400 font-mono text-sm py-3 rounded-lg transition-all duration-200"
                  >
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="projections" 
                    className="text-slate-200 data-[state=active]:bg-slate-700/80 data-[state=active]:text-yellow-400 font-mono text-sm py-3 rounded-lg transition-all duration-200"
                  >
                    Projections
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="roster" className="space-y-6 pt-6">
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                    <h3 className="text-blue-400 font-mono text-lg mb-4">POSITION STRENGTHS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">QB:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.QB}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">RB:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.RB}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">WR:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.WR}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">TE:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.TE}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">FLEX:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.FLEX}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-slate-300 font-mono">SFLX:</span>
                        <span className="text-slate-100 font-bold">{selectedTeam.positionStrengths.SFLX}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-green-400 font-mono text-lg mb-4">TEAM ROSTER</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedTeam.players.map((player, index) => (
                      <Card key={index} className="p-3 bg-slate-700 border-slate-600">
                        <div className="flex items-center space-x-3">
                          <TeamLogo
                            team={player.team}
                            size={40}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-slate-100 truncate">{player.playerName}</h4>
                              <Badge variant="secondary" className={`text-xs px-1 py-0 ${POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]} text-white`}>
                                {player.position}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{player.team}</span>
                              <span>#{player.rank}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs bg-slate-600/20 text-slate-300 border-slate-600">
                                {player.tier}
                              </Badge>
                              {player.age && (
                                <Badge variant="outline" className="text-xs bg-blue-400/20 text-blue-400 border-blue-400">
                                  {player.age}yo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-700 border-slate-600">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-400 text-sm">BEST PLAYER</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-3">
                          <TeamLogo
                            team={selectedTeam.trends.bestPlayer.team}
                            size={48}
                          />
                          <div>
                            <h4 className="font-semibold text-slate-100">{selectedTeam.trends.bestPlayer.playerName}</h4>
                            <p className="text-sm text-gray-400">#{selectedTeam.trends.bestPlayer.rank} • {selectedTeam.trends.bestPlayer.position}</p>
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
                          <TeamLogo
                            team={selectedTeam.trends.breakoutCandidate.team}
                            size={48}
                          />
                          <div>
                            <h4 className="font-semibold text-slate-100">{selectedTeam.trends.breakoutCandidate.playerName}</h4>
                            <p className="text-sm text-gray-400">#{selectedTeam.trends.breakoutCandidate.rank} • {selectedTeam.trends.breakoutCandidate.position}</p>
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
                          <TeamLogo
                            team={selectedTeam.trends.sleeperPick.team}
                            size={48}
                          />
                          <div>
                            <h4 className="font-semibold text-slate-100">{selectedTeam.trends.sleeperPick.playerName}</h4>
                            <p className="text-sm text-gray-400">#{selectedTeam.trends.sleeperPick.rank} • {selectedTeam.trends.sleeperPick.position}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="power" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Position Strength Radar Chart */}
                    <Card className="bg-slate-700 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-blue-400 text-sm">POSITION STRENGTHS</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative w-full h-64 flex items-center justify-center">
                          {/* Radar Chart Placeholder - You can implement a proper radar chart library here */}
                          <div className="relative w-48 h-48">
                            {/* Center Rank */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-3xl font-bold text-yellow-400">#{sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</div>
                              <div className="absolute -bottom-8 text-sm text-gray-400">Rank</div>
                            </div>
                            
                            {/* Position indicators around the circle */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                              <div className="text-xs text-blue-400">QB: {selectedTeam.positionStrengths.QB}</div>
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                              <div className="text-xs text-green-400">RB: {selectedTeam.positionStrengths.RB}</div>
                            </div>
                            <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
                              <div className="text-xs text-yellow-400">WR: {selectedTeam.positionStrengths.WR}</div>
                            </div>
                            <div className="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2">
                              <div className="text-xs text-purple-400">TE: {selectedTeam.positionStrengths.TE}</div>
                            </div>
                            <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="text-xs text-pink-400">FLEX: {selectedTeam.positionStrengths.FLEX}</div>
                            </div>
                            <div className="absolute top-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2">
                              <div className="text-xs text-gray-400">SFLX: {selectedTeam.positionStrengths.SFLX}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Team Comparison */}
                    <Card className="bg-slate-700 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-green-400 text-sm">LEAGUE COMPARISON</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Grade Rank:</span>
                            <span className="text-slate-100">#{sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1} of {sortedTeams.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Points Rank:</span>
                            <span className="text-slate-100">#{[...sortedTeams].sort((a, b) => b.pointsFor - a.pointsFor).findIndex(t => t.rosterId === selectedTeam.rosterId) + 1} of {sortedTeams.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Avg Points:</span>
                            <span className="text-slate-100">{Math.round(selectedTeam.pointsFor)} ({Math.round(selectedTeam.pointsFor / Math.max(selectedTeam.wins + selectedTeam.losses, 1))} per game)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Win Rate:</span>
                            <span className="text-slate-100">{Math.round((selectedTeam.wins / Math.max(selectedTeam.wins + selectedTeam.losses, 1)) * 100)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Waiver Position:</span>
                            <span className="text-slate-100">#{selectedTeam.waiverPosition}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Total Moves:</span>
                            <span className="text-slate-100">{selectedTeam.totalMoves}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Teams Comparison */}
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-sm">TOP TEAMS COMPARISON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {sortedTeams.slice(0, 3).map((team, index) => (
                          <div key={team.rosterId} className={`p-3 rounded-lg border ${
                            team.rosterId === selectedTeam.rosterId 
                              ? 'bg-yellow-400/10 border-yellow-400' 
                              : 'bg-slate-600 border-slate-500'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                              <Badge variant="outline" className={GRADE_COLORS[team.grade as keyof typeof GRADE_COLORS]}>
                                {team.grade}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 mb-1">
                              <UserAvatar
                                avatarId={team.ownerAvatar}
                                displayName={team.ownerName}
                                username={team.ownerUsername}
                                size={20}
                                className="flex-shrink-0"
                              />
                              <div className="font-semibold text-slate-100 truncate">{team.teamName}</div>
                            </div>
                            <div className="text-sm text-gray-400">{team.ownerName}</div>
                            <div className="text-xs text-slate-300 mt-1">
                              {team.wins}-{team.losses} • {Math.round(team.pointsFor)} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
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
                              {selectedTeam.players.filter(p => p.tier === 'Tier 1').length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Tier 2 Players:</span>
                            <span className="text-blue-400 font-semibold">
                              {selectedTeam.players.filter(p => p.tier === 'Tier 2').length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Tier 3 Players:</span>
                            <span className="text-yellow-400 font-semibold">
                              {selectedTeam.players.filter(p => p.tier === 'Tier 3').length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Young Players (≤25):</span>
                            <span className="text-purple-400 font-semibold">
                              {selectedTeam.players.filter(p => p.age && p.age <= 25).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Avg Player Rank:</span>
                            <span className="text-pink-400 font-semibold">
                              #{Math.round(selectedTeam.players.reduce((sum, p) => sum + (p.rank || 999), 0) / selectedTeam.players.length)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Top 50 Players:</span>
                            <span className="text-green-400 font-semibold">
                              {selectedTeam.players.filter(p => p.rank <= 50).length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Top 100 Players:</span>
                            <span className="text-blue-400 font-semibold">
                              {selectedTeam.players.filter(p => p.rank <= 100).length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-700 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-yellow-400 text-sm">POSITION BREAKDOWN</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(POSITION_COLORS).map(([pos, color]) => {
                            const count = selectedTeam.players.filter(p => p.position === pos).length
                            return (
                              <div key={pos} className="flex justify-between items-center">
                                <span className="text-slate-300">{pos}:</span>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                  <span className="font-semibold text-slate-100">{count}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="projections" className="space-y-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-green-400 text-sm">SEASON PROJECTIONS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {(() => {
                              const totalGames = selectedTeam.wins + selectedTeam.losses
                              const currentWinRate = totalGames > 0 ? selectedTeam.wins / totalGames : 0.5
                              const adjustedWinRate = Math.min(0.85, Math.max(0.15, currentWinRate + (selectedTeam.gradeScore - 50) / 200))
                              const projectedWins = Math.round(adjustedWinRate * 14)
                              const projectedLosses = 14 - projectedWins
                              return `${projectedWins}-${projectedLosses}`
                            })()}
                          </div>
                          <div className="text-sm text-gray-400">Projected Record</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {(() => {
                              const teamRank = sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1
                              const gradeAdjustment = selectedTeam.gradeScore > 70 ? -1 : selectedTeam.gradeScore < 30 ? 1 : 0
                              const projectedRank = Math.max(1, Math.min(teams.length, teamRank + gradeAdjustment))
                              return `${projectedRank}${projectedRank === 1 ? 'st' : projectedRank === 2 ? 'nd' : projectedRank === 3 ? 'rd' : 'th'}`
                            })()}
                          </div>
                          <div className="text-sm text-gray-400">Projected Finish</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {(() => {
                              const totalGames = selectedTeam.wins + selectedTeam.losses
                              const currentAvg = totalGames > 0 ? selectedTeam.pointsFor / totalGames : 120
                              const gradeMultiplier = 0.8 + (selectedTeam.gradeScore / 100) * 0.4
                              const projectedAvg = currentAvg * gradeMultiplier
                              return projectedAvg.toFixed(1)
                            })()}
                          </div>
                          <div className="text-sm text-gray-400">Avg PPG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {(() => {
                              const teamRank = sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1
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
                          </div>
                          <div className="text-sm text-gray-400">Playoff Chance</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 