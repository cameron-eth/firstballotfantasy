'use client'
import { useEffect, useState } from 'react'
import { TourReplayButton } from '@/components/onboarding/ProductTour'
import { AnimatePresence } from 'framer-motion'
import { PickPanel } from './PickPanel'
import { PlanningSuggestions, type PlanningFocus, type PlanningOffer } from './PlanningSuggestions'
import { parseScoringSlots } from '../draft-order/maxPointsFor'
import { lineupBaseline } from '@/lib/draft-funding'
import { DraftCapitalRail } from './DraftCapitalRail'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { type Scenario, type Target } from '@/lib/team-scenarios'
import { PlayerTradeModal } from '../trades/PlayerTradeModal'
import type { PlayerData, TeamData } from '../types'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
import type { Prospect } from '@/components/scouting/types'
import { LineupMap } from './LineupMap'
import { BuilderTeamSummary } from './BuilderTeamSummary'
import type { TeamPlacement } from '../competitiveState'
import { useBoardFit } from './BoardFit'
import { useTeamTimeline, type TimelineDraftOrder } from './TeamTimeline'
import { PlanMenu } from './PlanMenu'
import { useCanvasZoom } from './useCanvasZoom'

const fresh = (): Scenario => ({
  id: crypto.randomUUID(),
  name: 'My team plan',
  notes: '',
  outgoing: [],
  targets: [],
})
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
  const [focus, setFocus] = useState<PlanningFocus | null>(null)
  const [pickFocus, setPickFocus] = useState<OwnedPick | null>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [reviewOffer, setReviewOffer] = useState<PlanningOffer | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [active, setActive] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  const { viewportRef, contentRef, spaceRef, zoom, setZoom } = useCanvasZoom()
  const endpoint = `/api/team-scenarios?league=${leagueId}&roster=${team.rosterId}`
  const {
    data: prospects = [],
    error: prospectError,
    isLoading: prospectsLoading,
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
  const baseline = lineupBaseline(team.players, rosterPositions)
  const retained = lineupBaseline(
    team.players.filter((p) => !view.outgoing.includes(p.playerId)),
    rosterPositions
  )
  const planLoss = Math.max(0, baseline.ppg - retained.ppg)
  const add = (target: Target) => {
    if (scenario.targets.length >= 100 || scenario.targets.some((t) => t.id === target.id)) return
    const arrival = target.kind === 'draft' ? (target.year ?? timeline.horizon) : timeline.horizon
    update({
      targets: [...scenario.targets, { ...target, arrivalYear: arrival }],
      horizon: Math.max(timeline.horizon, arrival),
    })
  }
  const choose = (player: PlayerData) =>
    setChosen((ids) =>
      ids.includes(player.playerId)
        ? ids.filter((id) => id !== player.playerId)
        : [...ids, player.playerId]
    )
  const assignProspect = (prospect: Prospect, pick: OwnedPick) => {
    const id = `prospect:${prospect.id}`
    const year = prospect.draft_year ?? Number(pick.season)
    const exists = scenario.targets.some((t) => t.id === id)
    const target: Target = {
      id,
      name: prospect.name,
      position: prospect.position,
      team: prospect.school,
      image: prospect.headshot_url?.startsWith('https://') ? prospect.headshot_url : null,
      kind: 'draft',
      year,
      arrivalYear: year,
    }
    // One pick per prospect and one prospect per pick: moving either end replaces the old pairing.
    const rest = Object.fromEntries(
      Object.entries(scenario.pickAssignments ?? {}).filter(
        ([pickId, tid]) => pickId !== pick.id && tid !== id
      )
    )
    update({
      targets:
        exists || scenario.targets.length >= 100 ? scenario.targets : [...scenario.targets, target],
      pickAssignments: { ...rest, [pick.id]: id },
      horizon: Math.max(timeline.horizon, year),
    })
  }
  const unassignPick = (pick: OwnedPick) =>
    update({
      pickAssignments: Object.fromEntries(
        Object.entries(scenario.pickAssignments ?? {}).filter(([pickId]) => pickId !== pick.id)
      ),
    })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isDynasty && (
          <div
            role="group"
            aria-label="Roster year"
            data-map-tour="years"
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
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${timeline.horizon === horizon ? 'bg-blue-400/15 text-blue-200 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  {offset ? horizon : 'Now'}
                </button>
              )
            })}
          </div>
        )}
        <div
          data-map-tour="zoom"
          className="ml-auto flex items-center gap-2 text-xs text-slate-400"
        >
          <button
            aria-label="Zoom out map"
            className={button}
            disabled={zoom <= 10}
            onClick={() => setZoom((value) => value / 1.25)}
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
            onClick={() => setZoom((value) => value * 1.25)}
          >
            +
          </button>
        </div>
        <TourReplayButton label="Map guide" />
        <div data-map-tour="plans">
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
        <div className="relative overflow-hidden rounded-lg border border-white/10">
          <div className="border-b border-white/10 bg-slate-950/90 px-5 py-2">
            <BuilderTeamSummary
              compact
              team={team}
              placement={placement}
              leagueId={leagueId}
              isDynasty={isDynasty}
            />
            {isDynasty && timeline.horizon > timeline.baseYear && (
              <DraftCapitalRail
                compact
                assignments={scenario.pickAssignments}
                onPick={(pick) => {
                  setFocus(null)
                  setPickFocus(pick)
                }}
                picks={timeline.picks}
                year={timeline.horizon}
                teams={teams}
                slots={timeline.slots}
                fits={timeline.fits}
                targets={scenario.targets}
                plans={scenario.fundingPlans ?? []}
                available={timeline.available}
                onFund={(target) =>
                  setFocus({
                    kind: 'draft',
                    target,
                    rank:
                      prospects.find((p) => `prospect:${p.id}` === target.id)?.overall_rank ??
                      undefined,
                  })
                }
                onUndo={(id) =>
                  update({ fundingPlans: scenario.fundingPlans?.filter((f) => f.targetId !== id) })
                }
              />
            )}
          </div>
          <div
            role="region"
            ref={viewportRef}
            aria-label="Team strategy map"
            data-map-tour="lineup"
            tabIndex={0}
            className="h-[calc(100dvh-250px)] min-h-[520px] overflow-auto bg-slate-950/40 p-5 focus-visible:outline focus-visible:outline-blue-400"
            style={{
              touchAction: 'pan-x pan-y',
              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div ref={spaceRef} className="relative overflow-hidden">
              <div
                ref={contentRef}
                className="absolute left-0 top-0 origin-top-left will-change-transform"
                style={{ width: Math.max(4, parseScoringSlots(rosterPositions).length) * 256 - 16 }}
              >
                {view.outgoing.length > 0 && (
                  <p className="mx-auto mb-4 w-fit rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200">
                    Plan cost · {view.outgoing.length} outgoing players · {planLoss.toFixed(1)}{' '}
                    starting FPPG removed from today’s baseline
                    {baseline.missing || retained.missing ? ' · partial stats' : ''}. Rookie
                    production and a new MaxPF order are not forecast.
                  </p>
                )}
                {timeline.funding.rejected.length > 0 && (
                  <p role="alert" className="mb-3 text-xs text-amber-300">
                    A funding path no longer matches pick ownership. Undo it and choose a new path.
                  </p>
                )}
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
                  chosen={chosen}
                  onChoose={choose}
                  onTrade={(player) => {
                    setPickFocus(null)
                    setFocus({ kind: 'player', player })
                  }}
                  onFund={(target) =>
                    setFocus({
                      kind: 'draft',
                      target,
                      rank:
                        prospects.find((p) => `prospect:${p.id}` === target.id)?.overall_rank ??
                        undefined,
                    })
                  }
                  onAdd={add}
                />
              </div>
            </div>
            {chosen.length > 0 && (
              <div className="fixed bottom-6 left-1/2 z-40 flex w-fit -translate-x-1/2 items-center gap-3 rounded-xl border border-violet-300/40 bg-slate-950/95 px-4 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur">
                <span className="font-semibold text-violet-100">{chosen.length} selected</span>
                <button
                  className="rounded-md bg-violet-300 px-3 py-1.5 font-semibold text-slate-950"
                  onClick={() => {
                    const players = team.players.filter((p) => chosen.includes(p.playerId))
                    setPickFocus(null)
                    setFocus({ kind: 'players', players })
                  }}
                >
                  See trade opportunities
                </button>
                <button className="text-slate-400 hover:text-white" onClick={() => setChosen([])}>
                  Clear
                </button>
              </div>
            )}
          </div>
          <AnimatePresence>
            {pickFocus && !focus && !reviewOffer && (
              <PickPanel
                key={pickFocus.id}
                pick={pickFocus}
                team={team}
                teams={teams}
                leagueId={leagueId}
                slots={timeline.slots}
                scenario={scenario}
                prospects={prospects}
                onAssign={assignProspect}
                onUnassign={unassignPick}
                onReview={setReviewOffer}
                onClose={() => setPickFocus(null)}
              />
            )}
            {focus && !reviewOffer && (
              <PlanningSuggestions
                key={
                  focus.kind === 'player'
                    ? focus.player.playerId
                    : focus.kind === 'players'
                      ? focus.players.map((p) => p.playerId).join('+')
                      : focus.target.id
                }
                focus={focus}
                team={team}
                teams={teams}
                leagueId={leagueId}
                slots={timeline.slots}
                rawSlots={rosterPositions}
                scenario={scenario}
                onClose={() => setFocus(null)}
                onReview={setReviewOffer}
                onSimulate={(plan) => {
                  update({
                    fundingPlans: [
                      ...(scenario.fundingPlans ?? []).filter((f) => f.targetId !== plan.targetId),
                      plan,
                    ],
                  })
                  setFocus(null)
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </fieldset>
      {reviewOffer && (
        <PlayerTradeModal
          key={JSON.stringify(reviewOffer)}
          initialOffer={reviewOffer}
          team={team}
          teams={teams}
          leagueId={leagueId}
          onClose={() => setReviewOffer(null)}
        />
      )}
    </div>
  )
}
