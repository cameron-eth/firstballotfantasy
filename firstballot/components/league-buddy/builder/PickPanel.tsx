'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { motion, useReducedMotion } from 'framer-motion'
import type { TeamData } from '../types'
import type { Scenario } from '@/lib/team-scenarios'
import type { Prospect } from '@/components/scouting/types'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import { pickBenchmark, projectedPick, type PickQuote } from '@/lib/draft-funding'
import { valueOpportunities } from '@/lib/sleeper-sdk/trade-opportunities'
import { pickLabel } from '../trades/TradeAssetList'
import type { PlanningOffer } from './PlanningSuggestions'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Pick data unavailable')
  return r.json()
}

export function PickPanel({
  pick,
  team,
  teams,
  leagueId,
  slots,
  scenario,
  prospects,
  onAssign,
  onUnassign,
  onReview,
  onClose,
}: {
  pick: OwnedPick
  team: TeamData
  teams: TeamData[]
  leagueId: string
  slots: Record<number, number>
  scenario: Scenario
  prospects: Prospect[]
  onAssign: (prospect: Prospect, pick: OwnedPick) => void
  onUnassign: (pick: OwnedPick) => void
  onReview: (offer: PlanningOffer) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  const [tab, setTab] = useState<'assign' | 'trade'>('assign')
  const [query, setQuery] = useState('')
  const { data: inventory } = useSWR<TradeInventory>(
    `/api/trade-inventory?leagueId=${leagueId}`,
    fetcher
  )
  const { data: values } = useSWR<{ data: PickQuote[] }>('/api/ktc-values', fetcher)
  const label = slots[pick.roster_id]
    ? `${pick.round}.${String(slots[pick.roster_id]).padStart(2, '0')}`
    : `Round ${pick.round}`
  const assignedId = scenario.pickAssignments?.[pick.id]
  const assigned = scenario.targets.find((t) => t.id === assignedId)
  const takenElsewhere = new Set(
    Object.entries(scenario.pickAssignments ?? {})
      .filter(([pickId]) => pickId !== pick.id)
      .map(([, targetId]) => targetId)
  )
  const classProspects = useMemo(
    () =>
      prospects
        .filter(
          (p) => p.draft_year === Number(pick.season) && !takenElsewhere.has(`prospect:${p.id}`)
        )
        .filter((p) => `${p.name} ${p.school}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (a.overall_rank ?? 999) - (b.overall_rank ?? 999))
        .slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prospects, pick.season, query, scenario.pickAssignments, pick.id]
  )
  const benchmark = pickBenchmark(pick, slots, teams.length)
  const quote = benchmark ? values?.data.find((q) => q.player_name === benchmark) : undefined
  const pickValue = quote ? (inventory?.superflex ? quote.value_sf : quote.value_1qb) : undefined
  const ideas =
    inventory && pickValue
      ? valueOpportunities(
          { value: pickValue, positions: [] },
          team,
          teams,
          inventory.superflex
        ).slice(0, 8)
      : []
  return (
    <motion.aside
      role="complementary"
      aria-label={`Draft pick ${label}`}
      initial={{ opacity: 0, x: reduced ? 0 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : 24 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
      className="fixed right-3 top-24 z-40 max-h-[calc(100dvh-120px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-violet-300/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl lg:right-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-violet-300">
            Draft pick · {pick.season}
          </p>
          <h3 className="mt-1 font-semibold text-white">Pick {label}</h3>
          <p className="text-xs text-slate-400">
            {pickLabel(pick, teams)}
            {projectedPick(pick, slots, teams.length) ? ' · projected order' : ''}
          </p>
        </div>
        <button
          aria-label="Close pick panel"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800"
        >
          ×
        </button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-slate-900/70 p-1 text-xs">
        {(['assign', 'trade'] as const).map((id) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-2 py-1.5 font-medium ${tab === id ? 'bg-violet-400/20 text-violet-100' : 'text-slate-400 hover:text-white'}`}
          >
            {id === 'assign' ? 'Assign a prospect' : 'Trade ideas'}
          </button>
        ))}
      </div>
      {tab === 'assign' ? (
        <div className="space-y-3">
          {assigned && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs">
              <span className="text-emerald-100">
                Assigned: <span className="font-semibold">{assigned.name}</span> ·{' '}
                {assigned.position}
              </span>
              <button className="text-slate-300 underline" onClick={() => onUnassign(pick)}>
                Unassign
              </button>
            </div>
          )}
          <input
            aria-label="Search prospects in this class"
            placeholder={`Search the ${pick.season} class`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
          {classProspects.length === 0 ? (
            <p className="text-xs text-slate-400">No {pick.season} prospects match.</p>
          ) : (
            <ul className="space-y-1">
              {classProspects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onAssign(p, pick)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:border-violet-300/50 hover:bg-violet-400/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{p.name}</span>
                      <span className="text-slate-400">
                        {p.position} · {p.school}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {p.overall_rank ? `#${p.overall_rank}` : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500">
            Class rank is a cost proxy, not ADP. Assigning only plans; it never changes your Sleeper
            account.
          </p>
        </div>
      ) : !inventory || !values ? (
        <p className="py-6 text-sm text-slate-400">Finding league assets…</p>
      ) : !pickValue ? (
        <p className="text-sm leading-relaxed text-slate-400">
          This pick cannot be priced yet (no projected slot or KTC benchmark), so no ideas are
          shown. Unknown prices are never treated as free.
        </p>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-slate-400">No players near this pick’s KTC value.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            {benchmark} is worth about {pickValue.toLocaleString()} KTC. Players in that range:
          </p>
          <ul className="space-y-1">
            {ideas.map((idea) => (
              <li
                key={`${idea.team.rosterId}:${idea.target.playerId}`}
                className="rounded-lg border border-white/10 p-2 text-xs"
              >
                <p className="font-semibold text-white">
                  {idea.target.playerName}{' '}
                  <span className="font-normal text-slate-400">
                    {idea.target.position} · {idea.team.teamName}
                  </span>
                </p>
                <p className="mt-1 text-slate-400">
                  KTC {idea.value.toLocaleString()} · {idea.reason}
                </p>
                <button
                  className="mt-2 rounded-md bg-violet-300 px-2 py-1 font-semibold text-slate-950"
                  onClick={() =>
                    onReview({
                      partnerId: idea.team.rosterId,
                      give: { players: [], picks: [pick.id], faab: 0 },
                      receive: { players: [idea.target.playerId], picks: [], faab: 0 },
                    })
                  }
                >
                  Review & send
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Bucket benchmark, not a price for this exact pick. KTC is context, not acceptance odds.
          </p>
        </div>
      )}
    </motion.aside>
  )
}
