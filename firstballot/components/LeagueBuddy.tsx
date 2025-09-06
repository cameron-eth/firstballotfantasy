"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TeamLogo } from "@/components/team-logo"
import { UserAvatar } from "@/components/user-avatar"
import { Users, Trophy, Zap, Calendar, Loader2, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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

// Raw Sleeper API matchup structure
interface SleeperMatchup {
  starters: string[]
  roster_id: number
  players: string[]
  matchup_id: number
  points: number
  custom_points: number | null
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

  const [leagueOverview, setLeagueOverview] = useState<LeagueOverview | null>(null)
  const [currentMatchups, setCurrentMatchups] = useState<MatchupData[]>([])
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [allPlayers, setAllPlayers] = useState<Record<string, any>>({})
  const [playerRankings, setPlayerRankings] = useState<Record<string, any>>({})

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
      sortedTeams.forEach(team => {
        if (!team || !team.rosterId || !team.players) return
        
        teamPositionScores[team.rosterId] = {}
        
        positions.forEach(position => {
          const positionPlayers = team.players.filter(p => p && p.position && p.position === position)
          if (positionPlayers.length === 0) {
            teamPositionScores[team.rosterId][position] = 999 // Worst possible score
    } else {
            // Use best player rank for QB, average of top 2 for skill positions
            const sortedRanks = positionPlayers.map(p => p.rank || 999).sort((a, b) => a - b)
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
      allPositions.forEach(position => {
        const teamScores = sortedTeams
          .filter(team => team && team.rosterId && teamPositionScores[team.rosterId])
          .map(team => ({
            rosterId: team.rosterId,
            score: teamPositionScores[team.rosterId][position] || 999
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
    switch(tier) {
      case 'Powerhouse': return 'bg-green-900/80 text-green-200 border-green-700/50'
      case 'Contender': return 'bg-yellow-900/80 text-yellow-200 border-yellow-700/50'
      case 'Pretender': return 'bg-orange-900/80 text-orange-200 border-orange-700/50'
      case 'Rebuilder': return 'bg-red-900/80 text-red-200 border-red-700/50'
      default: return 'bg-gray-900/80 text-gray-200 border-gray-700/50'
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

  const handleDraftBuddyClick = useCallback(() => {
    router.push(`/draft-buddy?leagueId=${leagueId}`)
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
            const team1Owner = validUsers.find((u: any) => validRosters.find((r: any) => r.roster_id === team1.roster_id)?.owner_id === u.user_id)
            const team2Owner = validUsers.find((u: any) => validRosters.find((r: any) => r.roster_id === team2.roster_id)?.owner_id === u.user_id)
            
            const team1Name = team1Owner?.metadata?.team_name || team1Owner?.display_name || `Team ${team1.roster_id}`
            const team2Name = team2Owner?.metadata?.team_name || team2Owner?.display_name || `Team ${team2.roster_id}`
            
            // Add both matchup perspectives with full Sleeper API data
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
              players: team1.players || []
            })
          }
        })
        
        console.log(`✅ Processed ${matchupData.length} matchup pairs:`, matchupData)
      } else {
        console.log(`⚠️ No matchup data found for week ${week}`)
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

      // Set the processed matchup data
      setCurrentMatchups(matchupData)

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
          
          const firstName = player.first_name || ''
          const lastName = player.last_name || ''
          const playerName = `${firstName} ${lastName}`.trim()
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
      {/* Main Content */}
      <div className="flex-1 space-y-6">

        {/* Enhanced League Overview Dashboard */}
        {leagueOverview && (
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-t-xl"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] rounded-t-xl"></div>
              
              <CardTitle className="relative text-yellow-400 font-mono flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <span className="text-xl">LEAGUE OVERVIEW</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button 
                    className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/80 hover:bg-slate-600/80 text-yellow-400 hover:text-yellow-300 font-mono text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 backdrop-blur-sm"
                    onClick={handleTradeMarketClick}
                  >
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-semibold hidden sm:inline">Trade Market</span>
                    <span className="font-semibold sm:hidden">Trade</span>
                    <svg width="12" height="12" className="sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button 
                    className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/80 hover:bg-slate-600/80 text-yellow-400 hover:text-yellow-300 font-mono text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 backdrop-blur-sm"
                    onClick={handleDraftBuddyClick}
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-semibold hidden sm:inline">Draft Buddy</span>
                    <span className="font-semibold sm:hidden">Draft</span>
                    <svg width="12" height="12" className="sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Current Week Matchups */}
              {currentMatchups.length > 0 ? (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center space-x-3">
                    <div className="p-2 bg-blue-400/10 rounded-lg border border-blue-400/20">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <span>Week {currentWeek} Matchups</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {currentMatchups.slice(0, 4).map((matchup, index) => (
                      <Card key={index} className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 hover:border-slate-500 transition-all duration-200">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-semibold text-slate-100 truncate mb-2 text-sm sm:text-base">{matchup.teamName}</div>
                              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                                {matchup.actualPoints > 0 ? `${matchup.actualPoints.toFixed(1)} pts` : 'No score yet'}
                              </div>
                            </div>
                            <div className="mx-4 sm:mx-6 text-slate-400 text-center flex-shrink-0 font-mono font-bold text-sm sm:text-base">VS</div>
                            <div className="flex-1 text-right min-w-0">
                              <div className="font-semibold text-slate-100 truncate text-right mb-2 text-sm sm:text-base">{matchup.opponentTeamName}</div>
                              <div className="text-xs sm:text-sm text-slate-400 text-right font-medium">
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

              {/* Recent Transactions */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center space-x-3">
                    <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                      <Zap className="h-5 w-5 text-yellow-400" />
                    </div>
                    <span>Week {currentWeek} Transactions</span>
                  </h3>
                  
                <div className="flex flex-row gap-4 sm:gap-6 overflow-x-auto pb-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 min-w-[280px] sm:min-w-[320px]">
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
                          className="bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700/80 transition-all duration-200 p-4 sm:p-5 rounded-lg min-w-[280px] sm:min-w-[320px] max-w-sm flex-shrink-0"
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
                        </div>

          </CardContent>
        </Card>
        )}



        {/* Enhanced Selected Team Details */}
        {selectedTeam && (
          <div className="space-y-6">
            {/* Enhanced Team Header */}
            <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 sm:p-6 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-slate-700/30"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>
              
              <div className="relative flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-blue-400/10 rounded-xl border border-blue-400/20 backdrop-blur-sm">
                    <span className="text-blue-400 font-bold text-lg sm:text-xl">{sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</span>
                  </div>
                  <UserAvatar
                    avatarId={selectedTeam.ownerAvatar}
                    displayName={selectedTeam.ownerName}
                    username={selectedTeam.ownerUsername}
                    size={48}
                    className="sm:w-14 sm:h-14 flex-shrink-0 ring-2 ring-yellow-400/20"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 font-mono tracking-wide mb-1 truncate">{selectedTeam.teamName}</h2>
                    <p className="text-sm sm:text-lg font-semibold text-yellow-400/70 font-mono">DETAILED ANALYSIS</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId)
                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedTeams.length - 1
                        handleTeamSelect(sortedTeams[prevIndex])
                      }}
                      className="bg-slate-700/80 border-slate-600/50 text-slate-300 hover:bg-slate-600/80 hover:border-yellow-400/50 hover:text-yellow-400 backdrop-blur-sm transition-all duration-200 h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm text-slate-300 font-mono min-w-[60px] sm:min-w-[80px] text-center bg-slate-700/50 px-2 sm:px-3 py-1 rounded-lg backdrop-blur-sm">
                      {sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1} of {sortedTeams.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = sortedTeams.findIndex(t => t.rosterId === selectedTeam.rosterId)
                        const nextIndex = currentIndex < sortedTeams.length - 1 ? currentIndex + 1 : 0
                        handleTeamSelect(sortedTeams[nextIndex])
                      }}
                      className="bg-slate-700/80 border-slate-600/50 text-slate-300 hover:bg-slate-600/80 hover:border-yellow-400/50 hover:text-yellow-400 backdrop-blur-sm transition-all duration-200 h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <Badge variant="outline" className={`text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 border-2 backdrop-blur-sm ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}>
                    {selectedTeam.grade}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Enhanced Navigation Tabs */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-1">
              <Tabs defaultValue="projections" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-transparent border-0 p-0 h-auto gap-1">
                  <TabsTrigger 
                    value="roster" 
                    className="text-slate-300 data-[state=active]:bg-yellow-400/10 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-400/30 font-mono text-xs sm:text-sm py-3 px-2 sm:px-4 rounded-lg transition-all duration-200 border border-transparent hover:text-yellow-400/70 hover:bg-yellow-400/5"
                  >
                    <span className="hidden sm:inline">Roster</span>
                    <span className="sm:hidden">Team</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trends" 
                    className="text-slate-300 data-[state=active]:bg-green-400/10 data-[state=active]:text-green-400 data-[state=active]:border-green-400/30 font-mono text-xs sm:text-sm py-3 px-2 sm:px-4 rounded-lg transition-all duration-200 border border-transparent hover:text-green-400/70 hover:bg-green-400/5"
                  >
                    <TrendingUp className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Trends</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="power" 
                    className="text-slate-300 data-[state=active]:bg-blue-400/10 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400/30 font-mono text-xs sm:text-sm py-3 px-2 sm:px-4 rounded-lg transition-all duration-200 border border-transparent hover:text-blue-400/70 hover:bg-blue-400/5"
                  >
                    <Zap className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Power</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="text-slate-300 data-[state=active]:bg-purple-400/10 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400/30 font-mono text-xs sm:text-sm py-3 px-2 sm:px-4 rounded-lg transition-all duration-200 border border-transparent hover:text-purple-400/70 hover:bg-purple-400/5"
                  >
                    <BarChart3 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Analysis</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="projections" 
                    className="text-slate-300 data-[state=active]:bg-orange-400/10 data-[state=active]:text-orange-400 data-[state=active]:border-orange-400/30 font-mono text-xs sm:text-sm py-3 px-2 sm:px-4 rounded-lg transition-all duration-200 border border-transparent hover:text-orange-400/70 hover:bg-orange-400/5"
                  >
                    <Target className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Projections</span>
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

        {/* Enhanced Team Rankings */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
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
                          <th className="text-left p-3 text-slate-200 font-mono text-sm min-w-[200px]">Team</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[120px]">Contender Tier</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[100px]">Starter Rank</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">QB<br/>Rank</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">RB<br/>Rank</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">WR<br/>Rank</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">TE<br/>Rank</th>
                          <th className="text-center p-3 text-slate-200 font-mono text-sm min-w-[80px]">FLEX<br/>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeams.filter(team => team && team.rosterId).map((team, index) => {
                          try {
                            const contenderTier = getContenderTier(team.grade || 'F', index + 1)
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
                                selectedTeam?.rosterId === team.rosterId ? 'bg-yellow-400/10 border-yellow-400' : ''
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
                                    <div className="font-semibold text-slate-100 truncate">{team.teamName}</div>
                                    <div className="text-xs text-gray-400 truncate">{team.ownerName}</div>
        </div>
      </div>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getTierColor(contenderTier)} font-mono text-xs px-3 py-1 border`}>
                                  {contenderTier}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(index + 1)} font-mono text-sm px-2 py-1 border`}>
                                  {index + 1}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(qbRank)} font-mono text-sm px-2 py-1 border`}>
                                  {qbRank}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(rbRank)} font-mono text-sm px-2 py-1 border`}>
                                  {rbRank}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(wrRank)} font-mono text-sm px-2 py-1 border`}>
                                  {wrRank}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(teRank)} font-mono text-sm px-2 py-1 border`}>
                                  {teRank}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${getRankColor(flexRank)} font-mono text-sm px-2 py-1 border`}>
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
                {sortedTeams.filter(team => team && team.rosterId).map((team, index) => {
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
                          selectedTeam?.rosterId === team.rosterId ? 'ring-2 ring-yellow-400/50 border-yellow-400/50' : ''
                        }`}
                        onClick={() => handleTeamSelect(team)}
                      >
                        <CardContent className="p-4">
                          {/* Team Header */}
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <Badge variant="outline" className={`${getRankColor(index + 1)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}>
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
                                  {team.teamName.length > 18 ? team.teamName.substring(0, 15) + '...' : team.teamName}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {team.ownerName.length > 12 ? team.ownerName.substring(0, 9) + '...' : team.ownerName}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className={`${getTierColor(contenderTier)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}>
                              {contenderTier}
                            </Badge>
                          </div>

                          {/* Position Rankings Grid */}
                          <div className="grid grid-cols-5 gap-2">
                            <div className="text-center">
                              <div className="text-xs text-slate-400 font-mono mb-1">QB</div>
                              <Badge variant="outline" className={`${getRankColor(qbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                                {qbRank}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400 font-mono mb-1">RB</div>
                              <Badge variant="outline" className={`${getRankColor(rbRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                                {rbRank}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400 font-mono mb-1">WR</div>
                              <Badge variant="outline" className={`${getRankColor(wrRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                                {wrRank}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400 font-mono mb-1">TE</div>
                              <Badge variant="outline" className={`${getRankColor(teRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
                                {teRank}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400 font-mono mb-1">FLEX</div>
                              <Badge variant="outline" className={`${getRankColor(flexRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}>
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
      </div>
    </div>
  )
} 