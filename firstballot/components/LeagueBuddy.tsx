'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, AlertCircle, TrendingUp, Target } from 'lucide-react'
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

import { isOffSeason } from '@/lib/season-utils'

// Import extracted types and components
import type { LeagueBuddyProps, LeagueSection, OverviewActions, TeamData } from './league-buddy/types'
import { calculateLeaguePositionRankings, countRosterPositions } from './league-buddy/utils'
import { LEAGUE_SECTIONS } from './league-buddy/navigation'
import { calculateLeaguePlacements } from './league-buddy/competitiveState'
import { LeagueOverviewSection } from './league-buddy/LeagueOverviewSection'
import { RosterSection } from './league-buddy/RosterSection'
import { MatchupView } from './league-buddy/MatchupView'
import { PositionRankings } from './league-buddy/PositionRankings'
import { LeagueStandingsSection } from './league-buddy/LeagueStandingsSection'
import { useLeagueData } from './league-buddy/useLeagueData'
import { LeagueBuddySidebar } from './league-buddy/LeagueBuddySidebar'
import { OverviewHeader, type OverviewRankings } from './league-buddy/OverviewHeader'
import { TradeIntelligencePanel } from './league-buddy/TradeIntelligencePanel'
import { AuditSection } from './league-buddy/AuditSection'
import { LeagueActivityBanner } from './league-buddy/LeagueActivityBanner'
import { PowerRankingsView } from './league-buddy/power-rankings/PowerRankingsView'
import { usePowerRankings } from './league-buddy/power-rankings/usePowerRankings'

export default function LeagueBuddy({
  leagueId,
  user,
}: LeagueBuddyProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<LeagueSection>('overview')

  const {
    teams,
    loading,
    error,
    selectedTeam,
    setSelectedTeam,
    leagueOverview,
    currentMatchups,
    currentWeek,
    allPlayers,
    playerRankings,
    rosterPositionsRaw,
    leagueTransactions,
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

  // Memoized competitive-state placements (Now × Future), computed once per render tree
  const leaguePlacements = useMemo(() => {
    try {
      return calculateLeaguePlacements(teams, !isOffSeason())
    } catch (error) {
      console.error('Error calculating league placements:', error)
      return { placements: {}, nowMedian: 50, futureMedian: 50 }
    }
  }, [teams])

  // Roster slot counts (QB/RB/WR/TE/FLEX/SUPER_FLEX), tallied from Sleeper's raw slot array
  const rosterPositions = useMemo(
    () => ({
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      SUPER_FLEX: 1,
      ...countRosterPositions(rosterPositionsRaw),
    }),
    [rosterPositionsRaw]
  )

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

  const { rankings: powerRankings, scores: powerScores } = usePowerRankings(
    teams,
    rosterPositionsRaw
  )

  const overviewRankings = useMemo<OverviewRankings>(
    () => ({
      playerRankings,
      placements: leaguePlacements,
      positionRankings: leaguePositionRankings,
      powerScores,
    }),
    [playerRankings, leaguePlacements, leaguePositionRankings, powerScores]
  )

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
              {LEAGUE_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex-1 px-2 py-2 rounded-md font-mono text-xs font-semibold transition-all ${
                    activeSection === section.id
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-300 hover:text-yellow-400'
                  }`}
                >
                  {section.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && selectedTeam && leagueOverview && (
            <>
              <div className="mb-4">
                <LeagueActivityBanner
                  transactions={leagueTransactions}
                  teams={teams}
                  allPlayers={allPlayers}
                />
              </div>

              <OverviewHeader
                selectedTeam={selectedTeam}
                sortedTeams={sortedTeams}
                currentMatchups={currentMatchups}
                currentWeek={currentWeek}
                teams={teams}
                actions={overviewActions}
                rankings={overviewRankings}
              />

              <div className="mt-6">
                <PowerRankingsView
                  rankings={powerRankings}
                  selectedTeam={selectedTeam}
                  leagueSize={teams.length}
                />
              </div>

              {/* Trade Intelligence — Sell High / Hold / Buy Low */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-yellow-400 font-mono text-sm font-bold uppercase tracking-wider">
                    Trade Intelligence
                  </h3>
                </div>
                <TradeIntelligencePanel
                  players={selectedTeam.players}
                  leaguePlayerPool={teams.flatMap((t) => t.players)}
                />
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
                      placements={leaguePlacements}
                      onTeamSelect={handleTeamSelect}
                    />
                    <PositionRankings
                      teams={teams}
                      selectedTeam={selectedTeam}
                      leaguePositionRankings={leaguePositionRankings}
                      placements={leaguePlacements}
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
                          placements={leaguePlacements}
                          onTeamSelect={handleTeamSelect}
                        />
                        <PositionRankings
                          teams={teams}
                          selectedTeam={selectedTeam}
                          leaguePositionRankings={leaguePositionRankings}
                          placements={leaguePlacements}
                          onTeamSelect={handleTeamSelect}
                        />
                      </>
                    )
                  })()
                )}
              </div>
            </>
          )}

          {/* AUDIT SECTION */}
          {activeSection === 'audit' && selectedTeam && (
            <AuditSection
              selectedTeam={selectedTeam}
              teams={teams}
              rosterPositions={rosterPositions}
              currentWeek={currentWeek}
              placement={leaguePlacements.placements[selectedTeam.rosterId]}
              placements={leaguePlacements}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
