'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, AlertCircle } from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { useSearchParams } from 'next/navigation'

import { isOffSeason } from '@/lib/season-utils'

// Import extracted types and components
import type {
  LeagueBuddyProps,
  LeagueSection,
  OverviewActions,
  TeamData,
} from './league-buddy/types'
import { calculateLeaguePositionRankings } from './league-buddy/utils'
import { resolveLeagueSection } from './league-buddy/navigation'
import { calculateLeaguePlacements } from './league-buddy/competitiveState'
import { RosterSection } from './league-buddy/RosterSection'
import { LeagueStandingsSection } from './league-buddy/LeagueStandingsSection'
import { useLeagueData } from './league-buddy/useLeagueData'
import { TeamBuilder } from './league-buddy/builder/TeamBuilder'
import { DashboardLayout } from './league-buddy/DashboardLayout'
import { OverviewHeader, type OverviewRankings } from './league-buddy/OverviewHeader'
import { TradeIntelligencePanel } from './league-buddy/TradeIntelligencePanel'
import { LeagueActivityBanner } from './league-buddy/LeagueActivityBanner'
import { PowerRankingsView } from './league-buddy/power-rankings/PowerRankingsView'
import { usePowerRankings } from './league-buddy/power-rankings/usePowerRankings'
import { useDraftOrder } from './league-buddy/draft-order/useDraftOrder'
import { computeProjectedMaxPointsFor } from './league-buddy/draft-order/projectedMaxPointsFor'
import { useProjections } from './league-buddy/projections/useProjections'

