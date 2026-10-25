'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { suggestedTeamTrades } from '@/lib/sleeper-sdk/trade-opportunities'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { TeamData, PlayerData } from '../types'
import { PlayerTradeModal } from './PlayerTradeModal'
function Portrait({ player }: { player: PlayerData }) {
  return (
    <img
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg bg-slate-800 object-contain"
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
    () => (data ? suggestedTeamTrades(team, teams, data.superflex) : []),
    [data, team, teams]
  )
  return (
    <section aria-label="Suggested trades" className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-white">Suggested trades</h3>
        <p className="text-xs text-slate-400">
          Specific swaps based on positional depth and {data?.superflex ? 'superflex' : '1QB'} KTC
          value. Send opens a confirmation; nothing is sent on selection.
        </p>
      </div>
      {isLoading ? (
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
        <div className="divide-y divide-slate-800">
          {suggestions.map((s) => (
            <article key={`${s.give.playerId}:${s.target.playerId}`} className="py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Portrait player={s.give} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">You send</p>
                    <p className="font-medium text-white">{s.give.playerName}</p>
                    <p className="text-xs text-slate-400">{s.give.position}</p>
                  </div>
                </div>
                <span aria-hidden="true" className="hidden text-slate-500 sm:block">
                  →
                </span>
                <div className="col-start-1 flex min-w-0 items-center gap-3 sm:col-start-3">
                  <Portrait player={s.target} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      You receive
                    </p>
                    <p className="font-medium text-white">{s.target.playerName}</p>
                    <p className="text-xs text-slate-400">{s.team.teamName}</p>
                  </div>
                </div>
                <button
                  aria-label={`Send suggested trade: ${s.give.playerName} for ${s.target.playerName}`}
                  className="col-start-2 row-start-1 row-span-2 rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 sm:col-start-4 sm:row-span-1"
                  onClick={() =>
                    setChosen({ give: s.give, receive: s.target, partnerId: s.team.rosterId })
                  }
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">{s.reason}</p>
            </article>
          ))}
        </div>
      )}
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
