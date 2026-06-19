'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import {
  Trophy,
  Target,
  Sun,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
} from 'lucide-react'
import type {
  MatchupData,
  OverviewActions,
  PlayerRankingsMap,
  TeamData,
} from './types'
import { isOffSeason, offSeasonCountdown } from '@/lib/season-utils'
import { calculateLeaguePlacements, COMPETITIVE_STATES } from './competitiveState'
import { CompetitiveStateMap } from './CompetitiveStateMap'

const GRADE_COLORS = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  A: 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  B: 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-500/20 text-green-500 border-green-500',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  C: 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-500/20 text-blue-500 border-blue-500',
  'D+': 'bg-orange-400/20 text-orange-400 border-orange-400',
  D: 'bg-orange-400/20 text-orange-400 border-orange-400',
  'D-': 'bg-red-400/20 text-red-400 border-red-400',
  F: 'bg-red-500/20 text-red-500 border-red-500',
}

const POSITION_STRENGTH_COLOR = (score: number) => {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 60) return 'bg-yellow-400'
  if (score >= 40) return 'bg-orange-400'
  return 'bg-red-500'
}

function getRecentFormIcon(form: string) {
  if (!form) return null
  const lastChar = form.slice(-1)
  if (lastChar === 'W') return <TrendingUp className="h-3 w-3 text-emerald-400" />
  if (lastChar === 'L') return <TrendingDown className="h-3 w-3 text-red-400" />
  return <Minus className="h-3 w-3 text-slate-400" />
}

function RecentFormPips({ form }: { form: string }) {
  if (!form) return <span className="text-slate-500 text-xs">—</span>
  const games = form.split('').slice(-5)
  const gameCounts = new Map<string, number>()
  return (
    <div className="flex items-center gap-0.5">
      {games.map((g) => {
        const occurrence = (gameCounts.get(g) ?? 0) + 1
        gameCounts.set(g, occurrence)

        return (
          <div
            key={`${form}-${g}-${occurrence}`}
            className={`w-2 h-2 rounded-full ${
              g === 'W' ? 'bg-emerald-400' : g === 'L' ? 'bg-red-500' : 'bg-slate-500'
            }`}
          />
        )
      })}
    </div>
  )
}

interface OverviewHeaderProps {
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  playerRankings: PlayerRankingsMap
  currentMatchups: MatchupData[]
  currentWeek: number
  teams: TeamData[]
  actions: OverviewActions
}