export default function LeagueBuddy({ leagueId, user }: LeagueBuddyProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const desktopBuilder = useDesktopBuilder()
  const [activeSection, setActiveSection] = useState<LeagueSection>(() =>
    resolveLeagueSection(searchParams.get('tab'), desktopBuilder)
  )

  useEffect(() => {
    setActiveSection(resolveLeagueSection(searchParams.get('tab'), desktopBuilder))
  }, [searchParams, desktopBuilder])

  const changeSection = useCallback(
    (section: LeagueSection) => {
      setActiveSection(section)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', section)
      router.replace(`/league-buddy${params.size ? `?${params.toString()}` : ''}`, {
        scroll: false,
      })
    },
    [router, searchParams]
  )

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
    rosterPositionsRaw,
    leagueTransactions,
    valuesReady,
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
    // Placements depend on KTC values; computing earlier shows a state that changes a moment later.
    if (!valuesReady) return { placements: {}, nowMedian: 50, futureMedian: 50 }
    try {
      return calculateLeaguePlacements(teams, !isOffSeason())
    } catch (error) {
      console.error('Error calculating league placements:', error)
      return { placements: {}, nowMedian: 50, futureMedian: 50 }
    }
  }, [teams, valuesReady])

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
    router.push(`/scouting-portal?tab=draftboard&leagueId=${leagueId}`)
  }, [router, leagueId])

  const handlePlayoffOddsClick = useCallback(() => {
    changeSection('league')
  }, [changeSection])

  const { rankings: powerRankings, scores: powerScores } = usePowerRankings(
    teams,
    rosterPositionsRaw
  )

  const {
    season: seasonProjections,
    week: weekProjectionEntries,
    exact: projectionsExact,
    loading: projectionsLoading,
    error: projectionsError,
    byes: projectionByes,
    updatedAt: projectionsUpdatedAt,
  } = useProjections(leagueId, currentWeek)

  /** playerId → projected points per game, from season totals. */
  const projectedPpg = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [playerId, entry] of Object.entries(seasonProjections)) {
      if (entry.gp) map[playerId] = entry.pts / entry.gp
    }
    return map
  }, [seasonProjections])

  /** playerId → this week's projected points. */
  const weekProjections = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [playerId, entry] of Object.entries(weekProjectionEntries)) {
      map[playerId] = entry.pts
    }
    return map
  }, [weekProjectionEntries])

  const {
    maxPointsFor,
    weeksCounted,
    season: draftOrderSeason,
    lastRegularWeek,
    maxPointsForCompleted,
    completedWeeks,
    loading: draftOrderLoading,
  } = useDraftOrder(leagueId, currentWeek, allPlayers, rosterPositionsRaw)

  const projection = useMemo(() => {
    const realized: Record<number, number> = {}
    for (const entry of Object.values(maxPointsFor)) {
      realized[entry.rosterId] = entry.maxPointsFor
    }
    return computeProjectedMaxPointsFor({
      teams: teams.map((team) => ({
        rosterId: team.rosterId,
        players: team.players.map((p) => ({ playerId: p.playerId, position: p.position })),
      })),
      seasonProjections,
      rosterPositions: rosterPositionsRaw,
      realizedMaxPointsFor: realized,
      realizedCompletedWeeks: maxPointsForCompleted,
      completedWeeks,
      weeksPlayed: weeksCounted,
      lastRegularWeek,
    })
  }, [
    teams,
    seasonProjections,
    rosterPositionsRaw,
    maxPointsFor,
    maxPointsForCompleted,
    completedWeeks,
    weeksCounted,
    lastRegularWeek,
  ])

  const rosterProjections = useMemo(
    () => ({
      error: projectionsError,
      byes: projectionByes,
      entries: weekProjectionEntries,
      updatedAt: projectionsUpdatedAt,
      ppg: projectedPpg,
      week: weekProjections,
      rosterPositions: rosterPositionsRaw,
      currentWeek,
      approximate: !projectionsExact,
      loading: projectionsLoading,
    }),
    [
      projectionsError,
      projectionByes,
      weekProjectionEntries,
      projectionsUpdatedAt,
      projectedPpg,
      weekProjections,
      rosterPositionsRaw,
      currentWeek,
      projectionsExact,
      projectionsLoading,
    ]
  )

  const draftOrder = useMemo(
    () => ({
      maxPointsFor,
      projectedMaxPointsFor: projection.projected,
      weeksCounted,
      remainingWeeks: projection.remainingWeeks,
      season: draftOrderSeason,
      loading: draftOrderLoading,
    }),
    [maxPointsFor, projection, weeksCounted, draftOrderSeason, draftOrderLoading]
  )

  const overviewRankings = useMemo<OverviewRankings>(
    () => ({
      placements: leaguePlacements,
      positionRankings: leaguePositionRankings,
      powerScores,
      draftOrder,
      weekProjections,
    }),
    [leaguePlacements, leaguePositionRankings, powerScores, draftOrder, weekProjections]
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
      <div aria-label="Loading dashboard" className="mx-auto max-w-[1440px] space-y-6 p-6">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <Skeleton className="h-10 w-full bg-slate-800" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-slate-800" />
        ))}
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
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={changeSection}
      team={selectedTeam}
      currentWeek={currentWeek}
      isDynasty={leagueOverview?.isDynasty === true}
      leagueId={leagueId}
    >
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
            <SectionHeader
              title="Trade intelligence"
              subtitle="Sell high, hold or buy low, from today's KTC moves"
              className="mb-0"
            />
            <TradeIntelligencePanel
              players={selectedTeam.players}
              leaguePlayerPool={teams.flatMap((t) => t.players)}
            />
          </div>
        </>
      )}

      {activeSection === 'builder' && !desktopBuilder && (
        <section className="rounded-xl border border-slate-700 p-6">
          <h2 className="font-semibold text-white">Team Builder is available on desktop</h2>
          <p className="mt-2 text-sm text-slate-400">
            Open this league in a desktop browser to plan your roster on the map.
          </p>
          <Button className="mt-4" onClick={() => changeSection('overview')}>
            Go to Overview
          </Button>
        </section>
      )}
      {selectedTeam && desktopBuilder && (
        <div hidden={activeSection !== 'builder'}>
          <TeamBuilder
            rosterPositions={rosterPositionsRaw}
            draftOrder={draftOrder}
            placement={leaguePlacements.placements[selectedTeam.rosterId]}
            key={`${leagueId}:${selectedTeam.rosterId}`}
            team={selectedTeam}
            teams={teams}
            leagueId={leagueId}
            isDynasty={leagueOverview?.isDynasty === true}
          />
        </div>
      )}
      {/* ROSTER SECTION */}
      {activeSection === 'roster' && selectedTeam && (
        <RosterSection
          key={`${leagueId}:${selectedTeam.rosterId}`}
          leagueId={leagueId}
          onActionComplete={fetchLeagueData}
          isDynasty={leagueOverview?.isDynasty === true}
          selectedTeam={selectedTeam}
          sortedTeams={sortedTeams}
          teams={teams}
          projections={rosterProjections}
        />
      )}

      {activeSection === 'league' && selectedTeam && (
        <LeagueStandingsSection
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamSelect={handleTeamSelect}
          leagueId={leagueId}
          isDynasty={leagueOverview?.isDynasty === true}
          draftOrder={draftOrder}
        />
      )}

      {/* AUDIT SECTION */}
    </DashboardLayout>
  )
}
