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
import { isOffSeason } from '@/lib/season-utils'

// Import extracted types and components
import type {
  LeagueBuddyProps,
  LeagueSection,
  OverviewActions,
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
import { TradeIntelligencePanel } from './league-buddy/TradeIntelligencePanel'

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
}: LeagueBuddyProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<LeagueSection>('overview')
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

  const overviewActions = useMemo<OverviewActions>(
    () => ({
      onTradeMarketClick: handleTradeMarketClick,
      onScoutingPortalClick: handleScoutingPortalClick,
      onDraftBuddyClick: handleDraftBuddyClick,
      onPlayoffOddsClick: handlePlayoffOddsClick,
    }),
    [
      handleDraftBuddyClick,
      handlePlayoffOddsClick,
      handleScoutingPortalClick,
      handleTradeMarketClick,
    ]
  )

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
                    <Skeleton key={`action-btn-skeleton-${i}`} className="flex-1 h-14 rounded-lg !bg-slate-700" />
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
                      <Skeleton key={`team-info-skeleton-${i}`} className="h-8 w-8 rounded !bg-slate-700" />
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
                      key={`lineup-skeleton-${i}`}
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
                          <div key={`slot-skeleton-${i}`} className="bg-slate-700/30 rounded-lg p-3">
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
                teams={teams}
              />

              {/* Trade Intelligence — Sell High / Hold / Buy Low */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-yellow-400 font-mono text-sm font-bold uppercase tracking-wider">
                    Trade Intelligence
                  </h3>
                </div>
                <TradeIntelligencePanel players={selectedTeam.players} />
              </div>

            </>
          )}

          {/* ROSTER SECTION */}
          {activeSection === 'roster' && selectedTeam && (
            <RosterSection selectedTeam={selectedTeam} sortedTeams={sortedTeams} teams={teams} />
          )}

          {/* LEAGUE SECTION - Matchup Details (or off-season standings) */}
          {activeSection === 'league' && selectedTeam && (
            <>
              <div className="space-y-4">
                {isOffSeason() ? (
                  <>
                    {/* Off-season: skip matchup view, show standings + rankings */}
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
                ) : (
                  (() => {
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
                  })()
                )}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
