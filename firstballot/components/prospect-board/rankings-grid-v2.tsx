'use client'

import { useMemo, useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { fetchAllProspects, Player, Position } from '@/lib/players'
import { PlayerCard } from './player-card'
import { SkeletonGrid } from './player-skeleton'

type BoardMode = 'prospects' | 'draft-board' | 'historical' | 'all-time'

const EMPTY_PLAYERS: Record<Position, Player[]> = {
  QB: [],
  RB: [],
  WR: [],
  TE: [],
}

export function RankingsGridV2() {
  const [mode, setMode] = useState<BoardMode>('prospects')
  const [query, setQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2026)
  const [asset, setAsset] = useState<'ALL ASSETS' | Position>('ALL ASSETS')
  const [isPending, startTransition] = useTransition()
  const { data: allPlayers = EMPTY_PLAYERS, isLoading } = useSWR('prospect-board/all', fetchAllProspects)

  const pool = useMemo(
    () => [...allPlayers.QB, ...allPlayers.RB, ...allPlayers.WR, ...allPlayers.TE],
    [allPlayers]
  )
  const years = useMemo(
    () =>
      Array.from(new Set(pool.map((p) => p.year).filter((y): y is number => y !== null))).sort(
        (a, b) => b - a
      ),
    [pool]
  )

  const modeToYear = (m: BoardMode): number | 'all' => {
    if (m === 'all-time') return 'all'
    if (m === 'historical') return 2024
    return 2026
  }

  const filteredPlayers = useMemo(() => {
    return pool
      .filter((p) => asset === 'ALL ASSETS' || p.position === asset)
      .filter((p) => selectedYear === 'all' || p.year === selectedYear)
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (selectedYear === 'all' || mode === 'all-time') return b.grade - a.grade
        return a.rank - b.rank
      })
      .map((p, idx) => ({
        ...p,
        rank: selectedYear === 'all' || mode === 'all-time' ? idx + 1 : p.rank,
      }))
  }, [pool, asset, selectedYear, query, mode])

  const modeTabs: { key: BoardMode; label: string }[] = [
    { key: 'prospects', label: 'PROSPECTS' },
    { key: 'draft-board', label: 'DRAFT BOARD' },
    { key: 'historical', label: 'HISTORICAL' },
    { key: 'all-time', label: 'ALL-TIME' },
  ]

  const handleModeChange = (next: BoardMode) => {
    startTransition(() => {
      setMode(next)
      setSelectedYear(modeToYear(next))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {modeTabs.map((tab) => (
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleModeChange(tab.key)}
            className={cn(
              'px-6 py-3 rounded-xl border text-sm font-mono tracking-widest transition-all',
              mode === tab.key
                ? 'bg-primary/20 border-primary/60 text-primary shadow-[0_0_0_1px_rgba(255,200,80,0.35)]'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      <div>
        <h2 className="text-5xl font-mono font-extrabold tracking-tight">
          <span className="text-foreground">COLLEGE </span>
          <span className="text-blue-400">PROSPECTS</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground uppercase tracking-[0.2em]">
          Comprehensive 2026 rookie database and rankings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prospects..."
            className="w-full h-14 rounded-xl border border-border bg-card px-5 font-mono text-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={String(selectedYear)}
            onChange={(e) =>
              setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="w-full h-14 rounded-xl border border-border bg-card px-4 font-mono text-lg text-foreground outline-none focus:border-primary/60"
          >
            <option value="all">ALL-TIME</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year} CLASS
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value as 'ALL ASSETS' | Position)}
            className="w-full h-14 rounded-xl border border-border bg-card px-4 font-mono text-lg text-foreground outline-none focus:border-primary/60"
          >
            <option>ALL ASSETS</option>
            <option>QB</option>
            <option>RB</option>
            <option>WR</option>
            <option>TE</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <span className="text-sm uppercase tracking-[0.18em] text-muted-foreground border border-border rounded-lg px-4 py-2">
          Showing {filteredPlayers.length} Athletes
        </span>
      </div>

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
            key={`${mode}-${selectedYear}-${asset}-${query}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          >
            {filteredPlayers.map((player, index) => (
              <PlayerCard
                key={`${player.position}-${player.year}-${player.espnId || player.name}`}
                player={player}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