export function OverviewHeader({
  selectedTeam,
  sortedTeams,
  playerRankings,
  currentMatchups,
  currentWeek,
  teams,
  actions,
}: OverviewHeaderProps) {
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

  // Position strengths
  const posStrengths = selectedTeam.positionStrengths

  // Rank among sorted teams
  const leagueRank = sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1

  // Competitive-state placements (Now × Future), relative to the league
  const placements = calculateLeaguePlacements(teams, !isOffSeason())
  const selectedPlacement = placements.placements[selectedTeam.rosterId]
  const stateMeta = selectedPlacement ? COMPETITIVE_STATES[selectedPlacement.state] : null

  // Win %
  const totalGames = selectedTeam.wins + selectedTeam.losses
  const winPct = totalGames > 0 ? ((selectedTeam.wins / totalGames) * 100).toFixed(0) : '—'

  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden">
      {/* State-colored accent strip — instant whole-header signal */}
      {stateMeta && (
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${stateMeta.accent} 0%, ${stateMeta.accent}33 100%)`,
          }}
        />
      )}
      <CardContent className="p-5">

        {/* ════ TIER 1 · IDENTITY + VERDICT ════ */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <UserAvatar
              avatarId={selectedTeam.ownerAvatar}
              displayName={selectedTeam.ownerName}
              username={selectedTeam.ownerUsername}
              size={52}
              className="ring-2 ring-yellow-400/30 flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-yellow-400 font-mono leading-tight truncate">
                {selectedTeam.teamName}
              </h2>
              <div className="text-slate-400 text-xs mt-0.5 truncate">
                {selectedTeam.ownerName}
                {selectedTeam.ownerUsername && (
                  <span className="text-slate-600"> · @{selectedTeam.ownerUsername}</span>
                )}
              </div>
              {/* Muted meta strip */}
              <div className="flex items-center gap-2.5 mt-2 flex-wrap text-slate-500">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span className="font-mono text-xs text-slate-400">
                    {selectedTeam.wins}-{selectedTeam.losses}
                  </span>
                  <span className="text-[10px]">({winPct}%)</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-xs">PF {selectedTeam.pointsFor.toFixed(1)}</span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase">Form</span>
                  <RecentFormPips form={selectedTeam.recentForm} />
                </span>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-xs">{selectedTeam.totalMoves} moves</span>
              </div>
            </div>
          </div>

          {/* Verdict — the headline signal */}
          {stateMeta && (
            <div className="flex flex-col items-end flex-shrink-0 text-right">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stateMeta.accent }}
                />
                <span
                  className="text-2xl font-black font-mono uppercase tracking-tight leading-none"
                  style={{ color: stateMeta.accent }}
                >
                  {stateMeta.label}
                </span>
              </div>
              <span className="text-slate-500 text-[11px] font-mono mt-1">{stateMeta.tagline}</span>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono font-bold px-1.5 py-0 ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}
                >
                  {selectedTeam.grade}
                </Badge>
                <span className="text-slate-500 text-xs font-mono">#{leagueRank} of {leagueSize}</span>
              </div>
            </div>
          )}
        </div>

        {/* ════ TIER 2 · PRIMARY SIGNAL: franchise outlook ════ */}
        {selectedPlacement && (
          <div className="mb-4">
            <CompetitiveStateMap
              placements={placements}
              teams={teams}
              selectedRosterId={selectedTeam.rosterId}
            />
          </div>
        )}

        {/* ════ TIER 3 · SUPPORTING EVIDENCE ════ */}
        <div className="grid grid-cols-3 gap-px bg-slate-700/30 rounded-lg overflow-hidden mb-2">
          {/* Dynasty Rank */}
          <div className="bg-slate-800/80 px-3 py-2">
            <div className="text-slate-500 text-[9px] font-mono uppercase mb-0.5">Dynasty Rank</div>
            <div className="flex items-baseline gap-1">
              <span className={`text-base font-black font-mono ${
                ktcLeagueRank === 0
                  ? 'text-slate-500'
                  : ktcLeagueRank <= Math.ceil(leagueSize / 4)
                  ? 'text-emerald-400'
                  : ktcLeagueRank <= Math.ceil(leagueSize / 2)
                  ? 'text-yellow-400'
                  : 'text-orange-400'
              }`}>
                {ktcLeagueRank > 0 ? `#${ktcLeagueRank}` : '—'}
              </span>
              {ktcLeagueRank > 0 && (
                <span className="text-slate-600 text-[10px] font-mono">of {leagueSize}</span>
              )}
            </div>
          </div>

          {/* Top Asset */}
          <div className="bg-slate-800/80 px-3 py-2 min-w-0">
            <div className="text-slate-500 text-[9px] font-mono uppercase mb-0.5">Top Asset</div>
            {topPlayer ? (
              <div className="min-w-0">
                <div className="text-slate-200 text-xs font-semibold truncate leading-tight">
                  {topPlayer.playerName}
                </div>
                <div className="text-slate-500 text-[10px] font-mono truncate">
                  #{topPlayer.rank}
                  {topPlayer.ktcValueSf ? ` · ${topPlayer.ktcValueSf.toLocaleString()}` : ''}
                </div>
              </div>
            ) : (
              <span className="text-slate-600 text-xs">—</span>
            )}
          </div>

          {/* Proj / Wk */}
          <div className="bg-slate-800/80 px-3 py-2">
            <div className="text-slate-500 text-[9px] font-mono uppercase mb-0.5">Proj / Wk</div>
            <span className="text-base font-black font-mono text-yellow-400">
              {selectedTeam.players
                .reduce((sum, player) => sum + (playerRankings[player.playerName]?.projection || 0), 0)
                .toFixed(1)}
            </span>
          </div>
        </div>

        {/* Position strength — compact inline */}
        <div className="bg-slate-900/30 rounded-lg px-4 py-2.5 mb-4 border border-slate-700/30">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <span className="text-slate-500 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
              <Star className="h-3 w-3" /> Position Strength
            </span>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              {(['QB', 'RB', 'WR', 'TE'] as const).map((pos) => {
                const score = posStrengths?.[pos] ?? 0
                return (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] font-mono w-5 flex-shrink-0">{pos}</span>
                    <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${POSITION_STRENGTH_COLOR(score)}`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-[10px] font-mono font-bold w-5 text-right flex-shrink-0">{score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ════ TIER 4 · ACTIONS ════ */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={actions.onTradeMarketClick}
            className="flex-1 min-w-[5.5rem] rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
          >
            Trade
          </button>
          <button
            type="button"
            onClick={actions.onScoutingPortalClick}
            className="flex-1 min-w-[5.5rem] rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
          >
            Scout
          </button>
          <button
            type="button"
            onClick={actions.onDraftBuddyClick}
            className="flex-1 min-w-[5.5rem] rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
          >
            Draft
          </button>
          {actions.onPlayoffOddsClick ? (
            <button
              type="button"
              onClick={actions.onPlayoffOddsClick}
              className="flex-1 min-w-[5.5rem] rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
            >
              Playoffs
            </button>
          ) : null}
        </div>

        {/* ── MATCHUP / OFF-SEASON PANEL ── */}
        {isOffSeason() ? (() => {
          const gradeRank = sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
          const rankColor = gradeRank <= Math.ceil(leagueSize / 4)
            ? 'text-emerald-400'
            : gradeRank <= Math.ceil(leagueSize / 2)
            ? 'text-yellow-400'
            : 'text-orange-400'
          const suffix = gradeRank === 1 ? 'ST' : gradeRank === 2 ? 'ND' : gradeRank === 3 ? 'RD' : 'TH'
          const windowStart = Math.max(0, Math.min(gradeRank - 2, leagueSize - 3))
          const nearbyTeams = sortedTeams.slice(windowStart, windowStart + 3)

          return (
            <div className="bg-gradient-to-r from-yellow-400/5 to-amber-400/5 rounded-lg p-4 border border-yellow-400/20">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="h-3.5 w-3.5 text-yellow-400/60" />
                  <span className="text-yellow-400/70 font-mono text-xs font-semibold uppercase tracking-wider">Off-Season</span>
                  {offSeasonCountdown() && (
                    <>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-500 text-xs">{offSeasonCountdown()}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Medal className="h-3.5 w-3.5 text-yellow-400/60" />
                  <span className="text-slate-400 text-xs font-mono">League Standing</span>
                </div>
              </div>

              {/* Content row */}
              <div className="flex items-center gap-4">
                {/* Big rank */}
                <div className="flex-shrink-0 text-center min-w-[72px]">
                  <div className={`font-black font-mono leading-none ${rankColor}`}>
                    <span className="text-4xl">{gradeRank}</span>
                    <span className="text-xl">{suffix}</span>
                  </div>
                  <div className="text-slate-500 text-[10px] font-mono mt-0.5">of {leagueSize}</div>
                </div>

                {/* Divider */}
                <div className="w-px h-14 bg-slate-700 flex-shrink-0" />

                {/* Mini standings */}
                <div className="flex-1 space-y-1">
                  {nearbyTeams.map((team, i) => {
                    const pos = windowStart + i + 1
                    const isSelected = team.rosterId === selectedTeam.rosterId
                    return (
                      <div
                        key={team.rosterId}
                        className={`flex items-center gap-2 rounded px-2 py-0.5 ${
                          isSelected ? 'bg-yellow-400/10 border border-yellow-400/30' : ''
                        }`}
                      >
                        <span className={`text-xs font-mono font-bold w-5 tabular-nums ${isSelected ? 'text-yellow-400' : 'text-slate-500'}`}>
                          #{pos}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 font-mono border ${GRADE_COLORS[team.grade as keyof typeof GRADE_COLORS] ?? 'text-slate-400 border-slate-600'}`}
                        >
                          {team.grade}
                        </Badge>
                        <span className={`text-xs truncate flex-1 ${isSelected ? 'text-yellow-400 font-semibold' : 'text-slate-400'}`}>
                          {team.teamName}
                        </span>
                        {isSelected && <TrendingUp className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className="w-px h-14 bg-slate-700 flex-shrink-0" />

                {/* Grade */}
                <div className="flex-shrink-0 text-center min-w-[48px]">
                  <div className={`text-3xl font-black font-mono ${
                    GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]?.split(' ')[1] ?? 'text-slate-300'
                  }`}>
                    {selectedTeam.grade}
                  </div>
                  <div className="text-slate-500 text-[10px] font-mono mt-0.5">grade</div>
                </div>
              </div>
            </div>
          )
        })() : userMatchup ? (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-center mb-2">
              <div className="text-slate-500 font-mono text-xs mb-1">WEEK {currentWeek}</div>
              <div
                className={`text-sm font-bold ${isWinning ? 'text-green-400' : isTied ? 'text-slate-300' : 'text-red-400'}`}
              >
                {isWinning ? 'WINNING' : isTied ? 'TIED' : 'LOSING'}
                {userMatchup.actualPoints > 0 && (
                  <span className="ml-2">by {Math.abs(pointDiff).toFixed(1)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Your Team */}
              <div className="flex flex-col items-center space-y-1 flex-1">
                <UserAvatar
                  avatarId={selectedTeam.ownerAvatar}
                  displayName={selectedTeam.ownerName}
                  username={selectedTeam.ownerUsername}
                  size={40}
                  className="ring-2 ring-yellow-400/50 flex-shrink-0"
                />
                <div className="text-center">
                  <div className="text-slate-400 text-xs font-mono mb-1">YOU</div>
                  <div className="text-xl font-bold text-slate-100 font-mono">
                    {userMatchup.actualPoints > 0 ? userMatchup.actualPoints.toFixed(1) : '0'}
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="text-slate-600 font-mono text-sm px-2 flex-shrink-0">VS</div>

              {/* Opponent Team */}
              <div className="flex flex-col items-center space-y-1 flex-1">
                <UserAvatar
                  avatarId={userMatchup.opponentAvatar}
                  displayName={userMatchup.opponentDisplayName || userMatchup.opponentTeamName}
                  username={userMatchup.opponentUsername || userMatchup.opponentTeamName}
                  size={40}
                  className="ring-2 ring-blue-400/50 flex-shrink-0"
                />
                <div className="text-center">
                  <div className="text-slate-400 text-xs font-mono mb-1 truncate">
                    {userMatchup.opponentTeamName.toUpperCase()}
                  </div>
                  <div className="text-xl font-bold text-slate-100 font-mono">
                    {userMatchup.opponentActualPoints > 0
                      ? userMatchup.opponentActualPoints.toFixed(1)
                      : '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Target className="h-6 w-6 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No matchup for Week {currentWeek}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
