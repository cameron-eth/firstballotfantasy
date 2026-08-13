'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatValue, type PlayerValue } from '@/lib/trade-utils'
import type { LeagueVelocity, RosterKPI } from './types'
import { formatGap, gradeColor, tradeTempo } from './utils'
import { TradePlayerCard } from './TradePlayerCard'

export function MarketOverviewTab({
  rosterKPIs,
  topBuyLows,
  topSellHighs,
  allPlayers,
  dynastyRankings,
  valuationCache,
  velocity,
}: {
  rosterKPIs: RosterKPI[]
  topBuyLows: { name: string; playerId?: string; delta: number; ownerName: string }[]
  topSellHighs: { name: string; playerId?: string; delta: number; ownerName: string }[]
  allPlayers: Record<string, any>
  dynastyRankings: Record<string, any>
  valuationCache: Map<string, PlayerValue>
  velocity: LeagueVelocity
}) {
  const velocityCards: { label: string; value: string; sub: string; accent: string }[] = [
    {
      label: 'Trades / Week',
      value: velocity.perWeek >= 10 ? velocity.perWeek.toFixed(0) : velocity.perWeek.toFixed(1),
      sub: 'league pace',
      accent: 'text-blue-400',
    },
    {
      label: 'Trades / Month',
      value: velocity.perMonth >= 10 ? velocity.perMonth.toFixed(0) : velocity.perMonth.toFixed(1),
      sub: `${velocity.perDay.toFixed(2)}/day`,
      accent: 'text-foreground',
    },
    {
      label: 'Avg Gap',
      value: formatGap(velocity.avgGapDays),
      sub: 'between trades',
      accent: 'text-foreground',
    },
    {
      label: 'Busiest Day',
      value: velocity.busiestCount > 0 ? `${velocity.busiestCount}` : '—',
      sub: velocity.busiestLabel,
      accent: 'text-fuchsia-400',
    },
    {
      label: 'Active Span',
      value: velocity.spanDays >= 365 ? `${(velocity.spanDays / 365).toFixed(1)}y` : `${Math.round(velocity.spanDays)}d`,
      sub: `${velocity.totalTrades} trades`,
      accent: 'text-foreground',
    },
  ]

  return (
    <div className="space-y-6">
      {/* League Trade Velocity */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          League Trade Velocity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {velocityCards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-border bg-card/60 px-3 py-2.5"
            >
              <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
                {c.label}
              </div>
              <div className={`text-2xl font-black font-mono leading-none ${c.accent}`}>
                {c.value}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Roster KPI Table */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Roster Trade Performance
        </h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3">Manager</th>
                <th className="text-right px-4 py-3">Trades</th>
                <th className="text-right px-4 py-3">KTC Gained</th>
                <th className="text-right px-4 py-3">KTC Lost</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-right px-4 py-3">Win %</th>
                <th className="text-center px-4 py-3">Grade</th>
                <th className="text-left px-4 py-3">Best Buy Low</th>
                <th className="text-left px-4 py-3">Best Sell High</th>
              </tr>
            </thead>
            <tbody>
              {rosterKPIs.map((r) => (
                <tr
                  key={r.rosterId}
                  className="border-b border-border/50 hover:bg-secondary/10"
                >
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {r.ownerName}
                  </td>
                  <td className="text-right px-4 py-3">{r.totalTrades}</td>
                  <td className="text-right px-4 py-3 text-emerald-400">
                    +{r.ktcGained}
                  </td>
                  <td className="text-right px-4 py-3 text-red-400">
                    -{r.ktcLost}
                  </td>
                  <td
                    className={`text-right px-4 py-3 font-bold ${r.netKtc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {formatValue(r.netKtc)}
                  </td>
                  <td className="text-right px-4 py-3">{r.winRate}%</td>
                  <td className="text-center px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold border ${gradeColor(r.grade)}`}
                    >
                      {r.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.bestBuyLow ? (
                      <span>
                        {r.bestBuyLow.name}{' '}
                        <span className="text-emerald-400">
                          +{r.bestBuyLow.delta.toFixed(1)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.bestSellHigh ? (
                      <span>
                        {r.bestSellHigh.name}{' '}
                        <span className="text-blue-400">
                          +{r.bestSellHigh.delta.toFixed(1)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {rosterKPIs.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No trade data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
              </div>
      </section>

      {/* Buy Lows */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          All-Time Best Buy Lows
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topBuyLows.map((bl, idx) => (
            <TradePlayerCard
              key={`${bl.playerId || bl.name}-${bl.ownerName}-${idx}`}
              name={bl.name}
              playerId={bl.playerId}
              delta={bl.delta}
              ownerName={bl.ownerName}
              type="buy-low"
              allPlayers={allPlayers}
              dynastyRankings={dynastyRankings}
              cachedValuation={bl.playerId ? valuationCache.get(bl.playerId) ?? null : null}
            />
              ))}
            </div>
        {topBuyLows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No buy-low data
          </div>
        )}
      </section>

      {/* Sell Highs */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          All-Time Best Sell Highs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topSellHighs.map((sh, idx) => (
            <TradePlayerCard
              key={`${sh.playerId || sh.name}-${sh.ownerName}-${idx}`}
              name={sh.name}
              playerId={sh.playerId}
              delta={sh.delta}
              ownerName={sh.ownerName}
              type="sell-high"
              allPlayers={allPlayers}
              dynastyRankings={dynastyRankings}
              cachedValuation={sh.playerId ? valuationCache.get(sh.playerId) ?? null : null}
            />
          ))}
    </div>
        {topSellHighs.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
            No sell-high data
          </div>
        )}
      </section>
    </div>
  )
}
