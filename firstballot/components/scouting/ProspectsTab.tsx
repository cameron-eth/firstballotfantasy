import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { ProspectCard } from './ProspectCard'
import { ScoutingSectionHeader } from './ScoutingSectionHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Prospect } from './types'

interface ProspectsTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  draftYear: string
  setDraftYear: (year: string) => void
  filteredProspects: Prospect[]
  allProspects: Prospect[]
  draftBoard: Prospect[]
  onProspectSelect: (prospect: Prospect) => void
  onShowComps: (prospect: Prospect) => void
  isDiamondTier: (prospect: Prospect) => boolean
  positionNeeds: Record<string, number>
}

export function ProspectsTab({
  loading,
  searchTerm,
  setSearchTerm,
  positionFilter,
  setPositionFilter,
  draftYear,
  setDraftYear,
  filteredProspects,
  allProspects,
  draftBoard,
  onProspectSelect,
  onShowComps,
  isDiamondTier,
  positionNeeds,
}: ProspectsTabProps) {
  const PAGE_SIZE = 30
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [onBoardOnly, setOnBoardOnly] = useState(false)
  const boardIds = useMemo(() => new Set(draftBoard.map((player) => player.id)), [draftBoard])
  const displayedProspects = onBoardOnly
    ? filteredProspects.filter((player) => boardIds.has(player.id))
    : filteredProspects
  const visibleProspects = displayedProspects.slice(0, visibleCount)

  // Derived from the data so a newly imported class shows up without an edit.
  const draftYears = useMemo(
    () =>
      Array.from(
        new Set(
          allProspects
            .map((p) => p.draft_year)
            .filter((year): year is number => typeof year === 'number')
        )
      ).sort((a, b) => b - a),
    [allProspects]
  )

  const handleSearchChange = (term: string) => {
    setVisibleCount(PAGE_SIZE)
    setSearchTerm(term)
  }

  const handleDraftYearChange = (year: string) => {
    setVisibleCount(PAGE_SIZE)
    setDraftYear(year)
  }

  const handlePositionChange = (nextPosition: string) => {
    setVisibleCount(PAGE_SIZE)
    setPositionFilter(nextPosition)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDraftYear('all')
    setPositionFilter('all')
    setOnBoardOnly(false)
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="relative">
      <ScoutingSectionHeader
        title="College Prospects"
        description={`${displayedProspects.length} ${draftYear === 'all' ? '' : `${draftYear} `}prospects${positionFilter === 'all' ? '' : ` · ${positionFilter}`}${onBoardOnly ? ' · on my board' : ''}`}
        secondary={<>
          <button type="button" onClick={() => { setOnBoardOnly((current) => !current); setVisibleCount(PAGE_SIZE) }} aria-pressed={onBoardOnly} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${onBoardOnly ? 'border-blue-400 bg-blue-400/15 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>On my board · {draftBoard.length}</button>
          {(searchTerm || draftYear !== 'all' || positionFilter !== 'all' || onBoardOnly) && <button type="button" onClick={clearFilters} className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /> Clear filters</button>}
        </>}
      >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(12rem,1fr)_8rem_9rem] lg:w-auto">
            <div className="relative group col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Search prospects..."
                aria-label="Search prospects"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10 bg-background border-border text-foreground w-full focus:border-blue-500/30 focus:ring-0 font-mono text-xs rounded-xl transition-all"
              />
            </div>

            <Select value={draftYear} onValueChange={handleDraftYearChange}>
              <SelectTrigger className="h-10 w-full bg-background border-border text-foreground focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground font-mono text-[10px]">
                <SelectItem value="all">ALL YEARS</SelectItem>
                {draftYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} CLASS
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={handlePositionChange}>
              <SelectTrigger className="h-10 w-full bg-background border-border text-foreground focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground font-mono text-[10px]">
                <SelectItem value="all">ALL ASSETS</SelectItem>
                <SelectItem value="QB">QUARTERBACKS</SelectItem>
                <SelectItem value="RB">RUNNING BACKS</SelectItem>
                <SelectItem value="WR">WIDE RECEIVERS</SelectItem>
                <SelectItem value="TE">TIGHT ENDS</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </ScoutingSectionHeader>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
            Accessing Secure Database...
          </p>
        </div>
      ) : (
        // The grid scrolls with the page — a fixed-height inner scroller here
        // traps the wheel and clips rows behind the sticky filter bar.
        <div>
          {displayedProspects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Search className="mx-auto mb-3 h-6 w-6 text-blue-300" />
              <h3 className="text-lg font-semibold text-foreground">No prospects match this view</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another class or position, or clear the filters to see everyone.</p>
              <button type="button" onClick={clearFilters} className="mt-5 rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-300">Show all prospects</button>
            </div>
          ) : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 pb-24 md:pb-10">
            {visibleProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                onSelect={onProspectSelect}
                onCompare={onShowComps}
                isOnBoard={boardIds.has(prospect.id)}
                variant="dossier"
                isDiamondTier={isDiamondTier(prospect)}
                positionNeed={positionNeeds[prospect.position] || 0}
              />
            ))}
          </div>}
          {visibleProspects.length < displayedProspects.length && (
            <div className="pb-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-5 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Load 30 More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
