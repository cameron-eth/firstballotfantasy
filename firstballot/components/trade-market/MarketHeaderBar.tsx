'use client'

import { Activity, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMarketClock } from './TradeMarketClock'
import type { MarketFilterKey, MarketFilters } from './filters'

interface MarketHeaderBarProps {
  filters: MarketFilters
  onChange: (key: MarketFilterKey, value: string) => void
  seasonOptions: string[]
  teams: { rosterId: number; ownerName: string }[]
  /** Trades left after the current filters, shown as live feedback. */
  tradeCount: number
  onBack: () => void
}

/** Title row, live clock, and the filter chip row that scopes every market view. */
export function MarketHeaderBar({
  filters,
  onChange,
  seasonOptions,
  teams,
  tradeCount,
  onBack,
}: MarketHeaderBarProps) {
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              TRADE MARKET
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              League trade performance and value capture tracker
            </p>
            </div>
          <div className="flex items-center gap-4">
            <TradeMarketClock />
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
              </div>

        {/* Filter chips */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <select
            value={filters.season}
            onChange={(e) => onChange('season', e.target.value)}
            className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
          >
            <option value="all">All Seasons</option>
            {seasonOptions.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
          <select
            value={filters.weekRange}
            onChange={(e) => onChange('weekRange', e.target.value)}
            className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
          >
            <option value="all">All Weeks</option>
            <option value="0-4">Weeks 0-4</option>
            <option value="5-9">Weeks 5-9</option>
            <option value="10-14">Weeks 10-14</option>
            <option value="15-20">Weeks 15-20</option>
          </select>
          <select
            value={filters.roster}
            onChange={(e) => onChange('roster', e.target.value)}
            className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
          >
            <option value="all">All Rosters</option>
            {teams.map((team) => (
              <option key={team.rosterId} value={String(team.rosterId)}>
                {team.ownerName}
              </option>
            ))}
          </select>
          <select
            value={filters.asset}
            onChange={(e) => onChange('asset', e.target.value)}
            className="h-9 px-2 bg-secondary/40 border border-border rounded text-xs font-mono"
          >
            <option value="all">All Asset Types</option>
            <option value="players">Players</option>
            <option value="picks">Picks</option>
            <option value="faab">FAAB</option>
          </select>
          <div className="h-9 px-2 flex items-center text-[11px] text-muted-foreground font-mono border border-border rounded bg-secondary/20">
            {tradeCount} trades after filters
              </div>
            </div>
                              </div>
                        </div>
  )
}
