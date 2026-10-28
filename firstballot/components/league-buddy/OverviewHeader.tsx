'use client'
import { leagueTeamValues } from '@/lib/league-metrics/team-value'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { MatchupData, OverviewActions, TeamData } from './types'
import type { LeaguePlacements } from './competitiveState'
import { BASIS_PHRASE, draftSlots, type DraftSlotInputs } from '@/lib/league-metrics/draft-slots'
import { firstRoundLabel } from './draft-order/draftOrderBoard'
import { UserAvatar } from '@/components/user-avatar'
import { useStandingsOdds } from './useStandingsOdds'
import { recordOrder } from './utils'
import { OverviewMetrics } from './overview/OverviewMetrics'
import { RosterOverview } from './overview/RosterOverview'
import { StandingsSnapshot } from './overview/StandingsSnapshot'
import { NextDraftPanel } from './overview/NextDraftPanel'
import { TradeSuggestions } from './overview/TradeSuggestions'

/** Live score for this week, shown only while a matchup is on. */
function LiveMatchup({
  team,
  matchup,
  week,
}: {
  team: TeamData
  matchup: MatchupData
  week: number
}) {
  const diff = matchup.actualPoints - matchup.opponentActualPoints
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line/60 bg-surface/40 px-4 py-3">
      <span className="text-sm text-slate-400">Week {week}</span>
      <span className="flex min-w-0 items-center gap-2">
        <UserAvatar
          avatarId={team.ownerAvatar}
          displayName={team.ownerName}
          username={team.ownerUsername}
          size={28}
        />
        <span className="text-lg font-semibold tabular-nums text-white">
          {matchup.actualPoints.toFixed(1)}
        </span>
        <span className="text-xs text-slate-500">vs</span>
        <span className="text-lg font-semibold tabular-nums text-white">
          {matchup.opponentActualPoints.toFixed(1)}
        </span>
        <span className="truncate text-sm text-slate-400">{matchup.opponentTeamName}</span>
      </span>
      <span
        className={cn(
          'ml-auto text-sm font-semibold',
          diff > 0 ? 'text-positive' : diff < 0 ? 'text-negative' : 'text-slate-300'
        )}
      >
        {diff > 0 ? 'Winning' : diff < 0 ? 'Losing' : 'Tied'}
        {matchup.actualPoints > 0 && diff !== 0 && ` by ${Math.abs(diff).toFixed(1)}`}
      </span>
    </div>
  )
}

/** The league-wide derived inputs the header reads, grouped into one prop. */
export interface OverviewRankings {
  placements: LeaguePlacements
  positionRankings?: Record<number, Record<string, number>>
  /** rosterId → 0–100 power score; the outlook board ranks on it. */
  powerScores: Record<number, number>
  /** Season Max PF per roster; the projected draft-order board ranks on it. */
  draftOrder: OverviewDraftOrder
  /** playerId → this week's projected points under league scoring. */
  weekProjections: Record<string, number>
  /** League values use superflex pricing. */
  superflex: boolean
}

/** Season Max Points For, the input to the anti-tanking draft-order board. */
export interface OverviewDraftOrder extends DraftSlotInputs {
  season: string
}

interface OverviewHeaderProps {
  selectedTeam: TeamData
  teams: TeamData[]
  leagueId: string
  currentMatchups: MatchupData[]
  currentWeek: number
  actions: OverviewActions
  rankings: OverviewRankings
}

export function OverviewHeader({
  selectedTeam,
  teams,
  leagueId,
  currentMatchups,
  currentWeek,
  actions,
  rankings,
}: OverviewHeaderProps) {
  const { positionRankings = {}, weekProjections, draftOrder, superflex } = rankings
  const leagueSize = teams.length
  const { odds, data: oddsMeta } = useStandingsOdds(leagueId, teams)
  const probability = (rosterId: number) =>
    odds.find((o) => o.rosterId === rosterId)?.playoffProbability
  const order = useMemo(() => recordOrder(teams), [teams])

  // Dynasty rank: the league's one team-value definition (lib/league-metrics/team-value).
  const teamValue = useMemo(
    () => leagueTeamValues(teams, { superflex }).get(selectedTeam.rosterId),
    [teams, selectedTeam, superflex]
  )

  // This week's starter projection for every team, so ours can be ranked.
  const projected = (t: TeamData) =>
    (t.starters ?? []).reduce((sum, id) => sum + (weekProjections[id] ?? 0), 0)
  const projectedThisWeek = projected(selectedTeam)
  const projectedRank =
    projectedThisWeek > 0 ? teams.filter((t) => projected(t) > projectedThisWeek).length + 1 : 0

  // The league's draft-slot policy, so this tile matches the Picks cards and board.
  const draftSlot = useMemo(() => {
    const slots = draftSlots(teams, draftOrder)
    const slot = slots.slotByRoster[selectedTeam.rosterId]
    return slot ? { label: firstRoundLabel(slot), basis: BASIS_PHRASE[slots.basis] } : undefined
  }, [teams, draftOrder, selectedTeam])

  const matchup = currentMatchups.find((m) => m.rosterId === selectedTeam.rosterId)
  const avg = (pick: (t: TeamData) => number) =>
    teams.reduce((sum, t) => sum + pick(t), 0) / (leagueSize || 1)

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <OverviewMetrics
          m={{
            leagueSize,
            valueRank: teamValue?.rank ?? 0,
            valueEstimated: teamValue?.estimated ?? 0,
            playoffOdds: probability(selectedTeam.rosterId),
            playoffSpots: oddsMeta?.spots,
            pointsFor: selectedTeam.pointsFor,
            pointsAgainst: selectedTeam.pointsAgainst,
            avgPointsFor: avg((t) => t.pointsFor),
            avgPointsAgainst: avg((t) => t.pointsAgainst),
            projectedThisWeek,
            projectedRank,
            maxPointsFor: draftOrder.maxPointsFor[selectedTeam.rosterId]?.maxPointsFor,
            draftSlot: actions.isDynasty ? draftSlot : undefined,
          }}
        />
        {matchup && <LiveMatchup team={selectedTeam} matchup={matchup} week={currentWeek} />}
      </div>

      <RosterOverview
        team={selectedTeam}
        positionRanks={positionRankings[selectedTeam.rosterId] ?? {}}
        leagueSize={leagueSize}
        superflex={superflex}
        onOpen={() => actions.openSection(actions.desktopBuilder ? 'builder' : 'roster')}
        openLabel={actions.desktopBuilder ? 'Team Builder' : 'My Team'}
      />

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-3">
        <div className={cn('min-w-0', actions.isDynasty && 'lg:col-span-2')}>
          <StandingsSnapshot
            order={order}
            selectedTeam={selectedTeam}
            maxPointsFor={(id) => draftOrder.maxPointsFor[id]?.maxPointsFor}
            playoffOdds={probability}
            onOpen={() => actions.openSection('league')}
          />
        </div>
        {actions.isDynasty && (
          <NextDraftPanel
            leagueId={leagueId}
            teams={teams}
            team={selectedTeam}
            draftOrder={draftOrder}
            onOpen={() => actions.openSection('picks')}
          />
        )}
      </div>

      <TradeSuggestions
        leagueId={leagueId}
        team={selectedTeam}
        teams={teams}
        onViewAll={() => actions.openSection('roster')}
        onTradeMarket={actions.openTradeMarket}
      />
    </div>
  )
}
