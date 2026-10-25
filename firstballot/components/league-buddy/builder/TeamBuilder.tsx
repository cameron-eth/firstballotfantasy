'use client'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { plannedPositionCount, type Scenario, type Target } from '@/lib/team-scenarios'
import { PlayerTradeModal } from '../trades/PlayerTradeModal'
import type { PlayerData, TeamData } from '../types'
import type { Prospect } from '@/components/scouting/types'
import { StrategyCard } from './StrategyCard'
import { RosterCardStack } from './RosterCardStack'
import { BuilderTeamSummary } from './BuilderTeamSummary'
import type { TeamPlacement } from '../competitiveState'
import { useBoardFit, BoardFitStack } from './BoardFit'
import { useTeamTimeline, DraftFitNote, type TimelineDraftOrder } from './TeamTimeline'
import { useCanvasZoom } from './useCanvasZoom'

const fresh = (): Scenario => ({
  id: crypto.randomUUID(),
  name: 'My team plan',
  notes: '',
  outgoing: [],
  targets: [],
})
const input = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200'
const button =
  'rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40'
const fetchProspects = async (url: string): Promise<Prospect[]> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('College prospects could not load.')
  const rows: Prospect[] = await r.json()
  return rows.filter((p) => p.draft_year !== null && p.draft_year >= new Date().getFullYear() + 1)
}

