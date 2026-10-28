'use client'
import { useLeagueFormat } from '@/hooks/use-league-format'

import { Target, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/ui/stat-tile'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import { rankTone } from '@/lib/design/tones'
import type { TierTone } from '@/lib/player-signals'
import type { MatchupData, OverviewActions, TeamData } from './types'
import { isOffSeason, offSeasonCountdown } from '@/lib/season-utils'
import { COMPETITIVE_STATES, type LeaguePlacements } from './competitiveState'
import { CompetitiveStateMap } from './CompetitiveStateMap'
import type { MaxPointsForEntry } from './draft-order/maxPointsFor'
import { GradeBadge } from './ui/Badge'

const RANK_TEXT: Record<TierTone, string> = {
  elite: 'text-elite',
  good: 'text-positive',
  neutral: 'text-slate-200',
  bad: 'text-negative',
}

function RecentFormPips({ form }: { form: string }) {
  if (!form) return <span className="text-xs text-slate-500">—</span>
  const games = form.split('').slice(-5)
  const gameCounts = new Map<string, number>()
  return (
    <span className="flex items-center gap-0.5" aria-label={`Recent form ${games.join(' ')}`}>
      {games.map((g) => {
        const occurrence = (gameCounts.get(g) ?? 0) + 1
        gameCounts.set(g, occurrence)
        return (
          <span
            key={`${form}-${g}-${occurrence}`}
            className={cn(
              'size-2 rounded-full',
              g === 'W' ? 'bg-positive' : g === 'L' ? 'bg-negative' : 'bg-slate-500'
            )}
          />
        )
      })}
    </span>
  )
}

/** Off-season: where the team sits in the grade standings, with its neighbours. */
function OffSeasonStanding({
  sortedTeams,
  selectedTeam,
}: {
  sortedTeams: TeamData[]
  selectedTeam: TeamData
}) {
  const leagueSize = sortedTeams.length
  const gradeRank = sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const windowStart = Math.max(0, Math.min(gradeRank - 2, leagueSize - 3))
  const nearby = sortedTeams.slice(windowStart, windowStart + 3)
  const countdown = offSeasonCountdown()
  return (
    <div className="rounded-xl border border-line/60 bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
        <Sun className="size-4" aria-hidden />
        Off-season{countdown ? ` · ${countdown}` : ''}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div
            className={cn(
              'text-3xl font-semibold tabular-nums',
              RANK_TEXT[rankTone(gradeRank, leagueSize)]
            )}
          >
            #{gradeRank}
          </div>
          <div className="text-2xs text-slate-500">of {leagueSize} by grade</div>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          {nearby.map((team, i) => {
            const selected = team.rosterId === selectedTeam.rosterId
            return (
              <div
                key={team.rosterId}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                  selected ? 'bg-action/10 font-semibold text-white' : 'text-slate-400'
                )}
              >
                <span className="w-6 text-xs tabular-nums text-slate-500">
                  #{windowStart + i + 1}
                </span>
                <GradeBadge grade={team.grade} />
                <span className="truncate">{team.teamName}</span>
              </div>
            )
          })}
        </div>
      </div>
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
}

/** Season Max Points For, the input to the anti-tanking draft-order board. */
export interface OverviewDraftOrder {
  maxPointsFor: Record<number, MaxPointsForEntry>
  /** rosterId → projected season-end Max PF. */
  projectedMaxPointsFor: Record<number, number>
  weeksCounted: number
  remainingWeeks: number
  season: string
  loading: boolean
}

interface OverviewHeaderProps {
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  currentMatchups: MatchupData[]
  currentWeek: number
  teams: TeamData[]
  actions: OverviewActions
  rankings: OverviewRankings
}

