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
import { tradeSignals } from '@/lib/trade-signals'

// Import extracted types and components
import type {
  LeagueBuddyProps,
  LeagueSection,
  OverviewActions,
  TeamData,
} from './league-buddy/types'
import { calculateLeaguePositionRankings, recordOrder } from './league-buddy/utils'
import { resolveLeagueSection } from './league-buddy/navigation'
import { calculateLeaguePlacements } from './league-buddy/competitiveState'
import { RosterSection } from './league-buddy/RosterSection'
import { LeagueStandingsSection } from './league-buddy/LeagueStandingsSection'
import { PicksSection } from './league-buddy/PicksSection'
import { DraftCapitalSummary } from './league-buddy/overview/DraftCapitalSummary'
import { CompetitiveStateMap } from './league-buddy/CompetitiveStateMap'
import { COMPETITIVE_STATES } from './league-buddy/competitiveState'
import { AppTooltip } from '@/components/ui/app-tooltip'
import { usePickCapital } from './league-buddy/usePickCapital'
import { useLeagueData } from './league-buddy/useLeagueData'
import { TeamBuilder } from './league-buddy/builder/TeamBuilder'
import { DashboardLayout } from './league-buddy/DashboardLayout'
import { OverviewHeader, type OverviewRankings } from './league-buddy/OverviewHeader'
import { TradeIntelligencePanel } from './league-buddy/TradeIntelligencePanel'
import { LeagueActivityBanner } from './league-buddy/LeagueActivityBanner'
import { PowerRankingsView } from './league-buddy/power-rankings/PowerRankingsView'
import { usePowerRankings } from './league-buddy/power-rankings/usePowerRankings'
import { useDraftOrder } from './league-buddy/draft-order/useDraftOrder'
import { projectLeagueMaxPointsFor } from './league-buddy/draft-order/projectedMaxPointsFor'
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
    leagueContext,
    leagueTransactions,
    valuesReady,
    refetch: fetchLeagueData,
  } = useLeagueData(leagueId, user)

  // Memoized sorted teams to prevent unnecessary re-sorting
  const sortedTeams = useMemo(() => recordOrder(teams), [teams])

  // The Builder's "Consider trading" signals, shown beside Market signals so both answers
  // are visible with their reasons (G1, inventory #29/#30).
  const rosterSignals = useMemo(
    () =>
      new Map(
        selectedTeam && valuesReady
          ? tradeSignals(selectedTeam, teams, rosterPositionsRaw, !isOffSeason()).map((s) => [
              s.playerId,
              s,
            ])
          : []
      ),
    [selectedTeam, teams, rosterPositionsRaw, valuesReady]
  )

  // Memoized league position rankings
  const leaguePositionRankings = useMemo(() => {
    try {
      return calculateLeaguePositionRankings(sortedTeams, leagueContext)
    } catch (error) {
      console.error('Error calculating position rankings:', error)
      return {}
    }
  }, [sortedTeams, leagueContext])

  // Memoized competitive-state placements (Now × Future), computed once per render tree
  const leaguePlacements = useMemo(() => {
    // Placements depend on KTC values; computing earlier shows a state that changes a moment later.
    if (!valuesReady) return { placements: {}, nowMedian: 50, futureMedian: 50 }
    try {
      return calculateLeaguePlacements(teams, !isOffSeason(), leagueContext)
    } catch (error) {
      console.error('Error calculating league placements:', error)
      return { placements: {}, nowMedian: 50, futureMedian: 50 }
    }
  }, [teams, valuesReady, leagueContext])

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

  const { rankings: powerRankings, scores: powerScores } = usePowerRankings(
    teams,
    rosterPositionsRaw
  )

  const {
    season: seasonProjections,
    week: weekProjectionEntries,
    ppgByPlayer: projectedPpg,
    weekByPlayer: weekProjections,
    exact: projectionsExact,
    loading: projectionsLoading,
    error: projectionsError,
    byes: projectionByes,
    updatedAt: projectionsUpdatedAt,
  } = useProjections(leagueId, currentWeek)

  const {
    maxPointsFor,
    weeksCounted,
    season: draftOrderSeason,
    lastRegularWeek,
    maxPointsForCompleted,
    completedWeeks,
    loading: draftOrderLoading,
  } = useDraftOrder(leagueId, currentWeek, allPlayers, rosterPositionsRaw)

  const projection = useMemo(
    () =>
      projectLeagueMaxPointsFor(teams, seasonProjections, rosterPositionsRaw, {
        maxPointsFor,
        maxPointsForCompleted,
        completedWeeks,
        weeksCounted,
        lastRegularWeek,
      }),
    [
      teams,
      seasonProjections,
      rosterPositionsRaw,
      maxPointsFor,
      maxPointsForCompleted,
      completedWeeks,
      weeksCounted,
      lastRegularWeek,
    ]
  )

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
      projectedPerWeek: projection.perWeek,
      weeksCounted,
      remainingWeeks: projection.remainingWeeks,
      season: draftOrderSeason,
      loading: draftOrderLoading,
    }),
    [maxPointsFor, projection, weeksCounted, draftOrderSeason, draftOrderLoading]
  )

  const isDynasty = leagueOverview?.isDynasty === true
  const [picksFocus, setPicksFocus] = useState<string | null>(null)
  const pickCapital = usePickCapital(leagueId, teams, selectedTeam?.rosterId, draftOrder, isDynasty)
  const standing = selectedTeam
    ? recordOrder(teams).findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
    : 0
  const placement = selectedTeam ? leaguePlacements.placements[selectedTeam.rosterId] : undefined
  const coreAge = placement?.avgAge ?? 0
  // Franchise classification lives in the shared header, so no tab repeats it.
  const headerState = isDynasty && placement ? COMPETITIVE_STATES[placement.state] : null

  const overviewRankings = useMemo<OverviewRankings>(
    () => ({
      placements: leaguePlacements,
      positionRankings: leaguePositionRankings,
      powerScores,
      draftOrder,
      weekProjections,
      superflex: leagueContext.superflex,
    }),
    [
      leaguePlacements,
      leaguePositionRankings,
      powerScores,
      draftOrder,
      weekProjections,
      leagueContext.superflex,
    ]
  )

  const overviewActions = useMemo<OverviewActions>(
    () => ({
      openSection: changeSection,
      openTradeMarket: handleTradeMarketClick,
      desktopBuilder,
      isDynasty,
    }),
    [changeSection, handleTradeMarketClick, desktopBuilder, isDynasty]
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
      isDynasty={isDynasty}
      meta={
        <>
          {standing > 0 && (
            <span className="tabular-nums">
              #{standing} of {teams.length}
            </span>
          )}
          {coreAge ? <span className="tabular-nums">Core age {coreAge.toFixed(1)}</span> : null}
          {headerState && (
            <AppTooltip content={headerState.description}>
              <span
                className={`rounded-md border px-1.5 py-0.5 text-badge font-semibold leading-none ${headerState.border} ${headerState.bg} ${headerState.text}`}
              >
                {headerState.label}
              </span>
            </AppTooltip>
          )}
        </>
      }
      aside={
        isDynasty && !pickCapital.error ? (
          <DraftCapitalSummary
            years={pickCapital.years}
            loading={pickCapital.isLoading}
            onOpen={(season) => {
              setPicksFocus(season)
              changeSection('picks')
            }}
          />
        ) : null
      }
    >
      {/* OVERVIEW SECTION */}
      {activeSection === 'overview' && selectedTeam && leagueOverview && (
        <OverviewHeader
          selectedTeam={selectedTeam}
          teams={teams}
          leagueId={leagueId}
          currentMatchups={currentMatchups}
          currentWeek={currentWeek}
          actions={overviewActions}
          rankings={overviewRankings}
        />
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
          leagueContext={leagueContext}
        />
      )}

      {/* Market signals on your own players: sell high, hold, buy low from today's KTC moves. */}
      {activeSection === 'roster' && selectedTeam && (
        <div className="mt-8">
          <SectionHeader
            title="Market signals"
            subtitle="Sell high, hold or buy low, from today's KTC moves"
            className="mb-0"
          />
          <TradeIntelligencePanel
            players={selectedTeam.players}
            leaguePlayerPool={teams.flatMap((t) => t.players)}
            leagueContext={leagueContext}
            rosterSignals={rosterSignals}
          />
        </div>
      )}

      {activeSection === 'picks' &&
        selectedTeam &&
        (leagueOverview?.isDynasty ? (
          <PicksSection
            teams={teams}
            selectedTeam={selectedTeam}
            leagueId={leagueId}
            draftOrder={draftOrder}
            focusSeason={picksFocus}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-line/60 px-4 py-6 text-sm text-slate-400">
            Picks are tracked for dynasty leagues. This league redrafts every season.
          </p>
        ))}

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

      {/* League context: how every franchise is built, and what just happened. */}
      {activeSection === 'league' && selectedTeam && (
        <div className="mt-8 space-y-8">
          {leaguePlacements.placements[selectedTeam.rosterId] && (
            <CompetitiveStateMap
              placements={leaguePlacements}
              teams={teams}
              selectedRosterId={selectedTeam.rosterId}
              powerScores={powerScores}
            />
          )}
          <PowerRankingsView
            rankings={powerRankings}
            selectedTeam={selectedTeam}
            leagueSize={teams.length}
          />
          <LeagueActivityBanner
            transactions={leagueTransactions}
            teams={teams}
            allPlayers={allPlayers}
          />
        </div>
      )}

      {/* AUDIT SECTION */}
    </DashboardLayout>
  )
}