export function TeamBuilder({
  team,
  teams,
  leagueId,
  isDynasty,
  placement,
  draftOrder,
}: {
  team: TeamData
  teams: TeamData[]
  leagueId: string
  isDynasty: boolean
  placement?: TeamPlacement
  draftOrder?: TimelineDraftOrder
}) {
  const { user, loading: authLoading } = useAuth()
  const [tradePlayer, setTradePlayer] = useState<PlayerData | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [active, setActive] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'trade' | 'draft'>('trade')
  const [position, setPosition] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const { viewportRef, zoom } = useCanvasZoom()
  const endpoint = `/api/team-scenarios?league=${leagueId}&roster=${team.rosterId}`
  const {
    data: prospects = [],
    error: prospectError,
    isLoading: prospectsLoading,
    mutate,
  } = useSWR(isDynasty ? '/api/prospects?draft_year=all' : null, fetchProspects)
  const accountKey = `${user?.id ?? 'guest'}:${endpoint}`
  const {
    data: saved,
    error: loadError,
    mutate: retrySaved,
  } = useSWR(
    !authLoading && user ? [endpoint, user.id] : null,
    async ([url]: [string, string]): Promise<Scenario[]> => {
      const r = await fetch(url, { cache: 'no-store' })
      const data = await r.json()
      if (!r.ok)
        throw new Error('Could not load your saved plans. Retry to avoid overwriting them.')
      return data.scenarios
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )
  useEffect(() => {
    if (authLoading || loadedKey === accountKey || (user && !saved)) return
    const list = saved?.length ? saved : [fresh()]
    setScenarios(list)
    setActive(list[0].id)
    setReady(true)
    setLoadedKey(accountKey)
    setDirty(false)
    setMessage('')
  }, [authLoading, loadedKey, accountKey, user, saved])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const scenario = scenarios.find((s) => s.id === active)
  const timeline = useTeamTimeline({
    enabled: isDynasty,
    leagueId,
    team,
    teams,
    scenario,
    prospects,
    draftOrder,
  })
  const board = useBoardFit(isDynasty, prospects, timeline.horizon)
  const view = timeline.view ?? scenario
  const update = (patch: Partial<Scenario>) => {
    setScenarios((all) => all.map((s) => (s.id === active ? { ...s, ...patch } : s)))
    setDirty(true)
    setMessage('')
  }
  async function save() {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setDirty(false)
      await retrySaved(scenarios, { revalidate: false })
      setMessage('Saved to your account.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }
  const nfl = useMemo(
    () =>
      teams
        .filter((t) => t.rosterId !== team.rosterId)
        .flatMap((t) =>
          t.players.map((p) => ({
            id: `nfl:${p.playerId}`,
            name: p.playerName,
            position: p.position,
            team: `${p.team} · ${t.teamName}`,
            image: p.headshot_url || `https://sleepercdn.com/content/nfl/players/${p.playerId}.jpg`,
            kind: 'trade' as const,
          }))
        ),
    [teams, team.rosterId]
  )
  const rookies = new Set(
    teams.flatMap((t) => t.players.filter((p) => p.isRookie).map((p) => `nfl:${p.playerId}`))
  )
  const pool: Target[] =
    source === 'trade'
      ? nfl
      : prospects.map((p) => ({
          id: `prospect:${p.id}`,
          name: p.name,
          position: p.position,
          team: p.school,
          image: p.headshot_url ?? null,
          kind: 'draft',
          year: p.draft_year ?? undefined,
        }))
  const candidates = pool.filter(
    (p) =>
      (position === 'ALL' || p.position === position) &&
      (source !== 'draft' || year === 'ALL' || String(p.year) === year) &&
      `${p.name} ${p.team}`.toLowerCase().includes(query.toLowerCase()) &&
      !scenario?.targets.some((t) => t.id === p.id)
  )
  const positions = Array.from(
    new Set([
      'QB',
      'RB',
      'WR',
      'TE',
      ...team.players.map((p) => p.position),
      ...(scenario?.targets.map((t) => t.position) ?? []),
    ])
  )
  if (loadError)
    return (
      <div role="alert" className="py-10 text-slate-300">
        {loadError.message}{' '}
        <button className={button} onClick={() => retrySaved()}>
          Retry
        </button>
      </div>
    )
  if (!ready || loadedKey !== accountKey || !scenario || !view)
    return <p className="py-10 text-slate-400">Loading team plans…</p>
  const add = (target: Target) => {
    if (scenario.targets.length >= 100 || scenario.targets.some((t) => t.id === target.id)) return
    const arrival = target.kind === 'draft' ? (target.year ?? timeline.horizon) : timeline.horizon
    update({
      targets: [...scenario.targets, { ...target, arrivalYear: arrival }],
      horizon: Math.max(timeline.horizon, arrival),
    })
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isDynasty && (
          <select
            aria-label="Roster year"
            className={input}
            value={timeline.horizon}
            disabled={busy}
            onChange={(e) => {
              const horizon = Number(e.target.value)
              update({ horizon })
              setYear(horizon > timeline.baseYear ? String(horizon) : 'ALL')
            }}
          >
            {[0, 1, 2, 3].map((offset) => (
              <option key={offset} value={timeline.baseYear + offset}>
                {offset === 0 ? 'Now' : `${timeline.baseYear + offset} · +${offset}y`}
              </option>
            ))}
          </select>
        )}
        <details className="relative ml-auto">
          <summary className={`${button} cursor-pointer`}>Plans{dirty ? ' •' : ''}</summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(28rem,85vw)] space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
            {!user && <p className="text-xs text-slate-400">Sign in to save this plan.</p>}
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Saved scenario"
                className={input}
                value={active}
                disabled={busy}
                onChange={(e) => setActive(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                className={button}
                disabled={scenarios.length >= 12 || busy}
                onClick={() => {
                  const copy = {
                    ...scenario,
                    id: crypto.randomUUID(),
                    name: `Plan ${scenarios.length + 1}`,
                  }
                  setScenarios([...scenarios, copy])
                  setActive(copy.id)
                  setDirty(true)
                }}
              >
                Duplicate plan
              </button>
              <button
                disabled={!user || busy || !dirty}
                onClick={save}
                className={`${button} border-blue-400/40 bg-blue-400/10 text-blue-200`}
              >
                {busy ? 'Saving…' : 'Save plans'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="w-full text-xs text-slate-400 sm:w-auto sm:flex-1">
                Scenario name
                <input
                  maxLength={80}
                  className={`${input} mt-1 w-full`}
                  value={scenario.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="w-full text-xs text-slate-400 sm:w-auto sm:flex-[2]">
                Strategy notes
                <input
                  maxLength={2000}
                  className={`${input} mt-1 w-full`}
                  placeholder="Win now, add young receivers, draft a quarterback…"
                  value={scenario.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </label>
            </div>
          </div>
        </details>
      </div>
      {message && (
        <p role="status" className="text-xs text-slate-400">
          {message}
        </p>
      )}
      {board.error && (
        <button className="text-xs text-red-300" onClick={() => board.refresh()}>
          Saved board unavailable · Retry
        </button>
      )}
      <fieldset disabled={busy} className="space-y-3 min-w-0">
        <div
          role="region"
          ref={viewportRef}
          aria-label="Team strategy map"
          tabIndex={0}
          className="h-[calc(100dvh-260px)] min-h-[520px] overflow-auto rounded-lg border border-white/10 bg-slate-950/40 p-5 focus-visible:outline focus-visible:outline-blue-400"
          style={{
            touchAction: 'pan-x pan-y',
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div style={{ zoom: zoom / 100 }} className="min-w-max">
            <BuilderTeamSummary
              team={team}
              placement={placement}
              leagueId={leagueId}
              isDynasty={isDynasty}
            />
            <div className="flex gap-4 border-t border-slate-700 pt-5">
              {positions.map((pos) => {
                const current = team.players.filter((p) => p.position === pos)
                return (
                  <section key={pos} className="w-60 shrink-0 space-y-3">
                    <header className="mb-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-3">
                      <h3 className="font-semibold text-white">{pos}</h3>
                      <span className="text-xs text-slate-400">
                        {current.length} now →{' '}
                        <strong className="text-blue-300">
                          {plannedPositionCount(pos, team.players, view)} planned
                        </strong>
                      </span>
                    </header>
                    {view.targets
                      .filter((t) => t.position === pos)
                      .map((t) => (
                        <div key={t.id} className="space-y-2">
                          <StrategyCard
                            {...t}
                            rookie={
                              t.kind === 'draft'
                                ? t.year === timeline.horizon
                                : rookies.has(t.id) && timeline.horizon === timeline.baseYear
                            }
                            label={
                              t.kind === 'draft'
                                ? `Planned arrival · ${t.year ?? 'Class TBD'}`
                                : `Trade target · ${t.arrivalYear ?? timeline.baseYear}`
                            }
                            action="Remove"
                            onAction={() =>
                              update({ targets: scenario.targets.filter((p) => p.id !== t.id) })
                            }
                          />
                          {t.kind === 'draft' && (
                            <DraftFitNote
                              fit={timeline.fits.find((f) => f.targetId === t.id)}
                              year={t.year}
                              baseYear={timeline.baseYear}
                            />
                          )}
                        </div>
                      ))}
                    <button
                      className="w-full rounded-lg border border-dashed border-slate-600 p-3 text-xs text-blue-300 hover:bg-slate-800"
                      onClick={() => {
                        setPosition(pos)
                        document.getElementById('builder-search')?.focus()
                      }}
                    >
                      + Find {pos} targets
                    </button>
                    <RosterCardStack
                      players={current}
                      onTrade={setTradePlayer}
                      position={pos}
                      outgoing={view.outgoing}
                      ageOffset={Math.max(0, timeline.horizon - timeline.baseYear)}
                      onToggle={(id) =>
                        update({
                          outgoing: view.outgoing.includes(id)
                            ? scenario.outgoing.filter((value) => value !== id)
                            : [...new Set([...scenario.outgoing, id])],
                          departureYears: { ...scenario.departureYears, [id]: timeline.horizon },
                        })
                      }
                    />
                    {isDynasty &&
                      board.user &&
                      !board.error &&
                      !prospectError &&
                      !board.isLoading &&
                      !prospectsLoading &&
                      board.players.length > 0 && (
                        <BoardFitStack
                          players={board.players}
                          position={pos}
                          targets={scenario.targets}
                          full={scenario.targets.length >= 100}
                          onAdd={add}
                        />
                      )}
                  </section>
                )
              })}
            </div>
          </div>
        </div>
        <section aria-label="Find strategy targets" className="border-t border-white/10 pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="mr-auto font-semibold text-white">Find your next player</h3>
            <select
              aria-label="Target source"
              value={source}
              onChange={(e) => setSource(e.target.value as 'trade' | 'draft')}
              className={input}
            >
              <option value="trade">Trade targets · league rosters</option>
              {isDynasty && <option value="draft">College draft targets</option>}
            </select>
            <select
              aria-label="Target position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={input}
            >
              <option value="ALL">All positions</option>
              {positions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {source === 'draft' && (
              <select
                aria-label="Draft class"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={input}
              >
                <option value="ALL">All classes</option>
                {Array.from(new Set(prospects.map((p) => p.draft_year).filter(Boolean)))
                  .sort()
                  .map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <input
            id="builder-search"
            aria-label="Find a target player"
            className={`${input} mb-4 w-full`}
            placeholder="Search players, schools or league teams"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {prospectError && source === 'draft' ? (
            <p role="alert" className="text-sm text-red-300">
              Could not load college players. <button onClick={() => mutate()}>Retry</button>
            </p>
          ) : prospectsLoading ? (
            <p className="text-slate-400">Loading prospects…</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                {candidates.length} matches
                {candidates.length > 40 ? ' · showing first 40; narrow your search' : ''} · targets
                are ideas, not guaranteed acquisitions
              </p>
              <div className="grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
                {candidates.slice(0, 40).map((t) => (
                  <StrategyCard
                    key={t.id}
                    {...t}
                    rookie={rookies.has(t.id)}
                    label={
                      t.kind === 'draft' ? String(t.year ?? 'Class TBD') : 'Available to target'
                    }
                    action="Add"
                    onAction={() => add(t)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </fieldset>
      {tradePlayer && (
        <PlayerTradeModal
          key={`${leagueId}:${team.rosterId}:${tradePlayer.playerId}`}
          player={tradePlayer}
          team={team}
          teams={teams}
          leagueId={leagueId}
          onClose={() => setTradePlayer(null)}
        />
      )}
    </div>
  )
}
