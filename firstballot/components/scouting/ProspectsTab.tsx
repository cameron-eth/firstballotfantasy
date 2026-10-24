import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { ProspectCard } from './ProspectCard'
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
      {/* On desktop, the offset matches the 64px app header. On mobile the
          filters scroll away so they do not cover most of the player cards.
          Needs a near-opaque background, not `liquid-glass` — cards scroll
          underneath and read straight through a 50–74% translucent panel. */}
      <div className="md:sticky md:top-16 z-20 mb-4 md:mb-6 -mx-2 px-2 py-2.5 md:py-3 rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 px-2">
          <div>
            <h2 className="text-xl md:text-3xl font-black text-foreground font-mono tracking-tighter uppercase mb-1 md:mb-2">
              College <span className="text-blue-400">Prospects</span>
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              {displayedProspects.length} {draftYear === 'all' ? '' : `${draftYear} `}prospect
              {displayedProspects.length === 1 ? '' : 's'}
              {positionFilter === 'all' ? '' : ` · ${positionFilter}`}
              {onBoardOnly ? ' · on my board' : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Search prospects..."
                aria-label="Search prospects"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10 bg-background border-border text-foreground w-full sm:w-64 focus:border-blue-500/30 focus:ring-0 font-mono text-xs rounded-xl transition-all"
              />
            </div>

            <Select value={draftYear} onValueChange={handleDraftYearChange}>
              <SelectTrigger className="h-10 w-full sm:w-32 bg-background border-border text-foreground focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
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
              <SelectTrigger className="h-10 w-full sm:w-36 bg-background border-border text-foreground focus:border-blue-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
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
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto px-2 pb-0.5">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Classes</span>
          <button type="button" onClick={() => handleDraftYearChange('all')} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${draftYear === 'all' ? 'border-blue-400 bg-blue-400/15 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>All</button>
          {draftYears.filter((year) => year >= new Date().getFullYear()).slice(0, 5).map((year) => (
            <button key={year} type="button" onClick={() => handleDraftYearChange(String(year))} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${draftYear === String(year) ? 'border-blue-400 bg-blue-400/15 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>{year}</button>
          ))}
          <span className="mx-1 h-5 shrink-0 border-l border-border" />
          <button type="button" onClick={() => { setOnBoardOnly((current) => !current); setVisibleCount(PAGE_SIZE) }} aria-pressed={onBoardOnly} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${onBoardOnly ? 'border-blue-400 bg-blue-400/15 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>On my board · {draftBoard.length}</button>
          {(searchTerm || draftYear !== 'all' || positionFilter !== 'all' || onBoardOnly) && <button type="button" onClick={clearFilters} className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-slate-400 hover:text-white"><X className="h-3 w-3" /> Clear</button>}
        </div>
      </div>

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
