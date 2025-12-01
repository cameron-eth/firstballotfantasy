'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import type { RankingsFilters } from '@/types/rankings'

interface RankingsFiltersProps {
  filters: RankingsFilters & {
    setSearchTerm: (value: string) => void
    setPositionFilter: (value: string) => void
    setTierFilter: (value: string) => void
  }
  uniqueTiers: string[]
}

export function RankingsFilters({ filters, uniqueTiers }: RankingsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* Search Bar - Full Width on Mobile */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search players..."
          value={filters.searchTerm}
          onChange={(e) => filters.setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-950 border-slate-800 text-white h-11 rounded-lg focus:border-blue-500/50 focus:ring-blue-500/20"
        />
      </div>

      {/* Filters Container */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        {/* Position Filter */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Position</div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={filters.positionFilter === 'all' ? 'default' : 'outline'}
              onClick={() => filters.setPositionFilter('all')}
              className={
                filters.positionFilter === 'all'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)] h-7 text-xs'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
              }
            >
              All
            </Button>
            {['QB', 'RB', 'WR', 'TE'].map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={filters.positionFilter === pos ? 'default' : 'outline'}
                onClick={() => filters.setPositionFilter(pos)}
                className={
                  filters.positionFilter === pos
                    ? 'bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)] h-7 text-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                }
              >
                {pos}
              </Button>
            ))}
          </div>
        </div>

        {/* Tier Filter */}
        <div>
          <div className="text-xs text-slate-400 mb-1 text-left sm:text-right">Tier</div>
          <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
            <Button
              size="sm"
              variant={filters.tierFilter === 'all' ? 'default' : 'outline'}
              onClick={() => filters.setTierFilter('all')}
              className={
                filters.tierFilter === 'all'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)] h-7 text-xs'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
              }
            >
              All
            </Button>
            {uniqueTiers.map((tier) => (
              <Button
                key={tier}
                size="sm"
                variant={filters.tierFilter === tier ? 'default' : 'outline'}
                onClick={() => filters.setTierFilter(tier)}
                className={
                  filters.tierFilter === tier
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)] h-7 text-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600 h-7 text-xs transition-colors'
                }
              >
                {tier}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
