'use client'
import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { PlayerData, TeamData } from '../types'
import { PlayerTradeModal } from '../trades/PlayerTradeModal'
import { useSuggestedTrades } from '../trades/useSuggestedTrades'
import { PlayerFace } from '../ui/PlayerFace'
import { PositionBadge } from '../ui/Badge'

const SHOWN = 3

/** The engine joins reasons with " · "; the partner is named on the card, so say "They". */
const reasons = (reason: string, partner: string) =>
  reason
    .split(' · ')
    .map((why) =>
      why.replace(`${partner} has `, 'They have ').replace(`${partner} is `, 'They are ')
    )

/**
 * The top swaps from the existing trade engine (`suggestedTeamTrades`), each with its own
 * rationale. Explore opens the trade builder prefilled; nothing is sent from here.
 */
export function TradeSuggestions({
  leagueId,
  team,
  teams,
  onViewAll,
  onTradeMarket,
}: {
  leagueId: string
  team: TeamData
  teams: TeamData[]
  onViewAll: () => void
  onTradeMarket: () => void
}) {
  const { suggestions, superflex, error, isLoading, retry, dismiss } = useSuggestedTrades(
    leagueId,
    team,
    teams
  )
  const [chosen, setChosen] = useState<{
    give: PlayerData
    receive: PlayerData
    partnerId: number
  } | null>(null)
  const value = (p: PlayerData) => (superflex ? p.ktcValueSf : p.ktcValue1qb)

  return (
    <section aria-label="Trade suggestions" className="min-w-0">
      <SectionHeader
        title="Trade suggestions"
        subtitle={`Depth-for-need swaps at close ${superflex ? 'superflex' : '1QB'} KTC value`}
        actions={
          <>
            <Button variant="subtle" size="xs" onClick={onTradeMarket}>
              Trade market
            </Button>
            {suggestions.length > SHOWN && (
              <Button variant="tint" size="xs" onClick={onViewAll}>
                All {suggestions.length}
                <ArrowRight aria-hidden />
              </Button>
            )}
          </>
        }
      />
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {['a', 'b', 'c'].map((k) => (
            <Skeleton key={k} className="h-36 rounded-xl bg-surface/60" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line/60 px-4 py-3 text-sm text-slate-400">
          Trade suggestions are unavailable right now.
          <Button variant="subtle" size="xs" onClick={retry}>
            Retry
          </Button>
        </div>
      ) : !suggestions.length ? (
        <p className="rounded-xl border border-dashed border-line/60 px-4 py-3 text-sm text-slate-400">
          No close-value depth swaps right now. Team Builder can search trade targets for any
          player.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {suggestions.slice(0, SHOWN).map((s) => {
            const targetValue = value(s.target)
            const giveValue = value(s.give)
            return (
              <article
                key={`${s.give.playerId}:${s.target.playerId}`}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-line/60 bg-surface/40 p-3"
              >
                <div className="flex items-start gap-3">
                  <PlayerFace player={s.target} size={52} rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {s.target.playerName}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <PositionBadge position={s.target.position} />
                      <span>{s.target.team}</span>
                    </div>
                    <div className="mt-1 truncate text-2xs text-slate-500">
                      From {s.team.teamName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      dismiss(`${s.give.playerId}:${s.target.playerId}:${s.team.rosterId}`)
                    }
                    aria-label={`Dismiss ${s.target.playerName} for 24 hours`}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white/5 hover:text-slate-200"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <ul className="space-y-1">
                  {reasons(s.reason, s.team.teamName).map((why) => (
                    <li key={why} className="flex gap-2 text-xs text-slate-300">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
                      <span>{why}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/40 pt-3">
                  <div className="min-w-0">
                    <div className="text-2xs text-slate-500">You give</div>
                    <div className="truncate text-sm text-slate-200">{s.give.playerName}</div>
                    {giveValue && targetValue ? (
                      <div className="text-2xs tabular-nums text-value">
                        KTC {giveValue.toLocaleString()} → {targetValue.toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="tint"
                    size="xs"
                    onClick={() =>
                      setChosen({ give: s.give, receive: s.target, partnerId: s.team.rosterId })
                    }
                  >
                    Explore
                  </Button>
                </div>
              </article>
            )
          })}
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
