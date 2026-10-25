'use client'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { plannedPositionCount, type Scenario, type Target } from '@/lib/team-scenarios'
import type { TeamData } from '../types'
import type { Prospect } from '@/components/scouting/types'
import { StrategyCard } from './StrategyCard'

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
}: {
  team: TeamData
  teams: TeamData[]
  leagueId: string
  isDynasty: boolean
}) {
  const { user, loading: authLoading } = useAuth()
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
  const [zoom, setZoom] = useState(100)
  const endpoint = `/api/team-scenarios?league=${leagueId}&roster=${team.rosterId}`
  const {
    data: prospects = [],
    error: prospectError,
    isLoading: prospectsLoading,
    mutate,
  } = useSWR(
    isDynasty && source === 'draft' ? '/api/prospects?draft_year=all' : null,
    fetchProspects
  )
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
  if (!ready || loadedKey !== accountKey || !scenario)
    return <p className="py-10 text-slate-400">Loading team plans…</p>
  const add = (target: Target) => {
    if (scenario.targets.length < 100) update({ targets: [...scenario.targets, target] })
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Team Builder</h2>
          <p className="mt-1 text-sm text-slate-400">
            Map the team you want to build. Plans never submit trades or change your lineup.
          </p>
        </div>
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
      </div>
      <p role="status" className="text-xs text-slate-400">
        {message ||
          (!user
            ? 'Sign in to save. This preview lasts until you leave the page.'
            : dirty
              ? 'Unsaved changes · save to keep this plan across visits.'
              : 'Saved plans are private to your account and scoped to this league and team.')}
      </p>
      <fieldset disabled={busy} className="space-y-5 min-w-0">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3 text-sm">
          <div className="flex flex-wrap gap-5 text-slate-300">
            <span>
              {team.players.length -
                scenario.outgoing.filter((id) => team.players.some((p) => p.playerId === id))
                  .length}{' '}
              retained
            </span>
            <span className="text-blue-300">
              +{scenario.targets.filter((t) => t.kind === 'trade').length} trade targets
            </span>
            {isDynasty && (
              <span className="text-purple-300">
                +{scenario.targets.filter((t) => t.kind === 'draft').length} draft targets
              </span>
            )}
            <span className="text-orange-300">
              {scenario.outgoing.filter((id) => team.players.some((p) => p.playerId === id)).length}{' '}
              outgoing
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Map zoom{' '}
            <select
              aria-label="Map zoom"
              className={input}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={80}>80%</option>
              <option value={100}>100%</option>
              <option value={120}>120%</option>
            </select>
          </label>
        </div>
        <div
          role="region"
          aria-label="Team strategy map"
          tabIndex={0}
          className="max-h-[70vh] overflow-auto rounded-lg border border-white/10 bg-slate-950/40 p-5 focus-visible:outline focus-visible:outline-blue-400"
          style={{
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div style={{ zoom: zoom / 100 }} className="min-w-max">
            <div className="mx-auto mb-6 w-fit max-w-md rounded-lg border border-slate-600 bg-slate-900 px-6 py-3 text-center">
              <p className="text-sm font-semibold text-white">{scenario.name || 'Untitled plan'}</p>
              <p className="mt-1 text-xs text-slate-400">
                {team.teamName} · projected roster composition
              </p>
            </div>
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
                          {plannedPositionCount(pos, team.players, scenario)} planned
                        </strong>
                      </span>
                    </header>
                    {scenario.targets
                      .filter((t) => t.position === pos)
                      .map((t) => (
                        <StrategyCard
                          key={t.id}
                          {...t}
                          label={
                            t.kind === 'draft'
                              ? `Draft target · ${t.year ?? 'Class TBD'}`
                              : 'Trade target'
                          }
                          action="Remove"
                          onAction={() =>
                            update({ targets: scenario.targets.filter((p) => p.id !== t.id) })
                          }
                        />
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
                    {current.map((p) => (
                      <StrategyCard
                        key={p.playerId}
                        name={p.playerName}
                        position={p.position}
                        team={p.team}
                        image={
                          p.headshot_url ||
                          `https://sleepercdn.com/content/nfl/players/${p.playerId}.jpg`
                        }
                        outgoing={scenario.outgoing.includes(p.playerId)}
                        label={
                          scenario.outgoing.includes(p.playerId)
                            ? 'Planned departure'
                            : 'Current roster'
                        }
                        action={scenario.outgoing.includes(p.playerId) ? 'Keep' : 'Move out'}
                        onAction={() =>
                          update({
                            outgoing: scenario.outgoing.includes(p.playerId)
                              ? scenario.outgoing.filter((id) => id !== p.playerId)
                              : [...scenario.outgoing, p.playerId],
                          })
                        }
                      />
                    ))}
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
    </div>
  )
}
