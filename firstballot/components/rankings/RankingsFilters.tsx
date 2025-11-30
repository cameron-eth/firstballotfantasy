'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
    <div className="flex flex-col gap-3 mt-4">
      {/* Search Bar - Full Width on Mobile */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search players..."
          value={filters.searchTerm}
          onChange={(e) => filters.setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-700 border-slate-600 text-white h-11"
        />
      </div>
      {/* Filter Row - Stack on Mobile, Side-by-Side on Desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
        <Select value={filters.positionFilter} onValueChange={filters.setPositionFilter}>
          <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-11 text-sm">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            <SelectItem value="all" className="text-white">
              All Positions
            </SelectItem>
            <SelectItem value="QB" className="text-white">
              QB
            </SelectItem>
            <SelectItem value="RB" className="text-white">
              RB
            </SelectItem>
            <SelectItem value="WR" className="text-white">
              WR
            </SelectItem>
            <SelectItem value="TE" className="text-white">
              TE
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.tierFilter} onValueChange={filters.setTierFilter}>
          <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-11 text-sm">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            <SelectItem value="all" className="text-white">
              All Tiers
            </SelectItem>
            {uniqueTiers.map((tier) => (
              <SelectItem key={tier} value={tier} className="text-white">
                Tier {tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