export function OverviewHeader({
  selectedTeam,
  sortedTeams,
  currentMatchups,
  currentWeek,
  teams,
  actions,
  rankings,
}: OverviewHeaderProps) {
  const { showScouting } = useLeagueFormat()
  const userMatchup = currentMatchups.find((m) => m.rosterId === selectedTeam.rosterId)
  const pointDiff = userMatchup ? userMatchup.actualPoints - userMatchup.opponentActualPoints : 0
  const isWinning = pointDiff > 0
  const isTied = pointDiff === 0

  // KTC league rank
  const teamTotals = teams.map((t) => ({
    rosterId: t.rosterId,
    total: t.players
      .filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
      .reduce((sum, p) => sum + (p.ktcValueSf ?? 0), 0),
  }))
  teamTotals.sort((a, b) => b.total - a.total)
  const ktcLeagueRank = teamTotals.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const leagueSize = teams.length

  // Top player by KTC
  const topPlayer = selectedTeam.players
    .filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
    .sort((a, b) => (b.ktcValueSf ?? b.rank * -1) - (a.ktcValueSf ?? a.rank * -1))[0]

  // Rank among sorted teams
  const leagueRank = sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1

  // Competitive-state placement (Now × Future), relative to the league
  const { placements, powerScores, weekProjections } = rankings

  // What this team's current starters are projected to score this week. Starters can
  // be empty before a lineup is set, in which case there is nothing to total.
  const projectedThisWeek = (selectedTeam.starters ?? []).reduce(
    (sum, playerId) => sum + (weekProjections[playerId] ?? 0),
    0
  )
  const selectedPlacement = placements.placements[selectedTeam.rosterId]
  const stateMeta = selectedPlacement ? COMPETITIVE_STATES[selectedPlacement.state] : null

  // Win %
  const totalGames = selectedTeam.wins + selectedTeam.losses
  const winPct = totalGames > 0 ? ((selectedTeam.wins / totalGames) * 100).toFixed(0) : '—'

  // League averages, for "you vs the league" comparisons
  const avgPointsFor = teams.reduce((sum, t) => sum + t.pointsFor, 0) / (leagueSize || 1)
  const avgPointsAgainst = teams.reduce((sum, t) => sum + t.pointsAgainst, 0) / (leagueSize || 1)

  const rankText = (rank: number) =>
    rank > 0 ? RANK_TEXT[rankTone(rank, leagueSize)] : 'text-slate-500'
  const pfDelta = selectedTeam.pointsFor - avgPointsFor
  const paDelta = selectedTeam.pointsAgainst - avgPointsAgainst
  const actionButtons = [
    { key: 'trade', label: 'Trade market', onClick: actions.onTradeMarketClick, show: true },
    { key: 'scout', label: 'Scout', onClick: actions.onScoutingPortalClick, show: showScouting },
    { key: 'draft', label: 'Draft board', onClick: actions.onDraftBuddyClick, show: showScouting },
    {
      key: 'playoffs',
      label: 'Playoff odds',
      onClick: actions.onPlayoffOddsClick,
      show: !!actions.onPlayoffOddsClick,
    },
  ].filter((a) => a.show)

  return (
    <section aria-label="Team overview" className="space-y-4">
      {/* The verdict: franchise state is the headline, dynasty rank the one hero number. */}
      <div
        className={cn(
          'flex items-start justify-between gap-4 rounded-xl border bg-surface/40 p-4',
          stateMeta ? stateMeta.border : 'border-line/60'
        )}
      >
        <div className="min-w-0 flex-1">
          {stateMeta && (
            <>
              <div className={cn('flex items-center gap-2 text-xl font-semibold', stateMeta.text)}>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stateMeta.accent }}
                />
                {stateMeta.label}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">{stateMeta.tagline}</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-300">
            <span className="tabular-nums">
              {selectedTeam.wins}–{selectedTeam.losses}
              <span className="ml-1 text-slate-500">({winPct}%)</span>
            </span>
            <RecentFormPips form={selectedTeam.recentForm} />
            <GradeBadge grade={selectedTeam.grade} />
            <span className="text-xs text-slate-500">
              #{leagueRank} of {leagueSize} by grade
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('text-3xl font-semibold tabular-nums', rankText(ktcLeagueRank))}>
            {ktcLeagueRank > 0 ? `#${ktcLeagueRank}` : '—'}
          </div>
          <div className="text-xs text-slate-400">Dynasty value</div>
          <div className="text-2xs text-slate-500">of {leagueSize} teams</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Projected this week"
          value={projectedThisWeek.toFixed(1)}
          valueClassName="text-production"
          detail="Current starters"
        />
        <StatTile
          label="Points for"
          value={selectedTeam.pointsFor.toFixed(1)}
          detail={
            <span className={pfDelta >= 0 ? 'text-positive' : 'text-negative'}>
              {pfDelta >= 0 ? '+' : ''}
              {pfDelta.toFixed(1)} vs league avg
            </span>
          }
        />
        <StatTile
          label="Points against"
          value={selectedTeam.pointsAgainst.toFixed(1)}
          detail={
            <span className={paDelta <= 0 ? 'text-positive' : 'text-negative'}>
              {paDelta >= 0 ? '+' : ''}
              {paDelta.toFixed(1)} vs league avg
            </span>
          }
        />
        <StatTile
          label="Top asset"
          value={topPlayer?.playerName ?? '—'}
          detail={
            topPlayer?.ktcValueSf ? (
              <span className="text-value">KTC {topPlayer.ktcValueSf.toLocaleString()}</span>
            ) : undefined
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {actionButtons.map((a) => (
          <Button key={a.key} variant="subtle" size="xs" onClick={a.onClick}>
            {a.label}
          </Button>
        ))}
        {actions.onPicksClick && (
          <Button variant="subtle" size="xs" onClick={actions.onPicksClick}>
            Picks
          </Button>
        )}
      </div>

      {selectedPlacement && (
        <CompetitiveStateMap
          placements={placements}
          teams={teams}
          selectedRosterId={selectedTeam.rosterId}
          powerScores={powerScores}
        />
      )}

      {isOffSeason() ? (
        <OffSeasonStanding sortedTeams={sortedTeams} selectedTeam={selectedTeam} />
      ) : userMatchup ? (
        <div className="rounded-xl border border-line/60 bg-surface/40 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-sm text-slate-400">Week {currentWeek}</span>
            <span
              className={cn(
                'text-sm font-semibold',
                isWinning ? 'text-positive' : isTied ? 'text-slate-300' : 'text-negative'
              )}
            >
              {isWinning ? 'Winning' : isTied ? 'Tied' : 'Losing'}
              {userMatchup.actualPoints > 0 && ` by ${Math.abs(pointDiff).toFixed(1)}`}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar
                avatarId={selectedTeam.ownerAvatar}
                displayName={selectedTeam.ownerName}
                username={selectedTeam.ownerUsername}
                size={36}
              />
              <div className="min-w-0">
                <div className="truncate text-xs text-slate-400">You</div>
                <div className="text-xl font-semibold tabular-nums text-white">
                  {userMatchup.actualPoints.toFixed(1)}
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-500">vs</span>
            <div className="flex min-w-0 items-center justify-end gap-2 text-right">
              <div className="min-w-0">
                <div className="truncate text-xs text-slate-400">
                  {userMatchup.opponentTeamName}
                </div>
                <div className="text-xl font-semibold tabular-nums text-white">
                  {userMatchup.opponentActualPoints.toFixed(1)}
                </div>
              </div>
              <UserAvatar
                avatarId={userMatchup.opponentAvatar}
                displayName={userMatchup.opponentDisplayName || userMatchup.opponentTeamName}
                username={userMatchup.opponentUsername || userMatchup.opponentTeamName}
                size={36}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line/60 px-4 py-3 text-sm text-slate-400">
          <Target className="size-4" aria-hidden />
          No matchup for week {currentWeek}
        </div>
      )}
    </section>
  )
}
