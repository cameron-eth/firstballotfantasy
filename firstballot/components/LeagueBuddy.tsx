"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerHeadshot } from "@/components/player-headshot"
import { TeamLogo } from "@/components/team-logo"
import { UserAvatar } from "@/components/user-avatar"
import { BarChart3, TrendingUp, Users, Trophy, Target, Zap, Calendar, Award, Loader2, AlertCircle, TrendingDown, ArrowUp, ArrowDown, Minus, ArrowLeft, ArrowRight, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    console.log('Debug: Calculating position strengths for', players.length, 'players')
    players.forEach(player => {
      console.log('Debug: Player position:', player.position, 'for', player.playerName)
      const position = player.position?.toUpperCase()
      if (position === 'QB') positionCounts.QB++;
      else if (position === 'RB') positionCounts.RB++;
      else if (position === 'WR') positionCounts.WR++;
      else if (position === 'TE') positionCounts.TE++;
      else if (position === 'FLEX') positionCounts.FLEX++;
      else if (position === 'SFLX' || position === 'SUPER_FLEX') positionCounts.SFLX++;
      // Handle any other positions by adding to FLEX
      else {
        console.log('Debug: Unknown position:', player.position, 'for', player.playerName)
        positionCounts.FLEX++;
      }
    });
    console.log('Debug: Final position counts:', positionCounts)
  } else {
    console.log('Debug: No players found for position strength calculation')
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

  // Optimized data fetching with better error handling
  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch NFL state to get current week
      const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
      if (!validateApiResponse(nflStateResponse, 'NFL State')) {
        throw new Error('Failed to fetch NFL state')
      }
      
      const nflState = await safeJsonParse(nflStateResponse)
      if (!nflState) throw new Error('Invalid NFL state data')
      
      const week = nflState.week || 1
      setCurrentWeek(week)

      // Fetch all data in parallel with error handling
      const fetchPromises = [
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
        fetch('https://api.sleeper.app/v1/players/nfl'),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
        fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`).catch(() => null),
        fetch('/api/rankings').catch(() => null)
      ]

      const responses = await Promise.all(fetchPromises)
      
      // Validate critical responses
      if (!responses[0] || !responses[1] || !responses[2] || !responses[3] ||         !validateApiResponse(responses[0], 'Rosters') ||         !validateApiResponse(responses[1], 'Users') ||         !validateApiResponse(responses[2], 'Players') ||         !validateApiResponse(responses[3], 'League')) {
        throw new Error('Failed to fetch critical league data')
      }

      const [rosters, users, allPlayers, league, matchups, transactionsResponse, rankingsResponse] = await Promise.all([
        safeJsonParse(responses[0]!),
        safeJsonParse(responses[1]!),
        safeJsonParse(responses[2]!),
        safeJsonParse(responses[3]!),
        responses[4] && responses[4].ok ? safeJsonParse(responses[4]) : Promise.resolve([]),
        responses[5] ? safeJsonParse(responses[5]) : Promise.resolve([]),
        responses[6] && responses[6].ok ? safeJsonParse(responses[6]) : Promise.resolve([])
      ]) as [any[], any[], Record<string, any>, any, any[], any[], any[]]

      if (!rosters || !users || !allPlayers || !league) {
        throw new Error('Invalid data received from API')
      }

      // Add debugging to identify null user objects
      console.log('Debug: Rosters count:', rosters?.length)
      console.log('Debug: Users count:', users?.length)
      console.log('Debug: Sample roster:', rosters?.[0])
      console.log('Debug: Sample user:', users?.[0])
      
      // Filter out any null or invalid users/rosters
      const validUsers = users.filter((u: any) => u && u.user_id)
      const validRosters = rosters.filter((r: any) => r && r.roster_id)
      
      console.log('Debug: Valid users count:', validUsers.length)
      console.log('Debug: Valid rosters count:', validRosters.length)

      setAllPlayers(allPlayers)

      // Process rankings data
      if (rankingsResponse && rankingsResponse.length > 0) {
        const rankingsMap = rankingsResponse.reduce((acc: any, player: any) => {
          const playerName = player['PLAYER NAME'];
          if (playerName) {
            // Determine tier based on rank
            let tier = 4; // Default tier
            if (player.RK <= 12) tier = 1;
            else if (player.RK <= 24) tier = 2;
            else if (player.RK <= 48) tier = 3;
            
            acc[playerName] = {
              rank: player.RK,
              position: player.POS,
              team: player.TEAM,
              name: playerName,
              tier: tier,
            };
          }
          return acc;
        }, {});
        setPlayerRankings(rankingsMap);
        console.log('Debug: Loaded', Object.keys(rankingsMap).length, 'player rankings');
      }

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

      // Process trending players with validation
      const trendingResponse = await fetch('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=10').catch(() => null)
      const trending = trendingResponse ? await safeJsonParse(trendingResponse) : []
      
      const trendingPlayers: TrendingPlayer[] = (trending || []).map((item: any) => {
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
      }).filter((player: TrendingPlayer) => player.playerName !== 'Unknown Player')

      // Process matchups with deduplication
      const matchupData: MatchupData[] = []
      const matchupMap = new Map()
      
      console.log('Debug: Matchups data:', matchups)
      console.log('Debug: Current week:', week)
      
      if (matchups && matchups.length > 0) {
        matchups.forEach((matchup: any) => {
          console.log('Debug: Processing matchup:', matchup)
          if (!matchupMap.has(matchup.matchup_id)) {
            matchupMap.set(matchup.matchup_id, [])
          }
          matchupMap.get(matchup.matchup_id).push(matchup)
        })

        matchupMap.forEach((matchupPair: any[], matchupId: number) => {
          if (matchupPair.length === 2) {
            const [team1, team2] = matchupPair
            
            // Add null checks for roster data
            if (!team1 || !team2) return
            
            const team1Roster = validRosters.find((r: any) => r?.roster_id === team1.roster_id)
            const team2Roster = validRosters.find((r: any) => r?.roster_id === team2.roster_id)
            
            // Add null checks for owner data
            const team1Owner = team1Roster?.owner_id ? validUsers.find((u: any) => u?.user_id === team1Roster.owner_id) : null
            const team2Owner = team2Roster?.owner_id ? validUsers.find((u: any) => u?.user_id === team2Roster.owner_id) : null
            
            const team1Name = team1Owner?.metadata?.team_name || team1Owner?.display_name || team1Owner?.first_name || `Team ${team1.roster_id}`
            const team2Name = team2Owner?.metadata?.team_name || team2Owner?.display_name || team2Owner?.first_name || `Team ${team2.roster_id}`
            
            console.log('Debug: Team1 points:', team1.points, 'Team2 points:', team2.points)
            
            matchupData.push({
              rosterId: team1.roster_id,
              teamName: team1Name,
              projectedPoints: team1.points || 0,
              actualPoints: team1.points || 0,
              opponentRosterId: team2.roster_id,
              opponentTeamName: team2Name,
              opponentProjectedPoints: team2.points || 0,
              opponentActualPoints: team2.points || 0,
              isHome: true
            })
          }
        })
      } else {
        console.log('Debug: No matchups found for week', week)
      }

      // Remove duplicate matchups
      const uniqueMatchups = matchupData.filter((matchup, index, self) => 
        index === self.findIndex(m => 
          (m.rosterId === matchup.rosterId && m.opponentRosterId === matchup.opponentRosterId) ||
          (m.rosterId === matchup.opponentRosterId && m.opponentRosterId === matchup.rosterId)
        )
      )

      setCurrentMatchups(uniqueMatchups)

      // Calculate league overview with validation
      const totalPoints = rosters.reduce((sum: number, roster: any) => sum + (roster.settings?.fpts || 0), 0)
      const avgPoints = totalPoints / Math.max(rosters.length, 1)
      
      const scoringRosters = rosters.filter((roster: any) => (roster.settings?.fpts || 0) > 0)
      let highestScoring = rosters[0]
      let lowestScoring = rosters[0]
      
      if (scoringRosters.length > 0) {
        highestScoring = scoringRosters.reduce((max: any, roster: any) => 
          (roster.settings?.fpts || 0) > (max.settings?.fpts || 0) ? roster : max
        )
        lowestScoring = scoringRosters.reduce((min: any, roster: any) => 
          (roster.settings?.fpts || 0) < (min.settings?.fpts || 0) ? roster : min
        )
      } else if (rosters.length > 1) {
        highestScoring = rosters[0]
        lowestScoring = rosters[rosters.length - 1]
      }

      const highestOwner = highestScoring?.owner_id ? validUsers.find((u: any) => u?.user_id === highestScoring.owner_id) : null
      const lowestOwner = lowestScoring?.owner_id ? validUsers.find((u: any) => u?.user_id === lowestScoring.owner_id) : null

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
          if (!player) return null
          
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

        console.log('Debug: Team', teamName, 'has', players.length, 'players')
        if (players.length > 0) {
          console.log('Debug: Sample player positions:', players.slice(0, 3).map(p => ({ name: p.playerName, position: p.position })))
        }

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
          grade: '', // Will be set after percentile calculation
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

      // Filter out null values and set teams
      const validTeamsData = teamsData.filter(Boolean) as TeamData[]
      
      // Calculate grades based on percentile ranking
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

  // Memoized event handlers
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

  return (
    <div className="flex space-x-6">
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
                              <PlayerHeadshot
                                playerId={leagueOverview.trendingPlayers[mobileTrendingIndex].espn_id || leagueOverview.trendingPlayers[mobileTrendingIndex].playerId}
                                playerName={leagueOverview.trendingPlayers[mobileTrendingIndex].playerName}
                                teamLogo={leagueOverview.trendingPlayers[mobileTrendingIndex].team}
                                size={48}
                                className="flex-shrink-0"
                                player={leagueOverview.trendingPlayers[mobileTrendingIndex]}
                              />
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
                            <PlayerHeadshot
                              playerId={player.espn_id || player.playerId}
                              playerName={player.playerName}
                              teamLogo={player.team}
                              size={32}
                              className="flex-shrink-0"
                              player={player}
                            />
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
                    {teams.findIndex(t => t.rosterId === selectedTeam?.rosterId) + 1} of {teams.length}
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
                   {teams.slice(0, 5).map((team, index) => (
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
                   {teams.length > 5 && (
                     <span className="text-xs text-slate-400 ml-1">+{teams.length - 5}</span>
                   )}
                 </div>
                 

              </div>

                             {/* Single Team Card Display */}
               <div className="relative">
                 <div className="w-full">
                  {selectedTeam && (
                    <Card 
                      className="w-full cursor-pointer transition-all hover:border-yellow-400 hover:bg-slate-700 border-yellow-400 ring-2 ring-yellow-400 bg-slate-700"
                    >
                      <div className="p-4">
                        {/* Team Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl font-bold text-yellow-400">#{teams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</div>
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
                              <PlayerHeadshot
                                key={idx}
                                playerId={player.espn_id || player.playerId}
                                playerName={player.playerName}
                                teamLogo={player.team}
                                size={24}
                                className="flex-shrink-0"
                                player={player}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
                

              </div>
            </div>

            {/* Desktop Team Grid */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-3 gap-4">
              {teams.map((team, index) => (
                <Card 
                  key={team.rosterId} 
                  className={`p-4 cursor-pointer transition-all hover:border-yellow-400 hover:bg-slate-700 ${
                    selectedTeam?.rosterId === team.rosterId ? 'border-yellow-400 ring-2 ring-yellow-400 bg-slate-700' : 'bg-slate-800 border-slate-700'
                  }`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl font-bold text-yellow-400">#{index + 1}</div>
                      <UserAvatar
                        avatarId={team.ownerAvatar}
                        displayName={team.ownerName}
                        username={team.ownerUsername}
                        size={40}
                        className="flex-shrink-0"
                      />
                      <div>
                        <h3 className="font-semibold text-slate-100">{team.teamName}</h3>
                        <p className="text-sm text-gray-400">{team.ownerName}</p>
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
                        <PlayerHeadshot
                          key={idx}
                          playerId={player.espn_id || player.playerId}
                          playerName={player.playerName}
                          teamLogo={player.team}
                          size={24}
                          className="flex-shrink-0"
                          player={player}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
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
                  <span className="text-blue-400 font-bold text-lg">{teams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</span>
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
                          <PlayerHeadshot
                            playerId={player.espn_id || player.playerId}
                            playerName={player.playerName}
                            teamLogo={player.team}
                            size={40}
                            className="flex-shrink-0"
                            player={player}
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
                          <PlayerHeadshot
                            playerId={selectedTeam.trends.bestPlayer.espn_id || selectedTeam.trends.bestPlayer.playerId}
                            playerName={selectedTeam.trends.bestPlayer.playerName}
                            teamLogo={selectedTeam.trends.bestPlayer.team}
                            size={48}
                            player={selectedTeam.trends.bestPlayer}
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
                          <PlayerHeadshot
                            playerId={selectedTeam.trends.breakoutCandidate.espn_id || selectedTeam.trends.breakoutCandidate.playerId}
                            playerName={selectedTeam.trends.breakoutCandidate.playerName}
                            teamLogo={selectedTeam.trends.breakoutCandidate.team}
                            size={48}
                            player={selectedTeam.trends.breakoutCandidate}
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
                          <PlayerHeadshot
                            playerId={selectedTeam.trends.sleeperPick.espn_id || selectedTeam.trends.sleeperPick.playerId}
                            playerName={selectedTeam.trends.sleeperPick.playerName}
                            teamLogo={selectedTeam.trends.sleeperPick.team}
                            size={48}
                            player={selectedTeam.trends.sleeperPick}
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
                              <div className="text-3xl font-bold text-yellow-400">#{teams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1}</div>
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
                            <span className="text-slate-100">#{teams.findIndex(t => t.rosterId === selectedTeam.rosterId) + 1} of {teams.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Points Rank:</span>
                            <span className="text-slate-100">#{[...teams].sort((a, b) => b.pointsFor - a.pointsFor).findIndex(t => t.rosterId === selectedTeam.rosterId) + 1} of {teams.length}</span>
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
                        {teams.slice(0, 3).map((team, index) => (
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
                          <div className="text-2xl font-bold text-green-400">8-6</div>
                          <div className="text-sm text-gray-400">Projected Record</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">4th</div>
                          <div className="text-sm text-gray-400">Projected Finish</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">125.3</div>
                          <div className="text-sm text-gray-400">Avg PPG</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">65%</div>
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

      {/* Transactions Sidebar */}
      <div className={`${showTransactionsSidebar ? 'block' : 'hidden'} lg:block w-80`}>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>TRANSACTIONS</span>
              </div>
              <button 
                onClick={handleTransactionsToggle}
                className="lg:hidden text-slate-400 hover:text-slate-300"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Week {currentWeek} Transactions</h3>
              <button className="text-slate-400 hover:text-slate-300 text-sm">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No transactions this week</p>
                </div>
              ) : (
                transactions.map((tx) => {
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
                    <div key={tx.transactionId} className="bg-slate-700 border-slate-600 p-3 rounded-lg">
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
                        <div className="space-y-1">
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
                              <span className="text-blue-400">Draft Picks:</span> {tx.draftPicks.length} picks traded
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
      </div>
    </div>
  )
} 