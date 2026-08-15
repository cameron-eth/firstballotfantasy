'use client'

import { useMemo, useState } from 'react'
import { formatValue } from '@/lib/trade-utils'
import type { CounterpartyPair, MostTradedPlayer, PnlSeries, RosterKPI } from './types'
import { tradeTempo } from './utils'
import { MostTradedCard } from './MostTradedCard'
import { TradePnLChart } from './TradePnLChart'

export function MarketTrendsTab({
  mostTradedPlayers,
  pnlSeries,
  counterpartyPairs,
  rosterKPIs,
  totalTrades,
  allPlayers,
  dynastyRankings,
}: {
  mostTradedPlayers: MostTradedPlayer[]
  pnlSeries: PnlSeries[]
  counterpartyPairs: CounterpartyPair[]
  rosterKPIs: RosterKPI[]
  totalTrades: number
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
}) {
  const [view, setView] = useState<'value' | 'activity'>('value')

  const velocityLeaders = useMemo(
    () =>
      [...rosterKPIs]
        .filter((r) => r.totalTrades > 0)
        .sort((a, b) => b.velocityScore - a.velocityScore)
        .slice(0, 8),
    [rosterKPIs]
  )

  return (
    <div className="space-y-6">
      {/* Most Traded Players — pinned at top */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Most Traded Players
        </h2>
        {mostTradedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mostTradedPlayers.map((p, idx) => (
              <MostTradedCard
                key={`${p.playerId || p.name}-${idx}`}
                player={p}
                rank={idx + 1}
                allPlayers={allPlayers}
                dynastyRankings={dynastyRankings}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No repeat-traded players in this window
          </div>
        )}
      </section>

      {/* Segmented toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {view === 'value' ? 'Trade Value Trends' : 'League Activity'}
        </h2>
        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          {(
            [
              { key: 'value' as const, label: 'Value Trends' },
              { key: 'activity' as const, label: 'Activity' },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setView(opt.key)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md transition-colors ${
                view === opt.key
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'value' ? (
        <section>
          <p className="text-[11px] text-muted-foreground font-mono mb-3">
            Cumulative net KTC gained or lost through trades — each owner is a &ldquo;stock&rdquo;. Click a name to toggle, hover to highlight.
          </p>
          <TradePnLChart series={pnlSeries} />
        </section>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <section>
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Trading Partners (Most Frequent)
            </h3>
            <div className="rounded-lg border border-border bg-card/60 divide-y divide-border">
              {counterpartyPairs.map((cp) => (
                <div
                  key={`${cp.rosterIds[0]}-${cp.rosterIds[1]}`}
                  className="p-3 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{cp.pair[0]}</span>
                    <span className="text-muted-foreground mx-1.5">⇄</span>
                    <span className="font-semibold text-foreground">{cp.pair[1]}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {cp.count} trade{cp.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {counterpartyPairs.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No counterparty data
                </div>
              )}
            </div>
          </section>
          <section>
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Trade Velocity Leaderboard
            </h3>
            <div className="rounded-lg border border-border bg-card/60 divide-y divide-border">
              {velocityLeaders.map((r) => {
                const tempo = tradeTempo(r.velocityScore)
                const pct =
                  totalTrades > 0 ? Math.round((r.totalTrades / totalTrades) * 100) : 0
                return (
                  <div key={r.rosterId} className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {r.ownerName}
                        </div>
                        <div className={`text-[11px] font-mono ${tempo.color}`}>{tempo.label}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-base font-mono font-black text-foreground">
                          {r.velocityScore}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {r.tradesPerWeek}/wk · {pct}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tempo.bar}`}
                        style={{ width: `${Math.max(r.velocityScore, 3)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {velocityLeaders.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No trade activity
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
