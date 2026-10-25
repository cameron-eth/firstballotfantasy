'use client'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { type Scenario, type Target } from '@/lib/team-scenarios'
import { PlayerTradeModal } from '../trades/PlayerTradeModal'
import type { PlayerData, TeamData } from '../types'
import type { Prospect } from '@/components/scouting/types'
import { StrategyCard } from './StrategyCard'
import { LineupMap } from './LineupMap'
import { BuilderTeamSummary } from './BuilderTeamSummary'
import type { TeamPlacement } from '../competitiveState'
import { useBoardFit } from './BoardFit'
import { useTeamTimeline, type TimelineDraftOrder } from './TeamTimeline'
import { PlanMenu } from './PlanMenu'
import { CompactSelect } from '@/components/ui/compact-select'
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
  rosterPositions,
}: {
  team: TeamData
  teams: TeamData[]
  leagueId: string
  isDynasty: boolean
  placement?: TeamPlacement
  rosterPositions: string[]
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
  const { viewportRef, zoom, setZoom } = useCanvasZoom()
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
          <div
            role="group"
            aria-label="Roster year"
            className="inline-flex rounded-lg border border-slate-700/50 bg-slate-800/40 p-1"
          >
            {[0, 1, 2, 3].map((offset) => {
              const horizon = timeline.baseYear + offset
              return (
                <button
                  key={horizon}
                  disabled={busy}
                  aria-pressed={timeline.horizon === horizon}
                  onClick={() => {
                    update({ horizon })
                    setYear(offset ? String(horizon) : 'ALL')
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${timeline.horizon === horizon ? 'bg-blue-400/15 text-blue-200 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  {offset ? horizon : 'Now'}
                </button>
              )
            })}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <button
            aria-label="Zoom out map"
            className={button}
            disabled={zoom <= 10}
            onClick={() => setZoom(zoom / 1.25)}
          >
            −
          </button>
          <button aria-label="Reset map zoom" title="Reset zoom" onClick={() => setZoom(100)}>
            {zoom}%
          </button>
          <button
            aria-label="Zoom in map"
            className={button}
            disabled={zoom >= 150}
            onClick={() => setZoom(zoom * 1.25)}
          >
            +
          </button>
        </div>
        <PlanMenu
          scenarios={scenarios}
          scenario={scenario}
          select={setActive}
          update={update}
          busy={busy}
          dirty={dirty}
          signedIn={!!user}
          message={message}
          save={save}
          duplicate={() => {
            const copy = {
              ...scenario,
              id: crypto.randomUUID(),
              name: `Plan ${scenarios.length + 1}`,
            }
            setScenarios([...scenarios, copy])
            setActive(copy.id)
            setDirty(true)
          }}
        />
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
          <div style={{ zoom: zoom / 100 }} className="mx-auto w-max">
            <BuilderTeamSummary
              team={team}
              placement={placement}
              leagueId={leagueId}
              isDynasty={isDynasty}
            />
            <LineupMap
              fits={timeline.fits}
              team={team}
              teams={teams}
              rawSlots={rosterPositions}
              scenario={scenario}
              view={view}
              horizon={timeline.horizon}
              baseYear={timeline.baseYear}
              board={
                isDynasty &&
                board.user &&
                !board.error &&
                !prospectError &&
                !board.isLoading &&
                !prospectsLoading
                  ? board.players
                  : []
              }
              update={update}
              onTrade={setTradePlayer}
              onAdd={add}
            />
          </div>
        </div>
        <section aria-label="Find strategy targets" className="border-t border-white/10 pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="mr-auto font-semibold text-white">Find your next player</h3>
            <CompactSelect
              label="Target source"
              value={source}
              onChange={(value) => setSource(value as 'trade' | 'draft')}
              disabled={busy}
              options={[
                { value: 'trade', label: 'Trade targets' },
                ...(isDynasty ? [{ value: 'draft', label: 'College prospects' }] : []),
              ]}
            />
            <CompactSelect
              label="Target position"
              value={position}
              onChange={setPosition}
              disabled={busy}
              options={[
                { value: 'ALL', label: 'All positions' },
                ...positions.map((p) => ({ value: p, label: p })),
              ]}
            />
            {source === 'draft' && (
              <CompactSelect
                label="Draft class"
                value={year}
                onChange={setYear}
                disabled={busy}
                options={[
                  { value: 'ALL', label: 'All classes' },
                  ...Array.from(new Set(prospects.map((p) => p.draft_year).filter(Boolean)))
                    .sort()
                    .map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
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
