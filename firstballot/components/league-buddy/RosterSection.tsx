'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamData, PlayerData } from './types'
import { KtcTrend } from './KtcTrend'
import { SleeperActions, type SleeperConnection } from './SleeperActions'
import { computeStartSit } from './projections/startSit'
import type { ProjectionMap } from './projections/useProjections'
import { TeamHero } from './TeamHero'
import { leagueTeamValues } from '@/lib/league-metrics/team-value'
import { ktcValue, type LeagueContext } from '@/lib/sleeper-sdk'
import { PlayerFace } from './ui/PlayerFace'
import {
  HeatBadge,
  InjuryBadge,
  PositionBadge,
  RankBadge,
  StatusBadge,
  TierBadge,
  VALUE_TONE,
} from './ui/Badge'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'

export interface RosterProjections {
  ppg: Record<string, number>
  week: Record<string, number>
  entries?: ProjectionMap
  byes?: string[]
  updatedAt?: string
  error?: string | null
  rosterPositions: string[]
  currentWeek: number
  approximate: boolean
  loading: boolean
}

const points = (value: number | undefined) => (value == null ? '—' : value.toFixed(1))

const tierProp = (p: PlayerData) =>
  p.tierNumber && p.tierEmphasis
    ? {
        number: p.tierNumber,
        name: p.tier,
        emphasis: p.tierEmphasis,
        score: p.tierScore ?? undefined,
        rank: p.tierRank ?? undefined,
        positionRank: p.tierPositionRank,
        delta30: p.ktcDelta30,
      }
    : undefined

