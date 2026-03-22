'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { fetchAllProspects, Position, Player } from '@/lib/players'

export function Header() {
  const { data: allPlayers = EMPTY_PLAYERS } = useSWR('prospect-board/all', fetchAllProspects)

  const { totalPlayers, minYear, maxYear, yearCount } = useMemo(() => {
    const combined = [...allPlayers.QB, ...allPlayers.RB, ...allPlayers.WR, ...allPlayers.TE]
    const years = Array.from(
      new Set(combined.map((p) => p.year).filter((year): year is number => year !== null))
    ).sort((a, b) => a - b)

    return {
      totalPlayers: combined.length,
      minYear: years.length > 0 ? years[0] : 2016,
      maxYear: years.length > 0 ? years[years.length - 1] : 2027,
      yearCount: years.length,
    }
  }, [allPlayers])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-border mb-8"
    >
      <div className="py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-2"
            >
              <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded border border-primary/30">
                {minYear}-{maxYear}
              </span>
              <span className="text-xs text-muted-foreground">Draft Classes</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-mono font-bold text-foreground tracking-tight"
            >
              PROSPECT<span className="text-primary">BOARD</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mt-1 text-sm max-w-xl"
            >
              Elite skill position prospect evaluations with comprehensive scouting data
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-6"
          >
            <StatBadge label="Positions" value="4" />
            <div className="w-px h-8 bg-border" />
            <StatBadge
              label="Prospects"
              value={totalPlayers > 0 ? totalPlayers.toString() : '...'}
            />
            <div className="w-px h-8 bg-border" />
            <StatBadge label="Classes" value={yearCount > 0 ? yearCount.toString() : '...'} />
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}

const EMPTY_PLAYERS: Record<Position, Player[]> = {
  QB: [],
  RB: [],
  WR: [],
  TE: [],
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-mono font-bold text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}
