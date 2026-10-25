'use client'
import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { useTradeDismissals } from './useTradeDismissals'
import { suggestedTeamTrades } from '@/lib/sleeper-sdk/trade-opportunities'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { TeamData, PlayerData } from '../types'
import { PlayerTradeModal } from './PlayerTradeModal'
function Portrait({ player }: { player: PlayerData }) {
  return (
    <img
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg bg-slate-800 object-contain"
      src={
        player.headshot_url || `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`
      }
    />
  )
}
export function SuggestedTrades({
  leagueId,
  team,
  teams,
}: {
  leagueId: string
  team: TeamData
  teams: TeamData[]
}) {
  const rail = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const { dismissed, dismiss } = useTradeDismissals(
    `${user?.id ?? 'guest'}:${leagueId}:${team.rosterId}`
  )
  const [chosen, setChosen] = useState<{
    give: PlayerData
    receive: PlayerData
    partnerId: number
  } | null>(null)
  const { data, error, isLoading, mutate } = useSWR<TradeInventory>(
    `/api/trade-inventory?leagueId=${leagueId}`,
    async (url: string) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error('Trade context unavailable.')
      return r.json()
    }
  )
  const suggestions = useMemo(
    () => (data ? suggestedTeamTrades(team, teams, data.superflex, dismissed) : []),
    [data, team, teams, dismissed]
  )
  return (
    <section aria-label="Suggested trades" className="space-y-3">
      <div>
        <button
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between py-2 text-base font-semibold text-white"
        >
          Suggested trades{' '}
          <span aria-hidden="true" className="text-slate-400">
            {expanded ? '−' : '+'}
          </span>
        </button>
        <p hidden={!expanded} className="text-xs text-slate-400">
          Specific swaps based on positional depth and {data?.superflex ? 'superflex' : '1QB'} KTC
          value. Send opens a confirmation; nothing is sent on selection.
        </p>
      </div>
      {expanded &&
        (isLoading ? (
          <p className="text-sm text-slate-400">Finding opportunities…</p>
        ) : error ? (
          <button className="text-sm text-blue-300" onClick={() => mutate()}>
            Suggestions unavailable · Retry
          </button>
        ) : !suggestions.length ? (
          <p className="text-sm text-slate-400">
            No close-value depth swaps found. Explore a specific player’s trade targets in Team
            Builder.
          </p>
        ) : (
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>{suggestions.length} ideas · dismiss for 24 hours</span>
              <div className="flex gap-2">
                <button
                  aria-label="Previous trade suggestions"
                  className="rounded-md border border-slate-700 px-3 py-1.5 hover:text-white"
                  onClick={() => rail.current?.scrollBy({ left: -372, behavior: 'smooth' })}
                >
                  ←
                </button>
                <button
                  aria-label="Next trade suggestions"
                  className="rounded-md border border-slate-700 px-3 py-1.5 hover:text-white"
                  onClick={() => rail.current?.scrollBy({ left: 372, behavior: 'smooth' })}
                >
                  →
                </button>
              </div>
            </div>
            <div
              ref={rail}
              role="region"
              aria-label="Trade suggestion cards"
              tabIndex={0}
              className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline focus-visible:outline-blue-400"
            >
              {suggestions.map((s) => (
                <article
                  key={`${s.give.playerId}:${s.target.playerId}`}
                  className="flex w-[360px] max-w-[90vw] shrink-0 snap-start flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-800/40 p-4"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
                    <div className="min-w-0">
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                        You send
                      </p>
                      <div className="flex items-center gap-2">
                        <Portrait player={s.give} />
                        <p className="min-w-0 break-words text-sm font-medium leading-tight text-white">
                          {s.give.playerName}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{s.give.position}</p>
                    </div>
                    <span aria-hidden="true" className="pt-8 text-slate-500">
                      →
                    </span>
                    <div className="min-w-0">
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-blue-300">
                        You receive
                      </p>
                      <div className="flex items-center gap-2">
                        <Portrait player={s.target} />
                        <p className="min-w-0 break-words text-sm font-medium leading-tight text-white">
                          {s.target.playerName}
                        </p>
                      </div>
                      <p className="mt-1 break-words text-xs text-slate-400">{s.team.teamName}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{s.reason}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-700/60 pt-3">
                    <button
                      className="text-xs text-slate-400 hover:text-white"
                      aria-label={`Dismiss ${s.give.playerName} for ${s.target.playerName} for 24 hours`}
                      onClick={() =>
                        dismiss(`${s.give.playerId}:${s.target.playerId}:${s.team.rosterId}`)
                      }
                    >
                      Dismiss
                    </button>
                    <button
                      aria-label={`Send suggested trade: ${s.give.playerName} for ${s.target.playerName}`}
                      className="rounded-lg bg-blue-400 px-4 py-1.5 text-xs font-semibold text-slate-950"
                      onClick={() =>
                        setChosen({ give: s.give, receive: s.target, partnerId: s.team.rosterId })
                      }
                    >
                      Send →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      {chosen && (
        <PlayerTradeModal
          key={`${chosen.give.playerId}:${chosen.receive.playerId}`}
          player={chosen.give}
          team={team}
          teams={teams}
          leagueId={leagueId}
          initialOffer={{ partnerId: chosen.partnerId, playerId: chosen.receive.playerId }}
          onClose={() => setChosen(null)}
        />
      )}
    </section>
  )
}
