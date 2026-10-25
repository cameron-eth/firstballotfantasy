'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { PlayerData, TeamData } from '../types'
import type { Target, Scenario } from '@/lib/team-scenarios'
import {
  draftFundingIdeas,
  projectedPick,
  type FundingPlan,
  type PickQuote,
} from '@/lib/draft-funding'
import { tradeOpportunities } from '@/lib/sleeper-sdk/trade-opportunities'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import { pickLabel, type OfferSide } from '../trades/TradeAssetList'
export type PlanningOffer = { partnerId: number; give: OfferSide; receive: OfferSide }
export type PlanningFocus =
  | { kind: 'player'; player: PlayerData }
  | { kind: 'draft'; target: Target; rank?: number }
const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Planning data unavailable')
  return r.json()
}
export function PlanningSuggestions({
  focus,
  team,
  teams,
  leagueId,
  slots,
  rawSlots,
  scenario,
  onClose,
  onReview,
  onSimulate,
}: {
  focus: PlanningFocus
  team: TeamData
  teams: TeamData[]
  leagueId: string
  slots: Record<number, number>
  rawSlots: string[]
  scenario: Scenario
  onClose: () => void
  onReview: (offer: PlanningOffer) => void
  onSimulate: (plan: FundingPlan) => void
}) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])
  const {
    data: inventory,
    error,
    isLoading,
    mutate: retryInventory,
  } = useSWR<TradeInventory>(`/api/trade-inventory?leagueId=${leagueId}`, fetcher)
  const {
    data: values,
    error: quoteError,
    isLoading: quotesLoading,
    mutate: retryQuotes,
  } = useSWR<{ data: PickQuote[]; source: string; latestDate: string }>(
    focus.kind === 'draft' ? '/api/ktc-values' : null,
    fetcher
  )
  const funding =
    focus.kind === 'draft' && inventory
      ? draftFundingIdeas({
          targetId: focus.target.id,
          year: focus.target.year,
          rank: focus.rank,
          mine: team,
          teams,
          picks: inventory.picks,
          slots,
          quotes: values?.data ?? [],
          superflex: inventory.superflex,
          rawSlots,
          excludedPlayers: [
            ...scenario.outgoing,
            ...(scenario.fundingPlans ?? [])
              .filter((f) => focus.kind !== 'draft' || f.targetId !== focus.target.id)
              .flatMap((f) => f.givePlayerIds),
          ],
          excludedPicks: (scenario.fundingPlans ?? [])
            .filter((f) => focus.kind !== 'draft' || f.targetId !== focus.target.id)
            .flatMap((f) => [...f.givePickIds, f.receivePickId]),
        })
      : []
  const playerIdeas =
    focus.kind === 'player' && inventory
      ? tradeOpportunities(focus.player, team, teams, inventory.superflex)
          .filter((c) => {
            const own = inventory.superflex ? focus.player.ktcValueSf : focus.player.ktcValue1qb
            return own && c.value && Math.abs(own - c.value) / Math.max(own, c.value) <= 0.3
          })
          .slice(0, 12)
      : []
  const count = focus.kind === 'draft' ? funding.length : playerIdeas.length
  const current = index % Math.max(count, 1)
  const f = funding[current],
    p = playerIdeas[current]
  const offer: PlanningOffer | undefined = f
    ? {
        partnerId: f.owner.rosterId,
        give: { players: f.plan.givePlayerIds, picks: f.plan.givePickIds, faab: 0 },
        receive: { players: [], picks: [f.pick.id], faab: 0 },
      }
    : p && focus.kind === 'player'
      ? {
          partnerId: p.team.rosterId,
          give: { players: [focus.player.playerId], picks: [], faab: 0 },
          receive: { players: [p.target.playerId], picks: [], faab: 0 },
        }
      : undefined
  const title =
    focus.kind === 'draft' ? `Fund ${focus.target.name}` : `Trade ${focus.player.playerName}`
  const renderPick = (pick: OwnedPick) => (
    <div key={pick.id} className="rounded-xl border border-violet-400/40 bg-violet-400/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-violet-300">
        Draft capital · {pick.season}
      </p>
      <p className="mt-1 text-lg font-bold text-white">
        {slots[pick.roster_id]
          ? `${pick.round}.${String(slots[pick.roster_id]).padStart(2, '0')}`
          : `Round ${pick.round}`}
      </p>
      <p className="text-xs text-slate-400">Projected · {pickLabel(pick, teams)}</p>
    </div>
  )
  return (
    <motion.aside
      role="complementary"
      aria-label="Planning trade suggestions"
      initial={{ opacity: 0, x: reduced ? 0 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : 24 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
      className="fixed right-3 top-24 max-h-[calc(100dvh-120px)] z-40 w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-blue-300/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl lg:right-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-blue-300">Planning node</p>
          <h3 className="mt-1 font-semibold text-white">{title}</h3>
        </div>
        <button
          aria-label="Close trade suggestions"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800"
        >
          ×
        </button>
      </div>
      {isLoading || quotesLoading ? (
        <p className="py-6 text-sm text-slate-400">Finding league assets…</p>
      ) : error || quoteError ? (
        <div role="alert" className="text-sm text-amber-300">
          <p>Asset data unavailable.</p>
          <button
            className="mt-2 rounded-lg border border-slate-700 px-3 py-2"
            onClick={() => {
              void retryInventory()
              if (focus.kind === 'draft') void retryQuotes()
            }}
          >
            Retry
          </button>
        </div>
      ) : !count ? (
        <p className="text-sm leading-relaxed text-slate-400">
          {focus.kind === 'draft'
            ? 'No priced package reaches this target with the current data. Check pick projections, try another prospect, or keep this as an unfunded goal. Unknown pick prices are not treated as free.'
            : 'No nearby KTC-value suggestions found for this player.'}
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <button
              aria-label="Previous trade idea"
              onClick={() => setIndex((current - 1 + count) % count)}
              className="rounded border border-slate-700 px-3 py-1"
            >
              ←
            </button>
            <span>
              {current + 1} / {count} ideas
            </span>
            <button
              aria-label="Next trade idea"
              onClick={() => setIndex(current + 1)}
              className="rounded border border-slate-700 px-3 py-1"
            >
              →
            </button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={JSON.stringify(offer)}
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -8 }}
              transition={{ duration: reduced ? 0 : 0.15 }}
              className="space-y-3"
            >
              <p className="text-xs text-slate-400">With {f?.owner.teamName ?? p?.team.teamName}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                You receive
              </p>
              {f
                ? renderPick(f.pick)
                : p && (
                    <PlayerTradingCard
                      compact
                      imageHeight="h-32"
                      name={p.target.playerName}
                      position={p.target.position}
                      team={p.target.team}
                      image={
                        p.target.headshot_url ||
                        `https://sleepercdn.com/content/nfl/players/${p.target.playerId}.jpg`
                      }
                      label={`KTC ${p.value?.toLocaleString() ?? '—'}`}
                    />
                  )}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-300">
                You send
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(f?.give ?? (focus.kind === 'player' ? [focus.player] : [])).map((player) => (
                  <PlayerTradingCard
                    key={player.playerId}
                    compact
                    imageHeight="h-24"
                    name={player.playerName}
                    position={player.position}
                    team={player.team}
                    image={
                      player.headshot_url ||
                      `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`
                    }
                    label={`KTC ${(inventory?.superflex ? player.ktcValueSf : player.ktcValue1qb)?.toLocaleString() ?? '—'}`}
                  />
                ))}
              </div>
              {f?.givePicks.map(renderPick)}
              {f ? (
                <div className="space-y-2 text-xs leading-relaxed text-slate-400">
                  <p className="text-amber-200">
                    {f.loss > 0
                      ? `Costs ~${f.loss.toFixed(1)} starting FPPG in today’s baseline${f.missing ? ' (partial stats)' : ''}. This changes your win-now plan.`
                      : 'Preserves the measured starting FPPG baseline; depth and future capital still change.'}
                  </p>
                  <p>
                    {f.benchmark.name}: {f.benchmark.value.toLocaleString()} KTC vs{' '}
                    {f.value.toLocaleString()} outgoing. {values?.source} ·{' '}
                    {f.benchmark.quote?.scraped_date}.
                  </p>
                  <p>
                    Bucket benchmark, not a price for this exact pick.{' '}
                    {focus.kind === 'draft' && (focus.rank ?? 99) <= 3
                      ? 'Elite prospects can command a substantial premium. '
                      : ''}
                    MaxPF order is a planning assumption; selling players can change it. This is not
                    an acceptance prediction.
                  </p>
                  <p>
                    {f.partnerNeed
                      ? 'The holder has less depth at a position you offer.'
                      : 'The holder’s willingness to sell is unknown.'}
                  </p>
                  <p>
                    Projected overall #{projectedPick(f.pick, slots, teams.length)} → class #
                    {focus.kind === 'draft' ? focus.rank : ''} proxy; no rookie production forecast.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate-400">
                  {p?.reason}. KTC is context, not acceptance odds.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {f && (
                  <button
                    onClick={() => onSimulate(f.plan)}
                    className="rounded-lg border border-blue-400/40 px-3 py-2 text-xs font-semibold text-blue-200"
                  >
                    Simulate this path
                  </button>
                )}
                <button
                  disabled={!offer}
                  onClick={() => offer && onReview(offer)}
                  className="rounded-lg bg-blue-400 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Review & send
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.aside>
  )
}
