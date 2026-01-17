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
import { PlayerHeadshot } from '@/components/ui/player-headshot'
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
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { leagueCache } from '@/lib/league-cache'
import { sleeperApi } from '@/lib/nextjs-cache'

// Import extracted types and components
import type {
  LeagueBuddyProps,
  TeamData,
  PlayerData,
  TeamTrends,
  PositionStrengths,
  SleeperMatchup,
  MatchupData,
  LeagueOverview,
  TrendingPlayer,
} from './league-buddy/types'
import {
  validateApiResponse,
  safeJsonParse,
  getTierFromRank,
  calculateRawScore,
  calculateGradeFromPercentile,
  calculateTeamTrends,
  calculatePositionStrengths,
  calculateRecentForm,
  getContenderTier,
  getTierColor,
  getRankColor,
  getOpponentInfo,
  calculateProjection,
  buildLineup,
  calculateLeaguePositionRankings,
  isPlayerAvailable,
} from './league-buddy/utils'
import { LeagueOverviewSection } from './league-buddy/LeagueOverviewSection'
import { RosterSection } from './league-buddy/RosterSection'
import { MatchupView } from './league-buddy/MatchupView'
import { PositionRankings } from './league-buddy/PositionRankings'
import { LeagueStandingsSection } from './league-buddy/LeagueStandingsSection'
import { useLeagueData } from './league-buddy/useLeagueData'
import { LeagueBuddySidebar } from './league-buddy/LeagueBuddySidebar'
import { OverviewHeader } from './league-buddy/OverviewHeader'

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