export function RosterSection({
  leagueId,
  isDynasty,
  onActionComplete,
  selectedTeam,
  teams,
  projections,
  leagueContext,
}: {
  leagueId: string
  onActionComplete?: () => Promise<void>
  isDynasty: boolean
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  teams: TeamData[]
  projections?: RosterProjections
  leagueContext: LeagueContext
}) {
  const [connection, setConnection] = useState<SleeperConnection | null>(null)
  const [view, setView] = useState<'week' | 'dynasty'>('week')
  const [position, setPosition] = useState('All')
  const [search, setSearch] = useState('')
  const [lineup, setLineup] = useState<'All' | 'Starters' | 'Bench'>('All')
  const starters = new Set(selectedTeam.starters)
  const byes = new Set(projections?.byes ?? [])
  const startSit = useMemo(
    () =>
      projections
        ? computeStartSit(
            selectedTeam.players,
            selectedTeam.starters,
            projections.week,
            projections.rosterPositions
          )
        : null,
    [selectedTeam, projections]
  )
  const missing = selectedTeam.players.filter(
    (p) => projections?.week[p.playerId] == null && !byes.has(p.playerId)
  )
  const lineupComplete = selectedTeam.starters
    .filter((id) => id && id !== '0')
    .every((id) => projections?.week[id] != null || byes.has(id))
  const complete =
    !!projections && !projections.loading && !projections.error && missing.length === 0
  const filtered = selectedTeam.players
    .filter(
      (p) =>
        (position === 'All' || p.position === position) &&
        p.playerName.toLowerCase().includes(search.toLowerCase()) &&
        (lineup === 'All' ||
          (lineup === 'Starters' ? starters.has(p.playerId) : !starters.has(p.playerId)))
    )
    .sort((a, b) =>
      view === 'week'
        ? Number(starters.has(b.playerId)) - Number(starters.has(a.playerId)) ||
          (projections?.week[b.playerId] ?? -Infinity) -
            (projections?.week[a.playerId] ?? -Infinity) ||
          a.playerName.localeCompare(b.playerName)
        : (a.rank || 999) - (b.rank || 999)
    )
  const skill = selectedTeam.players.filter((p) => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
  const ages = skill.filter((p) => p.age > 0)
  // Quality-weighted team value: stars count more than depth, the deep bench barely counts.
  const teamValue = leagueTeamValues(teams, leagueContext).get(selectedTeam.rosterId)
  const value = teamValue?.value ?? 0
  const valueRank = teamValue?.rank ?? 0
  const productionRank =
    [...teams]
      .sort((a, b) => b.pointsFor - a.pointsFor)
      .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const metricHelp: Record<string, string> = {
    Production:
      'Fantasy points scored this season (points for), ranked against every team in the league.',
    'Lineup projection':
      'Sum of available weekly Sleeper forecasts for your current starters, scored with this league’s rules. Partial coverage is labeled.',
    'Team value': `Quality-weighted KTC ${leagueContext.superflex ? 'superflex' : '1QB'} value: each player counts more than proportionally to their value, your best nine count fully and deeper bench players count less, so a pile of depth cannot outrank a few stars.`,
    'Average age':
      'Average known age of quarterbacks, running backs, receivers and tight ends on this roster.',
    'Roster grade':
      'League-relative score: 70% quality-weighted dynasty value, 30% quality-weighted points per game. Stars count more than depth, so a pile of bench players does not raise it. Not a prediction of this week’s score.',
  }
  const starterPlayers = selectedTeam.starters
    .filter((id) => id && id !== '0')
    .map((id) => selectedTeam.players.find((p) => p.playerId === id))
    .filter((p): p is PlayerData => !!p)
  const valueOf = (p: PlayerData) => ktcValue(p, leagueContext)
  const faces = [...skill].sort((a, b) => (valueOf(b) ?? 0) - (valueOf(a) ?? 0)).slice(0, 5)
  const swaps =
    startSit && complete && !startSit.noLineupSet
      ? startSit.swaps.filter((s) => s.start).slice(0, 3)
      : []
  const positions = ['QB', 'RB', 'WR', 'TE'].filter((pos) =>
    selectedTeam.players.some((p) => p.position === pos)
  )
  const stats = [
    {
      label: 'Lineup projection',
      help: metricHelp['Lineup projection'],
      value: projections?.loading
        ? '…'
        : projections?.error ||
            !startSit ||
            startSit.noLineupSet ||
            !Object.keys(projections?.week ?? {}).length
          ? '—'
          : points(startSit.startersProjected),
      detail: `Week ${projections?.currentWeek ?? '—'}${!lineupComplete ? ' · partial' : ''}`,
      accent: 'text-blue-200',
    },
    {
      label: 'Team value',
      help: metricHelp['Team value'],
      value: value ? value.toLocaleString() : '—',
      detail: value ? <RankBadge kind="value" rank={valueRank} of={teams.length} /> : undefined,
      accent: 'text-amber-100',
    },
    {
      label: 'Production',
      help: metricHelp['Production'],
      value: selectedTeam.pointsFor ? selectedTeam.pointsFor.toFixed(1) : '—',
      detail: selectedTeam.pointsFor ? (
        <RankBadge kind="production" rank={productionRank} of={teams.length} />
      ) : undefined,
      accent: 'text-sky-100',
    },
    {
      label: 'Roster grade',
      help: metricHelp['Roster grade'],
      value: selectedTeam.grade || '—',
      detail: undefined,
      accent: /^A/.test(selectedTeam.grade)
        ? 'text-amber-200'
        : /^B/.test(selectedTeam.grade)
          ? 'text-emerald-200'
          : /^[DF]/.test(selectedTeam.grade)
            ? 'text-rose-300'
            : 'text-white',
    },
    {
      label: 'Average age',
      help: metricHelp['Average age'],
      value: ages.length ? (ages.reduce((s, p) => s + p.age, 0) / ages.length).toFixed(1) : '—',
      detail: undefined,
      accent: 'text-white',
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      <TeamHero stats={stats} faces={faces} grade={selectedTeam.grade || '—'} />

      <SleeperActions
        leagueId={leagueId}
        team={selectedTeam}
        teams={teams}
        projections={projections}
        onConnect={setConnection}
        onActionComplete={onActionComplete}
      />

      {starterPlayers.length > 0 && (
        <section aria-label="Starting lineup" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Starting lineup</h2>
            {startSit && complete && !startSit.noLineupSet && startSit.pointsLeft > 0.1 ? (
              <p className="text-xs text-blue-200">
                +{startSit.pointsLeft.toFixed(1)} projected points on the table
              </p>
            ) : complete && startSit && !startSit.noLineupSet ? (
              <p className="text-xs text-emerald-300">Best projected lineup</p>
            ) : null}
          </div>
          <div className="-mx-3 -my-3 flex snap-x gap-3 overflow-x-auto px-3 py-4">
            {starterPlayers.map((player) => (
              <div key={player.playerId} className="w-48 shrink-0 snap-start">
                <PlayerTradingCard
                  compact
                  imageHeight="h-28"
                  name={player.playerName}
                  position={player.position}
                  team={player.team || 'FA'}
                  image={
                    player.headshot_url ||
                    `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`
                  }
                  tier={tierProp(player)}
                  shoulderBadge={
                    player.fppg_rank
                      ? {
                          label: `${player.fppg_position ?? player.position}${player.fppg_rank}`,
                          description: `Production: ${player.fppg_position ?? player.position}${player.fppg_rank} by ${player.stats_season ?? ''} PPR points per game`,
                        }
                      : undefined
                  }
                  label={
                    byes.has(player.playerId)
                      ? 'Bye week'
                      : `${points(projections?.week[player.playerId])} proj`
                  }
                >
                  {valueOf(player) != null && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Value</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-semibold tabular-nums ${VALUE_TONE}`}
                      >
                        {valueOf(player)?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </PlayerTradingCard>
              </div>
            ))}
          </div>
          {swaps.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs text-slate-300">
              {swaps.map((swap) => (
                <li
                  key={swap.start!.playerId}
                  className="rounded-lg border border-blue-300/25 bg-blue-300/5 px-3 py-1.5"
                >
                  Start <span className="font-semibold text-white">{swap.start!.name}</span>
                  {swap.sit ? <> over {swap.sit.name}</> : null}{' '}
                  <span className="text-blue-200">+{swap.gain.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Roster" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">
            Roster{' '}
            <span className="ml-1 text-sm font-normal text-slate-500">{filtered.length}</span>
          </h2>
          <div
            role="group"
            aria-label="Roster view"
            className="flex gap-1 rounded-lg border border-white/10 bg-slate-900/70 p-1 text-xs"
          >
            {(['week', 'dynasty'] as const).map((key) => (
              <button
                key={key}
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 font-medium transition',
                  view === key ? 'bg-blue-400/20 text-blue-100' : 'text-slate-400 hover:text-white'
                )}
              >
                {key === 'week' ? 'This week' : 'Dynasty'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              aria-label="Search roster"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a player"
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-900/70 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <div role="group" aria-label="Lineup filter" className="flex gap-1 text-xs">
            {(['All', 'Starters', 'Bench'] as const).map((key) => (
              <button
                key={key}
                aria-pressed={lineup === key}
                onClick={() => setLineup(key)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 font-medium',
                  lineup === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                )}
              >
                {key}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Position filter" className="flex gap-1 text-xs">
            {['All', ...positions].map((pos) => {
              const palette = positionPalette[pos] ?? neutralPalette
              return (
                <button
                  key={pos}
                  aria-pressed={position === pos}
                  onClick={() => setPosition(pos)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 font-semibold transition',
                    position === pos
                      ? 'bg-white/10'
                      : 'border-transparent text-slate-400 hover:text-white'
                  )}
                  style={
                    position === pos
                      ? { color: palette.ink, borderColor: `${palette.ink}55` }
                      : undefined
                  }
                >
                  {pos}
                </button>
              )
            })}
          </div>
        </div>
        {view === 'week' && (projections?.loading || projections?.error) && (
          <p role="status" className="text-[11px] text-slate-500">
            {projections.loading ? 'Updating forecasts…' : 'Forecasts unavailable'}
          </p>
        )}
        <div
          role="region"
          aria-label="Player records"
          tabIndex={0}
          className="max-h-[70vh] space-y-2 overflow-y-auto overscroll-y-contain pr-1 focus-visible:outline focus-visible:outline-blue-400"
        >
          {filtered.map((player) => {
            const bye = byes.has(player.playerId)
            const weekly = projections?.week[player.playerId]
            const starter = starters.has(player.playerId)
            const palette = positionPalette[player.position] ?? neutralPalette
            return (
              <article
                key={player.playerId}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-2.5 pr-4 transition hover:border-white/25 hover:bg-slate-900"
                style={{ boxShadow: `inset 3px 0 0 ${palette.glow}` }}
              >
                <PlayerFace player={player} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {player.playerName}
                    </h3>
                    <TierBadge
                      tierNumber={player.tierNumber}
                      position={player.position}
                      positionRank={player.tierPositionRank}
                    />
                    <HeatBadge delta30={player.ktcDelta30} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <PositionBadge position={player.position} />
                    <span>{player.team || 'FA'}</span>
                    <StatusBadge status={bye ? 'Bye' : starter ? 'Starter' : 'Bench'} />
                    {player.injury_status && <InjuryBadge status={player.injury_status} />}
                    {connection && (connection.heat[player.playerId] ?? 0) > 0 && (
                      <span title={`Requested by ${connection.heat[player.playerId]} managers`}>
                        · {connection.heat[player.playerId]} requests
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {view === 'week' ? (
                    <>
                      <p className="text-xl font-semibold tabular-nums text-blue-200">
                        {projections?.loading ? '…' : bye ? 'Bye' : points(weekly)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        proj
                        {player.games_played ? ` · ${points(player.fantasy_ppg)} FPPG` : ''}
                        {projections?.entries?.[player.playerId]?.opponent
                          ? ` · vs ${projections.entries[player.playerId].opponent}`
                          : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-semibold tabular-nums text-white">
                        {valueOf(player)?.toLocaleString() ?? '—'}
                      </p>
                      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500">
                        <span>
                          #{player.rank || '—'} · {player.age || '—'}y
                        </span>
                        <KtcTrend history={player.ktcHistory} ctx={leagueContext} />
                      </div>
                    </>
                  )}
                </div>
              </article>
            )
          })}
          {!filtered.length && (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">
              No players match these filters.
              <button
                onClick={() => {
                  setSearch('')
                  setPosition('All')
                  setLineup('All')
                }}
                className="mx-auto mt-3 block text-blue-300"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {isDynasty && (
        <Link
          href="/scouting-portal?tab=draftboard"
          className="flex items-center justify-between rounded-2xl border border-violet-300/25 bg-violet-400/5 px-4 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-400/10"
        >
          Scout your next class
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
