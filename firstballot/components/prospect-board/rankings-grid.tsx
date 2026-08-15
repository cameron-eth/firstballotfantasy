'use client'

import { useState, useTransition } from 'react'
import useSWR from 'swr'
import { Player, Position, fetchAllProspects } from '@/lib/players'
import { PlayerCard } from './player-card'
import { SkeletonGrid } from './player-skeleton'
import { cn } from '@/lib/utils'

type FilterTier = 'all' | 'Elite' | 'Blue Chip' | 'Starter' | 'Rotational' | 'Depth' | 'Longshot'

/** Class filter: every undrafted class, one specific class, or the whole archive. */
type YearFilter = number | 'all' | 'upcoming'

/** Classes at or after this year have not been drafted yet. */
const FIRST_UPCOMING_CLASS = 2027

const TIER_ORDER: Exclude<FilterTier, 'all'>[] = [
  'Elite',
  'Blue Chip',
  'Starter',
  'Rotational',
  'Depth',
  'Longshot',
]

function matchesYear(year: number | null, filter: YearFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'upcoming') return (year ?? 0) >= FIRST_UPCOMING_CLASS
  return year === filter
}

const positions: { key: Position; label: string }[] = [
  { key: 'QB', label: 'QB' },
  { key: 'RB', label: 'RB' },
  { key: 'WR', label: 'WR' },
  { key: 'TE', label: 'TE' },
]

const EMPTY_PLAYERS: Record<Position, Player[]> = {
  QB: [],
  RB: [],
  WR: [],
  TE: [],
}

export function RankingsGrid() {
  const PAGE_SIZE = 30
  const [position, setPosition] = useState<Position>('QB')
  // Default to the undrafted classes. Sorting is by grade across every class,
  // so on 'all' the 2027/2028 prospects sit ~50-80 deep behind a decade of
  // drafted players and are effectively invisible.
  const [selectedYear, setSelectedYear] = useState<YearFilter>('upcoming')
  const [filter, setFilter] = useState<FilterTier>('all')
  const [sortBy, setSortBy] = useState<'rank' | 'grade' | 'physical' | 'production'>('rank')
  const [isPending, startTransition] = useTransition()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { data: allPlayers = EMPTY_PLAYERS, isLoading } = useSWR('prospect-board/all', fetchAllProspects)

  const handlePositionChange = (newPosition: Position) => {
    startTransition(() => {
      // Class and tier selections carry across positions — resetting them threw
      // away the filter the user had just set.
      setPosition(newPosition)
      setVisibleCount(PAGE_SIZE)
    })
  }

  const players = allPlayers[position]
  const years = Array.from(
    new Set(players.map((p) => p.year).filter((year): year is number => year !== null))
  ).sort((a, b) => b - a)
  const hasUpcoming = years.some((year) => year >= FIRST_UPCOMING_CLASS)

  const filteredPlayers = players
    .filter((p) => matchesYear(p.year, selectedYear))
    .filter((p) => filter === 'all' || p.tier === filter)
    .sort((a, b) => {
      if (sortBy === 'rank') {
        if (b.grade !== a.grade) return b.grade - a.grade
        return a.rank - b.rank
      }
      if (sortBy === 'grade') {
        if (b.grade !== a.grade) return b.grade - a.grade
        return a.rank - b.rank
      }
      if (sortBy === 'physical') return b.physical - a.physical
      if (sortBy === 'production') return b.production - a.production
      return 0
    })
    .map((player) => ({
      ...player,
      rank: player.rank,
    }))

  const yearFilteredPlayers = players.filter((p) => matchesYear(p.year, selectedYear))
  const visiblePlayers = filteredPlayers.slice(0, visibleCount)

  const tierCounts: Record<FilterTier, number> = {
    all: yearFilteredPlayers.length,
    Elite: 0,
    'Blue Chip': 0,
    Starter: 0,
    Rotational: 0,
    Depth: 0,
    Longshot: 0,
  }
  for (const player of yearFilteredPlayers) {
    if (player.tier in tierCounts && player.tier !== 'all') {
      tierCounts[player.tier as FilterTier] += 1
    }
  }
  const availableTiers: FilterTier[] = [
    'all',
    ...TIER_ORDER.filter((tier) => tierCounts[tier] > 0),
  ]

  return (
    <div className="lg:h-full lg:min-h-0 lg:flex lg:flex-col">
      {/* Toolbar. On lg+ it is a flex sibling of the scroll area below, so it is
          already pinned; `sticky` only applies while the whole page scrolls. */}
      <div className="lg:static sticky top-16 z-20 mb-4 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-card/90 space-y-2.5 shrink-0">
        {!isLoading && (
          <div className="text-sm text-muted-foreground">
            Showing {visiblePlayers.length} of {filteredPlayers.length} prospect
            {filteredPlayers.length !== 1 ? 's' : ''}
            {selectedYear === 'upcoming'
              ? ` from ${FIRST_UPCOMING_CLASS}+`
              : selectedYear !== 'all' && ` from ${selectedYear}`}
            {filter !== 'all' && ` (${filter})`}
          </div>
        )}

        {/* Row 1: Position + Draft Class */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            {positions.map((pos) => (
              <button
                key={pos.key}
                onClick={() => handlePositionChange(pos.key)}
                className={cn(
                  'h-8 px-4 text-xs font-bold uppercase tracking-wide rounded-md transition-colors',
                  position === pos.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>

          <span className="hidden sm:block w-px h-5 bg-border" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-0.5">
              Class
            </span>
            {hasUpcoming && (
              <button
                onClick={() => {
                  setSelectedYear('upcoming')
                  setVisibleCount(PAGE_SIZE)
                }}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-mono rounded transition-colors',
                  selectedYear === 'upcoming'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                UPCOMING
              </button>
            )}
            <button
              onClick={() => {
                setSelectedYear('all')
                setVisibleCount(PAGE_SIZE)
              }}
              className={cn(
                'h-7 px-2.5 text-[11px] font-mono rounded transition-colors',
                selectedYear === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              ALL
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year)
                  setVisibleCount(PAGE_SIZE)
                }}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-mono rounded transition-colors',
                  selectedYear === year
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Tier + Sort — flat, no inner card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-0.5">
              Tier
            </span>
            {availableTiers.map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setFilter(tier)
                  setVisibleCount(PAGE_SIZE)
                }}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-medium rounded transition-colors',
                  filter === tier
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {tier === 'all' ? 'All' : tier}
                <span className={cn('ml-1 text-[9px]', filter === tier ? 'opacity-80' : 'opacity-50')}>
                  ({tierCounts[tier]})
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mr-0.5">
              Sort
            </span>
            {(['rank', 'grade', 'physical', 'production'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => {
                  setSortBy(sort)
                  setVisibleCount(PAGE_SIZE)
                }}
                className={cn(
                  'h-7 px-2 text-[11px] font-mono rounded transition-colors',
                  sortBy === sort
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {sort === 'physical' ? 'PHYS' : sort === 'production' ? 'PROD' : sort.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
      {/* Grid */}
      {isLoading || isPending ? (
        <SkeletonGrid count={20} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {visiblePlayers.map((player, index) => (
            <PlayerCard key={player.id} player={player} index={index} />
          ))}
        </div>
      )}

      {!isLoading && visiblePlayers.length < filteredPlayers.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="px-5 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Load 30 More
          </button>
        </div>
      )}

      {!isLoading && filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No players match your criteria</p>
        </div>
      )}
      </div>
    </div>
  )
}
