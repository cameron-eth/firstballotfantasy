'use client'

import { useState, useEffect, useTransition } from 'react'
import { Player, Position, fetchAllProspects } from '@/lib/players'
import { PlayerCard } from './player-card'
import { SkeletonGrid } from './player-skeleton'
import { cn } from '@/lib/utils'

type FilterTier = 'all' | 'Elite' | 'Blue Chip' | 'Starter' | 'Rotational' | 'Depth' | 'Longshot'

const positions: { key: Position; label: string }[] = [
  { key: 'QB', label: 'QB' },
  { key: 'RB', label: 'RB' },
  { key: 'WR', label: 'WR' },
  { key: 'TE', label: 'TE' },
]

export function RankingsGrid() {
  const PAGE_SIZE = 30
  const [allPlayers, setAllPlayers] = useState<Record<Position, Player[]>>({
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  })
  const [position, setPosition] = useState<Position>('QB')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [filter, setFilter] = useState<FilterTier>('all')
  const [sortBy, setSortBy] = useState<'rank' | 'grade' | 'physical' | 'production'>('rank')
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchAllProspects()
      .then((data) => {
        setAllPlayers(data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load prospects:', err)
        setIsLoading(false)
      })
  }, [])

  const handlePositionChange = (newPosition: Position) => {
    setIsLoading(true)
    startTransition(() => {
      setPosition(newPosition)
      setSelectedYear('all')
      setFilter('all')
      setSortBy('rank')
    })
    setTimeout(() => setIsLoading(false), 400)
  }

  const players = allPlayers[position]
  const years = Array.from(
    new Set(players.map((p) => p.year).filter((year): year is number => year !== null))
  ).sort((a, b) => b - a)

  const filteredPlayers = players
    .filter((p) => selectedYear === 'all' || p.year === selectedYear)
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

  const yearFilteredPlayers = players.filter(
    (p) => selectedYear === 'all' || p.year === selectedYear
  )
  const visiblePlayers = filteredPlayers.slice(0, visibleCount)

  const tierCounts = {
    all: yearFilteredPlayers.length,
    Elite: yearFilteredPlayers.filter((p) => p.tier === 'Elite').length,
    'Blue Chip': yearFilteredPlayers.filter((p) => p.tier === 'Blue Chip').length,
    Starter: yearFilteredPlayers.filter((p) => p.tier === 'Starter').length,
    Rotational: yearFilteredPlayers.filter((p) => p.tier === 'Rotational').length,
    Depth: yearFilteredPlayers.filter((p) => p.tier === 'Depth').length,
    Longshot: yearFilteredPlayers.filter((p) => p.tier === 'Longshot').length,
  }
  const availableTiers: FilterTier[] = [
    'all',
    ...Object.entries(tierCounts)
      .filter(([tier, count]) => tier !== 'all' && count > 0)
      .map(([tier]) => tier as FilterTier),
  ]

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [position, selectedYear, filter, sortBy])

  return (
    <div>
      {/* ── Sticky toolbar — flat, single container ── */}
      <div className="sticky top-16 z-20 -mx-2 -mt-2 px-4 pt-4 pb-3 mb-2 liquid-glass rounded-xl space-y-2.5">
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
            <button
              onClick={() => setSelectedYear('all')}
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
                onClick={() => setSelectedYear(year)}
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
                onClick={() => setFilter(tier)}
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
                onClick={() => setSortBy(sort)}
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

      {!isLoading && (
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {visiblePlayers.length} of {filteredPlayers.length} prospect
          {filteredPlayers.length !== 1 ? 's' : ''}
          {selectedYear !== 'all' && ` from ${selectedYear}`}
          {filter !== 'all' && ` (${filter})`}
        </div>
      )}

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
  )
}
