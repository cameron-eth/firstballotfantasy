'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { playerMomentum } from '@/lib/player-momentum'
import Link from 'next/link'
import {
  ArrowUpRight,
  Search,
  Users,
  ArrowRight,
  Layers,
  Flame,
  Snowflake,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamData, PlayerData } from './types'
import { MetricTip } from './MetricTip'
import { KtcTrend } from './KtcTrend'
import { SleeperActions, type SleeperConnection } from './SleeperActions'
import { computeStartSit } from './projections/startSit'
import type { ProjectionMap } from './projections/useProjections'

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

const POSITION_COLOR: Record<string, string> = {
  QB: 'text-blue-300 bg-blue-400/10',
  RB: 'text-emerald-300 bg-emerald-400/10',
  WR: 'text-amber-300 bg-amber-400/10',
  TE: 'text-violet-300 bg-violet-400/10',
}

function Portrait({ player }: { player: PlayerData }) {
  const [attempt, setAttempt] = useState(0)
  const sources = [
    ...new Set(
      [
        player.headshot_url,
        player.espn_id
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`
          : null,
        `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`,
      ].filter(Boolean)
    ),
  ]
  const src = sources[attempt]
  return (
    <div
      className={cn(
        'relative flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl',
        POSITION_COLOR[player.position] || 'bg-slate-800'
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={96}
          height={96}
          className="h-full w-full object-cover object-top"
          onError={() => setAttempt((value) => value + 1)}
        />
      ) : (
        <Users className="m-auto h-5 w-5 opacity-50" />
      )}
    </div>
  )
}

const points = (value: number | undefined) => (value == null ? '—' : value.toFixed(1))

export function RosterSection({
  leagueId,
  isDynasty,
  onActionComplete,
  selectedTeam,
  sortedTeams,
  teams,
  projections,
}: {
  leagueId: string
  onActionComplete?: () => Promise<void>
  isDynasty: boolean
  selectedTeam: TeamData
  sortedTeams: TeamData[]
  teams: TeamData[]
  projections?: RosterProjections
}) {
  const { data: momentumData } = useSWR(
    '/api/player-momentum',
    async (url) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error('Scoring history unavailable')
      return r.json()
    },
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  )
  const [connection, setConnection] = useState<SleeperConnection | null>(null)
  const [view, setView] = useState<'week' | 'dynasty'>('week')
  const [position, setPosition] = useState('All')
  const [search, setSearch] = useState('')
  const [lineup, setLineup] = useState('All players')
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
        (lineup === 'All players' ||
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
  const value = skill.reduce((sum, p) => sum + (p.ktcValueSf ?? 0), 0)
  const valueRank =
    [...teams]
      .sort(
        (a, b) =>
          b.players.reduce((s, p) => s + (p.ktcValueSf ?? 0), 0) -
          a.players.reduce((s, p) => s + (p.ktcValueSf ?? 0), 0)
      )
      .findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1
  const counts = ['QB', 'RB', 'WR', 'TE'].map((pos) => ({
    pos,
    count: skill.filter((p) => p.position === pos).length,
  }))
  const maxCount = Math.max(1, ...counts.map((p) => p.count))
  const metricHelp: Record<string, string> = {
    'Lineup projection':
      'Sum of available weekly Sleeper forecasts for your current starters, scored with this league’s rules. Partial coverage is labeled.',
    'Dynasty value':
      'Sum of KTC superflex values for skill-position players. This reference uses superflex values even if your league uses another format.',
    'Average age':
      'Average known age of quarterbacks, running backs, receivers and tight ends on this roster.',
    'Roster grade':
      'Relative roster strength from the app’s player rankings, not a prediction of this week’s score.',
  }
  const metricClass =
    'pl-0 odd:border-0 even:border-l even:border-white/10 even:pl-4 sm:border-l sm:border-white/10 sm:pl-4 sm:odd:border-l sm:first:border-0 sm:first:pl-0'

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 sm:space-y-6 font-sans">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-blue-300">
            Your team · Week {projections?.currentWeek ?? '—'}
          </p>
          <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {selectedTeam.teamName}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {selectedTeam.wins}–{selectedTeam.losses}
            {selectedTeam.ties ? `–${selectedTeam.ties}` : ''} record{' '}
            <span className="mx-2 text-slate-600">/</span> #
            {sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1} in league{' '}
            <span className="mx-2 text-slate-600">/</span> {selectedTeam.players.length} players
          </p>
        </div>
        {isDynasty && (
          <Link
            href="/scouting-portal?tab=draftboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Draft board <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </header>

      <section
        aria-label="Team snapshot"
        className="grid grid-cols-2 gap-y-5 rounded-xl border border-white/10 bg-slate-800/40 p-5 sm:grid-cols-4"
      >
        {[
          [
            'Lineup projection',
            projections?.loading
              ? '…'
              : projections?.error ||
                  !startSit ||
                  startSit.noLineupSet ||
                  !Object.keys(projections?.week ?? {}).length
                ? '—'
                : points(startSit.startersProjected),
            `Week ${projections?.currentWeek ?? '—'}${!lineupComplete ? ' · partial coverage' : ' · league scoring'}`,
          ],
          [
            'Dynasty value',
            value ? value.toLocaleString() : '—',
            value ? `KTC superflex · #${valueRank}` : 'KTC superflex',
          ],
          [
            'Average age',
            ages.length ? (ages.reduce((s, p) => s + p.age, 0) / ages.length).toFixed(1) : '—',
            'Skill-position players',
          ],
          [
            'Roster grade',
            selectedTeam.grade || '—',
            `${skill.filter((p) => p.rank > 0 && p.rank <= 36).length} top-36 players`,
          ],
        ].map(([label, val, detail]) => (
          <div key={label} className={metricClass}>
            <p className="text-xs text-slate-400">
              <MetricTip label={label}>{metricHelp[label]}</MetricTip>
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
              {val}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
          </div>
        ))}
      </section>

      <SleeperActions
        leagueId={leagueId}
        team={selectedTeam}
        teams={teams}
        projections={projections}
        onConnect={setConnection}
        onActionComplete={onActionComplete}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_272px]">
        <section
          aria-label="Roster"
          className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pt-4">
            <div
              role="group"
              aria-label="Roster view"
              className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:gap-5"
            >
              {(['week', 'dynasty'] as const).map((key) => (
                <button
                  key={key}
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                  className={cn(
                    'whitespace-nowrap border-b-2 pb-3 text-xs font-semibold sm:text-sm',
                    view === key
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-200'
                  )}
                >
                  {key === 'week' ? 'This week' : 'Dynasty outlook'}
                </button>
              ))}
            </div>
            <span className="hidden shrink-0 pb-3 text-xs text-slate-500 sm:block">
              {filtered.length} players
            </span>
          </div>
          <div className="space-y-3 border-b border-white/10 p-4">
            <div className="flex flex-wrap gap-2">
              <label className="relative min-w-[150px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  aria-label="Search roster"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a player"
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
                />
              </label>
              <select
                aria-label="Lineup filter"
                value={lineup}
                onChange={(e) => setLineup(e.target.value)}
                className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-slate-300"
              >
                {['All players', 'Starters', 'Bench'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div
              role="group"
              aria-label="Position filter"
              className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap"
            >
              {[
                'All',
                ...['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].filter((pos) =>
                  selectedTeam.players.some((p) => p.position === pos)
                ),
                ...Array.from(new Set(selectedTeam.players.map((p) => p.position))).filter(
                  (pos) => !['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pos)
                ),
              ].map((pos) => (
                <button
                  key={pos}
                  aria-pressed={position === pos}
                  onClick={() => setPosition(pos)}
                  className={cn(
                    'whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium sm:py-1',
                    position === pos
                      ? 'bg-blue-400/15 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-800'
                  )}
                >
                  {pos}{' '}
                  <span className="ml-1 opacity-60">
                    {pos === 'All'
                      ? selectedTeam.players.length
                      : selectedTeam.players.filter((p) => p.position === pos).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {view === 'week' && (
            <div
              role="status"
              className="border-b border-white/5 px-4 py-2 text-[11px] text-slate-400"
            >
              {projections?.loading ? (
                'Updating forecasts…'
              ) : projections?.error ? (
                'Forecasts unavailable'
              ) : (
                <MetricTip label="Sleeper projections">
                  {`${projections?.approximate ? 'Some scoring rules are not projected.' : 'Uses league scoring.'} ${projections?.updatedAt ? `Updated ${new Date(projections.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : ''} — means no published forecast.`}
                </MetricTip>
              )}
            </div>
          )}
          <div className="hidden grid-cols-[minmax(0,1fr)_76px_76px_80px] gap-3 border-b border-white/5 bg-slate-800/30 px-4 py-2 text-right text-[10px] uppercase tracking-wider text-slate-500 sm:grid">
            <span className="text-left">Player</span>
            <span>{view === 'week' ? 'Opponent' : 'Rank / Age'}</span>
            <span>
              <MetricTip label={view === 'week' ? 'FPPG' : 'KTC SF'}>
                {view === 'week'
                  ? 'Actual fantasy points per game from the roster stats feed, using its scoring baseline. Not the league-scored forecast.'
                  : 'KeepTradeCut superflex dynasty market value.'}
              </MetricTip>
            </span>
            <span>
              <MetricTip label={view === 'week' ? 'Week proj.' : 'KTC trend'}>
                {view === 'week'
                  ? 'Sleeper weekly projection scored with this league’s rules. Not guaranteed points. Missing forecasts show —.'
                  : 'Change across available daily KTC superflex snapshots. Hover or focus the change for dates.'}
              </MetricTip>
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((player) => {
              const bye = byes.has(player.playerId)
              const weekly = projections?.week[player.playerId]
              const trend = player.ktcTrendDelta
              const momentum = playerMomentum(
                player.ktcHistory,
                momentumData?.history?.[player.playerId]
              )
              return (
                <article
                  key={player.playerId}
                  className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-800/40 sm:grid-cols-[minmax(0,1fr)_76px_76px_80px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Portrait key={player.playerId} player={player} />
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold leading-snug text-slate-100">
                        {player.playerName}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-medium',
                            POSITION_COLOR[player.position]
                          )}
                        >
                          {player.position}
                        </span>
                        <span>{player.team || 'FA'}</span>
                        <span>{starters.has(player.playerId) ? 'Starter' : 'Bench'}</span>
                        {player.injury_status && (
                          <span className="text-rose-300">{player.injury_status}</span>
                        )}
                        {bye && <span className="text-amber-300">Bye</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                        <span
                          className={cn(
                            'inline-flex rounded-md px-2 py-1 font-semibold tabular-nums',
                            momentum.score == null
                              ? 'bg-slate-800 text-slate-500'
                              : momentum.score >= 65
                                ? 'bg-orange-500/10 text-orange-300'
                                : momentum.score <= 35
                                  ? 'bg-sky-500/10 text-sky-300'
                                  : 'bg-slate-800 text-slate-300'
                          )}
                        >
                          <MetricTip
                            label={`Heat ${momentum.score ?? '—'}`}
                            icon={
                              momentum.score != null && momentum.score >= 65 ? (
                                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : momentum.score != null && momentum.score <= 35 ? (
                                <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              )
                            }
                          >
                            Hot: 65–100. Cold: 0–35. Neutral: 36–64. Momentum index, 0–100; 50 is
                            neutral. Equal weight to seven-day KTC SF change (10% saturates) and
                            recent PPR scoring change (50% saturates). Last two played games versus
                            previous played games in six completed weeks. Requires both histories
                            and at least four played games.
                            {momentum.ktc != null &&
                              ` KTC ${(momentum.ktc * 100).toFixed(1)}% (${momentum.from}–${momentum.to}).`}
                            {momentum.recent != null &&
                              ` Recent ${momentum.recent.toFixed(1)} vs prior ${momentum.prior?.toFixed(1)} PPR FPPG.`}
                          </MetricTip>
                        </span>
                        {connection && (
                          <MetricTip label={`Requests ${connection.heat[player.playerId] ?? 0}`}>
                            Unique requesting managers in {connection.historyCount} visible trades
                            {connection.limited ? ' (capped at 200)' : ''}. Separate from momentum.
                          </MetricTip>
                        )}
                        <span className="hidden sm:inline">
                          Season proj. {points(projections?.ppg[player.playerId])} PPG
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 sm:hidden">
                        {view === 'week'
                          ? `${projections?.entries?.[player.playerId]?.opponent ? `vs ${projections.entries[player.playerId].opponent} · ` : ''}Actual ${player.games_played ? points(player.fantasy_ppg) : '—'} FPPG`
                          : `Rank ${player.rank || '—'} · Age ${player.age || '—'} · KTC ${player.ktcValueSf?.toLocaleString() ?? '—'}`}
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-slate-400 sm:block">
                    {view === 'week'
                      ? bye
                        ? 'Bye'
                        : projections?.entries?.[player.playerId]?.opponent || '—'
                      : `#${player.rank || '—'} / ${player.age || '—'}`}
                  </div>
                  <div className="hidden text-right text-sm tabular-nums text-slate-300 sm:block">
                    {view === 'week'
                      ? player.games_played
                        ? points(player.fantasy_ppg)
                        : '—'
                      : (player.ktcValueSf?.toLocaleString() ?? '—')}
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-base font-semibold tabular-nums',
                        view === 'week'
                          ? 'text-blue-200'
                          : trend != null && trend > 0
                            ? 'text-emerald-300'
                            : trend != null && trend < 0
                              ? 'text-rose-300'
                              : 'text-slate-400'
                      )}
                    >
                      {view === 'week' ? (
                        projections?.loading ? (
                          '…'
                        ) : bye ? (
                          'Bye'
                        ) : (
                          points(weekly)
                        )
                      ) : (
                        <KtcTrend history={player.ktcHistory} />
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 sm:hidden">
                      {view === 'week' ? `Week ${projections?.currentWeek ?? '—'}` : 'KTC change'}
                    </p>
                  </div>
                </article>
              )
            })}
            {!filtered.length && (
              <div className="p-10 text-center text-sm text-slate-400">
                No players match these filters.
                <button
                  onClick={() => {
                    setSearch('')
                    setPosition('All')
                    setLineup('All players')
                  }}
                  className="mx-auto mt-3 block text-blue-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
              Lineup check
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Make this week count.</h2>
            {projections?.loading ? (
              <p className="mt-3 text-sm text-slate-400">Loading forecasts…</p>
            ) : !complete ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {projections?.error ||
                  `${missing.length} players have no published weekly forecast. Review availability before comparing lineups.`}
              </p>
            ) : startSit?.noLineupSet ? (
              <p className="mt-3 text-sm text-slate-400">
                Set your starters in Sleeper to compare your lineup.
              </p>
            ) : startSit && startSit.pointsLeft > 0.1 ? (
              <>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-blue-200">
                  +{startSit.pointsLeft.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">potential points</span>
                </p>
                <div className="mt-4 space-y-3">
                  {startSit.swaps
                    .filter((s) => s.start)
                    .slice(0, 3)
                    .map((swap) => (
                      <div
                        key={swap.start!.playerId}
                        className="border-t border-white/10 pt-3 text-xs"
                      >
                        <p className="font-medium text-slate-100">Consider {swap.start!.name}</p>
                        <p className="mt-1 text-slate-400">
                          For {swap.sit?.name ?? 'an empty slot'} · +{swap.gain.toFixed(1)}
                        </p>
                      </div>
                    ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Projection comparison only. Check injuries and game locks in Sleeper.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-300">
                Your current starters match the highest projected lineup.
              </p>
            )}
          </section>
          {isDynasty && (
            <section className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Build your next class</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Explore college prospects alongside your roster depth.
              </p>
              <div className="mt-4 space-y-4">
                {counts.map(({ pos, count }) => (
                  <Link key={pos} href={`/scouting-portal?position=${pos}`} className="group block">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {pos} <span className="ml-1 text-slate-500">{count} rostered</span>
                      </span>
                      <span className="flex items-center gap-1 text-blue-300">
                        Scout <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded bg-slate-700/50">
                      <div
                        className="h-full rounded bg-blue-400/60 group-hover:bg-blue-300"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/scouting-portal?tab=draftboard"
                className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-medium text-slate-300"
              >
                Open your draft board <ArrowRight className="h-3 w-3" />
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