export default function LeagueBuddy({
  leagueId,
  user,
  leagues = [],
  onLeagueChange,
}: LeagueBuddyProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'overview' | 'roster' | 'league'>('overview')
  const [lineupMode, setLineupMode] = useState<'current' | 'optimized'>('current')
  const [whatIfLineup, setWhatIfLineup] = useState<string[]>([])
  const [selectedStarterToSwap, setSelectedStarterToSwap] = useState<string | null>(null)

  const {
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
  } = useLeagueData(leagueId, user)

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
    try {
      return calculateLeaguePositionRankings(sortedTeams)
    } catch (error) {
      console.error('Error calculating position rankings:', error)
      return {}
    }
  }, [sortedTeams])

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

  const handlePlayoffOddsClick = useCallback(() => {
    router.push(`/playoff-odds?leagueId=${leagueId}`)
  }, [router, leagueId])

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
              onClick={() => fetchLeagueData()}
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
              onClick={() => fetchLeagueData()}
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
      {/* Sidebar - Hidden on mobile via Sidebar component's built-in classes */}
      <LeagueBuddySidebar
        selectedTeam={selectedTeam}
        sortedTeams={sortedTeams}
        leagues={leagues}
        leagueId={leagueId}
        onLeagueChange={onLeagueChange}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        currentWeek={currentWeek}
        leagueOverview={leagueOverview}
      />

      {/* Main Content Area */}
      <SidebarInset className="bg-slate-900 overflow-x-hidden">
        <div className="w-full px-2 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
          {/* Mobile Navigation & League Switcher - Only visible on mobile */}
          <div className="md:hidden mb-6 space-y-4">
            {/* Mobile Navigation Tabs */}
            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveSection('overview')}
                className={`flex-1 px-3 py-2 rounded-md font-mono text-xs font-semibold transition-all ${
                  activeSection === 'overview'
                    ? 'bg-yellow-400 text-slate-900'
                    : 'text-slate-300 hover:text-yellow-400'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveSection('roster')}
                className={`flex-1 px-3 py-2 rounded-md font-mono text-xs font-semibold transition-all ${
                  activeSection === 'roster'
                    ? 'bg-yellow-400 text-slate-900'
                    : 'text-slate-300 hover:text-yellow-400'
                }`}
              >
                My Team
              </button>
              <button
                onClick={() => setActiveSection('league')}
                className={`flex-1 px-3 py-2 rounded-md font-mono text-xs font-semibold transition-all ${
                  activeSection === 'league'
                    ? 'bg-yellow-400 text-slate-900'
                    : 'text-slate-300 hover:text-yellow-400'
                }`}
              >
                League
              </button>
            </div>
          </div>

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && selectedTeam && leagueOverview && (
            <>
              <OverviewHeader
                selectedTeam={selectedTeam}
                sortedTeams={sortedTeams}
                playerRankings={playerRankings}
                currentMatchups={currentMatchups}
                currentWeek={currentWeek}
                onTradeMarketClick={handleTradeMarketClick}
                onScoutingPortalClick={handleScoutingPortalClick}
                onDraftBuddyClick={handleDraftBuddyClick}
                onPlayoffOddsClick={handlePlayoffOddsClick}
              />

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

                  // Get the appropriate lineup based on current mode
                  const { lineup, bench } = buildLineup(
                    selectedTeam.players,
                    lineupMode,
                    currentStarters,
                    rosterPositions,
                    whatIfLineup.length > 0 ? whatIfLineup : undefined
                  )

                  // Get current lineup for comparison when showing optimized
                  const { lineup: currentLineupData } = buildLineup(
                    selectedTeam.players,
                    'current',
                    currentStarters,
                    rosterPositions
                  )
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
                      const { matchupRating } = getOpponentInfo(slot.player, nflGames)
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
                                      <PlayerHeadshot
                                        headshotUrl={removedSlot.player.headshot_url}
                                        playerName={removedSlot.player.playerName}
                                        size={24}
                                      />
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
                                      <PlayerHeadshot
                                        headshotUrl={addedSlot.player.headshot_url}
                                        playerName={addedSlot.player.playerName}
                                        size={24}
                                      />
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
                                slot.player,
                                nflGames
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
                              // Only suggest available players (not injured/IR/doubtful/bye)
                              const starterFPPG = slot.player.fantasy_ppg || 0
                              const eligibleBench = bench.filter(
                                (b) =>
                                  isPlayerAvailable(b) && // Exclude injured/IR/doubtful/bye players
                                  (b.position === slot.position ||
                                    (slot.position === 'FLEX' &&
                                      ['RB', 'WR', 'TE'].includes(b.position)) ||
                                    (slot.position === 'SUPERFLEX' &&
                                      ['QB', 'RB', 'WR', 'TE'].includes(b.position))) &&
                                  (b.fantasy_ppg || 0) > 0
                              )
                              const bestBench = eligibleBench.reduce(
                                (best, current) =>
                                  (current.fantasy_ppg || 0) > (best.fantasy_ppg || 0)
                                    ? current
                                    : best,
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
                                    <div className="relative flex-shrink-0">
                                      <div
                                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${
                                          slot.player.position === 'QB'
                                            ? 'from-pink-600/40 to-purple-900/60'
                                            : slot.player.position === 'RB'
                                              ? 'from-teal-600/40 to-emerald-900/60'
                                              : slot.player.position === 'WR'
                                                ? 'from-blue-600/40 to-indigo-900/60'
                                                : 'from-purple-600/40 to-violet-900/60'
                                        }`}
                                      />
                                      <PlayerHeadshot
                                        headshotUrl={slot.player.headshot_url}
                                        playerName={slot.player.playerName}
                                        size={36}
                                        className="relative z-10"
                                      />
                                    </div>
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
                                slot.player,
                                nflGames
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
                              // Only suggest available players (not injured/IR/doubtful/bye)
                              const starterFPPG = slot.player.fantasy_ppg || 0
                              const eligibleBench = bench.filter(
                                (b) =>
                                  isPlayerAvailable(b) && // Exclude injured/IR/doubtful/bye players
                                  (b.position === slot.position ||
                                    (slot.position === 'FLEX' &&
                                      ['RB', 'WR', 'TE'].includes(b.position)) ||
                                    (slot.position === 'SUPERFLEX' &&
                                      ['QB', 'RB', 'WR', 'TE'].includes(b.position))) &&
                                  (b.fantasy_ppg || 0) > 0
                              )
                              const bestBench = eligibleBench.reduce(
                                (best, current) =>
                                  (current.fantasy_ppg || 0) > (best.fantasy_ppg || 0)
                                    ? current
                                    : best,
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
                              if (
                                slot.player.rank <= 6 &&
                                ['QB', 'TE'].includes(slot.player.position)
                              )
                                recommendationBadge = 'MUST START'
                              else if (
                                slot.player.rank <= 12 &&
                                ['RB', 'WR'].includes(slot.player.position)
                              )
                                recommendationBadge = 'MUST START'
                              else if (avgFPPG && avgFPPG >= 15)
                                recommendationBadge = 'STRONG START'
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
                                      <div className="relative flex-shrink-0">
                                        <div
                                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${
                                            slot.player.position === 'QB'
                                              ? 'from-pink-600/30 to-purple-900/50'
                                              : slot.player.position === 'RB'
                                                ? 'from-teal-600/30 to-emerald-900/50'
                                                : slot.player.position === 'WR'
                                                  ? 'from-blue-600/30 to-indigo-900/50'
                                                  : 'from-purple-600/30 to-violet-900/50'
                                          }`}
                                        />
                                        <PlayerHeadshot
                                          headshotUrl={slot.player.headshot_url}
                                          playerName={slot.player.playerName}
                                          size={56}
                                          className="relative z-10"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
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
                                                <span className="text-green-400 font-semibold">
                                                  vs
                                                </span>
                                                <TeamLogo team={opponentTeam} size={16} />
                                                <span className="text-slate-300 font-medium">
                                                  {opponentTeam}
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-blue-400 font-semibold">
                                                  @
                                                </span>
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
                                  const { opponentTeam, isHome, matchupRating } = getOpponentInfo(
                                    player,
                                    nflGames
                                  )
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
                                          <div className="relative flex-shrink-0">
                                            <div
                                              className={`absolute inset-0 rounded-full bg-gradient-to-br ${
                                                player.position === 'QB'
                                                  ? 'from-pink-600/20 to-purple-900/40'
                                                  : player.position === 'RB'
                                                    ? 'from-teal-600/20 to-emerald-900/40'
                                                    : player.position === 'WR'
                                                      ? 'from-blue-600/20 to-indigo-900/40'
                                                      : 'from-purple-600/20 to-violet-900/40'
                                              }`}
                                            />
                                            <PlayerHeadshot
                                              headshotUrl={player.headshot_url}
                                              playerName={player.playerName}
                                              size={40}
                                              className="relative z-10"
                                            />
                                          </div>
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
                                                <span className="font-mono">
                                                  {avgFPPG.toFixed(1)}
                                                </span>
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
            </>
          )}

          {/* ROSTER SECTION */}
          {activeSection === 'roster' && selectedTeam && (
            <RosterSection selectedTeam={selectedTeam} sortedTeams={sortedTeams} teams={teams} />
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

                  return (
                    <>
                      <MatchupView
                        selectedTeam={selectedTeam}
                        opponent={opponent}
                        teamMatchup={teamMatchup}
                        currentWeek={currentWeek}
                        leaguePositionRankings={leaguePositionRankings}
                        sortedTeams={sortedTeams}
                      />
                      <LeagueStandingsSection
                        teams={teams}
                        selectedTeam={selectedTeam}
                        leaguePositionRankings={leaguePositionRankings}
                        onTeamSelect={handleTeamSelect}
                      />
                      <PositionRankings
                        teams={teams}
                        selectedTeam={selectedTeam}
                        leaguePositionRankings={leaguePositionRankings}
                        onTeamSelect={handleTeamSelect}
                      />
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
