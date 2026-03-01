'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Player, Position, fetchAllProspects } from '@/lib/players'
import { PlayerCard } from './player-card'
import { SkeletonGrid } from './player-skeleton'
import { cn } from '@/lib/utils'

type FilterTier = 'all' | 'Elite' | 'Blue Chip' | 'Starter' | 'Rotational' | 'Depth' | 'Longshot'

const positions: { key: Position; label: string }[] = [
  { key: 'QB', label: 'Quarterbacks' },
  { key: 'RB', label: 'Running Backs' },
  { key: 'WR', label: 'Wide Receivers' },
  { key: 'TE', label: 'Tight Ends' },
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

  // Load all prospects once on mount
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
    // Brief loading state for visual feedback
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
        if (selectedYear === 'all') return b.grade - a.grade
        return a.rank - b.rank
      }
      if (sortBy === 'grade') return b.grade - a.grade
      if (sortBy === 'physical') return b.physical - a.physical
      if (sortBy === 'production') return b.production - a.production
      return 0
    })
    .map((player, index) => ({
      ...player,
      rank: selectedYear === 'all' ? index + 1 : player.rank,
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
      <div className="sticky top-16 z-20 -mx-2 -mt-2 px-2 pt-4 pb-2 mb-2 liquid-glass rounded-xl">
        {/* Position Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <motion.button
                key={pos.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePositionChange(pos.key)}
                className={cn(
                  'px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-200',
                  position === pos.key
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                <span className="mr-2">{pos.key}</span>
                <span className="hidden sm:inline opacity-70">{pos.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Year Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Draft Class
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedYear('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-mono rounded transition-all',
                selectedYear === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              ALL
            </motion.button>
            {years.map((year) => (
              <motion.button
                key={year}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono rounded transition-all',
                  selectedYear === year
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {year}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <motion.div
          layout
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-secondary/30 rounded-lg border border-border"
        >
          {/* Tier Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2 uppercase tracking-wider">
              Tier
            </span>
            {availableTiers.map((tier) => (
              <FilterButton
                key={tier}
                active={filter === tier}
                onClick={() => setFilter(tier)}
                count={tierCounts[tier]}
              >
                {tier === 'all' ? 'All' : tier}
              </FilterButton>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2 uppercase tracking-wider">
              Sort
            </span>
            {(['rank', 'grade', 'physical', 'production'] as const).map((sort) => (
              <SortButton key={sort} active={sortBy === sort} onClick={() => setSortBy(sort)}>
                {sort === 'physical' ? 'PHYS' : sort === 'production' ? 'PROD' : sort.toUpperCase()}
              </SortButton>
            ))}
          </div>
        </motion.div>
      </div>

      {!isLoading && (
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {visiblePlayers.length} of {filteredPlayers.length} prospect
          {filteredPlayers.length !== 1 ? 's' : ''}
          {selectedYear !== 'all' && ` from ${selectedYear}`}
          {filter !== 'all' && ` (${filter})`}
        </div>
      )}

      {/* Grid with Loading State */}
      <AnimatePresence mode="wait">
        {isLoading || isPending ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SkeletonGrid count={20} />
          </motion.div>
        ) : (
          <motion.div
            key={`${position}-${selectedYear}-${filter}-${sortBy}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          >
            {visiblePlayers.map((player, index) => (
              <PlayerCard
                key={`${player.position}-${player.espnId || player.name}`}
                player={player}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-muted-foreground">No players match your criteria</p>
        </motion.div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count: number
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded transition-all',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      )}
    >
      {children}
      <span className={cn('ml-1.5 text-[10px]', active ? 'opacity-80' : 'opacity-50')}>
        ({count})
      </span>
    </motion.button>
  )
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs font-mono transition-all rounded',
        active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </motion.button>
  )
}
