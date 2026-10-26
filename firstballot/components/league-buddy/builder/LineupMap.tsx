'use client'
import { useState } from 'react'
import type { PlayerData, TeamData } from '../types'
import type { Scenario, Target } from '@/lib/team-scenarios'
import type { Prospect } from '@/components/scouting/types'
import { buildSlotLineup, fitsSlot, type SlotPlayer } from './slotLineup'
import { StrategyCard } from './StrategyCard'
import { DraftFitNote } from './TeamTimeline'
import type { CapitalFit } from '@/lib/team-timeline'
import { BoardFitStack } from './BoardFit'

type MapPlayer = SlotPlayer & {
  name: string
  team: string
  image: string | null
  rookie?: boolean
  target?: Target
  roster?: PlayerData
}
export function LineupMap({
  team,
  teams,
  rawSlots,
  scenario,
  view,
  horizon,
  baseYear,
  board,
  update,
  onTrade,
  onAdd,
  onFund,
  fits,
}: {
  team: TeamData
  teams: TeamData[]
  rawSlots: string[]
  scenario: Scenario
  view: Scenario
  horizon: number
  baseYear: number
  fits: CapitalFit[]
  board: Prospect[]
  update: (patch: Partial<Scenario>) => void
  onTrade: (p: PlayerData) => void
  onAdd: (t: Target) => void
  onFund: (t: Target) => void
}) {
  const [placingId, setPlacingId] = useState<string | null>(null)
  const superflex =
    rawSlots.some((slot) => slot === 'SUPER_FLEX' || slot === 'QB/RB/WR/TE') ||
    rawSlots.filter((slot) => slot === 'QB').length > 1
  const ktcValue = (p: MapPlayer) => {
    const value = superflex ? p.roster?.ktcValueSf : p.roster?.ktcValue1qb
    return value != null && Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
  }
  const describe = (p: PlayerData): MapPlayer => ({
    id: `nfl:${p.playerId}`,
    name: p.playerName,
    position: p.position,
    positions: p.fantasyPositions,
    team: p.team,
    image: p.headshot_url || `https://sleepercdn.com/content/nfl/players/${p.playerId}.jpg`,
    ppg: p.games_played && Number.isFinite(p.fantasy_ppg) ? p.fantasy_ppg : undefined,
    rookie: p.isRookie && horizon === baseYear,
    roster: p,
  })
  const players: MapPlayer[] = team.players
    .filter((p) => !view.outgoing.includes(p.playerId))
    .map(describe)
  for (const t of view.targets) {
    if (players.some((p) => p.id === t.id)) continue
    const roster = teams.flatMap((t) => t.players).find((p) => `nfl:${p.playerId}` === t.id)
    players.push({
      ...t,
      ...(roster ? describe(roster) : {}),
      id: t.id,
      target: t,
      rookie: t.kind === 'draft' ? t.year === horizon : roster?.isRookie && horizon === baseYear,
    })
  }
  const byId = new Map(players.map((p) => [p.id, p]))
  const assignments = scenario.lineups?.[String(horizon)] ?? {}
  const slots = buildSlotLineup(rawSlots, players, assignments)
  function start(slot: string, id: string) {
    const next = Object.fromEntries(
      Object.entries(assignments).filter(([key, value]) => key !== slot && value !== id)
    )
    next[slot] = id
    update({ lineups: { ...scenario.lineups, [String(horizon)]: next } })
    setPlacingId(null)
  }
  function remove(p: MapPlayer) {
    if (p.target)
      update({
        targets: scenario.targets.filter((t) => t.id !== p.id),
        fundingPlans: scenario.fundingPlans?.filter((f) => f.targetId !== p.id),
      })
    else if (p.roster)
      update({
        outgoing: [...new Set([...scenario.outgoing, p.roster.playerId])],
        departureYears: { ...scenario.departureYears, [p.roster.playerId]: horizon },
      })
  }
  const card = (p: MapPlayer, label: string, slot?: string) => (
    <div className="space-y-2">
      <StrategyCard
        name={p.name}
        position={p.position}
        team={p.team}
        image={p.image}
        rookie={p.rookie}
        tier={p.roster?.tierNumber && p.roster.tierEmphasis ? {
          number: p.roster.tierNumber,
          name: p.roster.tier,
          emphasis: p.roster.tierEmphasis,
          score: p.roster.tierScore ?? undefined,
          rank: p.roster.tierRank ?? undefined,
        } : undefined}
        shoulderBadge={
          p.roster?.fppg_rank
            ? {
                label: `${p.roster.fppg_position ?? p.position}${p.roster.fppg_rank}`,
                description: `${p.roster.stats_season} PPR FPPG rank among all NFL ${p.roster.fppg_position ?? p.position}s with at least one game. ${p.roster.games_played} games played. ESPN actual season totals; ties share rank.`,
              }
            : undefined
        }
        badge={
          p.target
            ? p.target.kind === 'draft'
              ? 'Rookie target · acquisition pending'
              : 'Trade target · not acquired'
            : undefined
        }
        label={`${label} · ${p.ppg == null ? 'FPPG unavailable' : `${p.ppg.toFixed(1)} FPPG · ${p.roster?.stats_season ?? baseYear} PPR`}`}
        action={
          slot
            ? placingId === p.id
              ? 'Cancel placement'
              : 'Choose starting slot'
            : p.target
              ? 'Remove target'
              : 'Move out'
        }
        onAction={() => (slot ? setPlacingId(placingId === p.id ? null : p.id) : remove(p))}
      >
        {p.roster && (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              KTC · {superflex ? 'SF' : '1QB'}
            </span>
            <span className="text-base font-semibold tabular-nums text-white">{ktcValue(p)}</span>
          </div>
        )}
      </StrategyCard>
      {p.target?.kind === 'draft' && (
        <div className="space-y-2">
          <button
            onClick={() => onFund(p.target!)}
            className="w-full rounded-lg border border-violet-400/40 py-2 text-xs text-violet-200"
          >
            Draft access & trade ideas →
          </button>
          <DraftFitNote
            fit={fits.find((f) => f.targetId === p.id)}
            year={p.target.year}
            baseYear={baseYear}
          />
        </div>
      )}
      {slot && (
        <div className="space-y-2">
          {placingId === p.id && (
            <div className="flex flex-wrap gap-2" aria-label={`Starting slots for ${p.name}`}>
              {slots
                .filter((s) => fitsSlot(s.eligible, p))
                .map((s) => (
                  <button
                    key={s.id}
                    className="rounded-lg border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-xs text-blue-200 hover:bg-blue-400/20"
                    title={
                      s.starter ? `Replace ${byId.get(s.starter.id)?.name}` : `Fill ${s.label}`
                    }
                    onClick={() => start(s.id, p.id)}
                  >
                    {s.label}
                  </button>
                ))}
            </div>
          )}
          <button className="text-xs text-slate-400 hover:text-white" onClick={() => remove(p)}>
            {p.target ? 'Remove target' : 'Move out'}
          </button>
        </div>
      )}
    </div>
  )
  if (!slots.length)
    return <p className="p-5 text-sm text-slate-400">League lineup settings are unavailable.</p>
  return (
    <>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
        <span>Best available FPPG · current production baseline</span>
        {Object.keys(assignments).length > 0 && (
          <button
            className="text-blue-300"
            onClick={() => {
              update({ lineups: { ...scenario.lineups, [String(horizon)]: {} } })
              setPlacingId(null)
            }}
          >
            Reset to best lineup
          </button>
        )}
      </div>
      <div className="flex justify-center gap-4 border-t border-slate-700 pt-5">
        {slots.map((slot) => {
          const starter = slot.starter ? byId.get(slot.starter.id) : undefined
          return (
            <section key={slot.id} className="w-60 shrink-0 space-y-3">
              <header className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-3">
                <h3 className="font-semibold text-white">{slot.label}</h3>
                <span className="text-xs text-slate-400">{slot.eligible.join(' / ')}</span>
              </header>
              {starter ? (
                <>
                  <div className="relative">
                    {card(
                      starter,
                      assignments[slot.id] === starter.id ? 'Your starter' : 'Starter'
                    )}
                  </div>
                  {starter.roster && (
                    <button
                      className="w-full rounded-lg border border-blue-400/30 py-2 text-xs text-blue-200"
                      onClick={() => onTrade(starter.roster!)}
                    >
                      Show trade targets
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">
                  Open {slot.label} slot
                </div>
              )}
            </section>
          )
        })}
      </div>
      <section className="mt-6 border-t border-slate-700 pt-4" aria-label="Shared bench">
        <h3 className="mb-3 text-sm font-medium text-slate-300">Bench</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {players
            .filter((p) => !p.target && !slots.some((s) => s.starter?.id === p.id))
            .map((p) => (
              <div className="w-60" key={p.id}>
                {card(
                  p,
                  p.target ? 'Planned arrival' : 'Bench',
                  slots.some((s) => fitsSlot(s.eligible, p)) ? 'bench' : undefined
                )}
              </div>
            ))}
        </div>
      </section>
      {players.some((p) => p.target && !slots.some((s) => s.starter?.id === p.id)) && (
        <section
          aria-label="Acquisition targets"
          className="mt-6 border-t border-violet-400/30 pt-4"
        >
          <h3 className="mb-3 text-sm font-medium text-violet-200">
            Acquisition targets · not on your roster yet
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {players
              .filter((p) => p.target && !slots.some((s) => s.starter?.id === p.id))
              .map((p) => (
                <div className="w-60" key={p.id}>
                  {card(
                    p,
                    'Planned arrival',
                    slots.some((s) => fitsSlot(s.eligible, p)) ? 'target' : undefined
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
      {board.length > 0 && (
        <section className="mt-6 border-t border-slate-700 pt-4" aria-label="Shared prospect board">
          <h3 className="mb-3 text-sm font-medium text-blue-200">Your board</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[...new Set(board.map((p) => p.position))].map((position) => (
              <div key={position} className="w-60 shrink-0">
                <BoardFitStack
                  players={board.filter((p) => p.position === position)}
                  position={position}
                  targets={scenario.targets}
                  full={scenario.targets.length >= 100}
                  onAdd={onAdd}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {view.outgoing.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {team.players
            .filter((p) => view.outgoing.includes(p.playerId))
            .map((p) => (
              <button
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400"
                key={p.playerId}
                onClick={() =>
                  update({ outgoing: scenario.outgoing.filter((id) => id !== p.playerId) })
                }
              >
                Restore {p.playerName}
              </button>
            ))}
        </div>
      )}
    </>
  )
}
