'use client'

/**
 * LeagueSelector Component
 * Global league selector dropdown for the header
 */

import { useState } from 'react'
import { ChevronDown, Trophy, Check, Loader2, Link as LinkIcon, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLeagueContext } from '@/lib/league-context'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { LeagueSelectorProps } from '@/types/league'

export function LeagueSelector({ compact = false, className = '' }: LeagueSelectorProps) {
  const { user } = useAuth()
  const { selectedLeague, leagues, selectLeague, isLoading } = useLeagueContext()

  const [isOpen, setIsOpen] = useState(false)

  // Don't render if not logged in
  if (!user) return null

  // No leagues state - show link button
  if (leagues.length === 0 && !isLoading) {
    return (
      <Link href="/league-buddy">
        <motion.button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20 transition-all ${className}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-mono font-bold uppercase tracking-tight">Link Sleeper</span>
        </motion.button>
      </Link>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/30 ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Loading...</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button - More Prominent */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-yellow-400/20 shadow-lg shadow-yellow-400/5 hover:border-yellow-400/40 hover:bg-slate-900/80 transition-all w-full"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0 border border-yellow-400/20">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] text-yellow-400/70 font-mono uppercase tracking-widest leading-none mb-1">
            Active League
          </div>
          <div className="text-sm font-bold text-white truncate font-mono uppercase tracking-tight">
            {selectedLeague?.name || 'Select League'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedLeague && (
            <Badge
              variant="outline"
              className="hidden sm:flex bg-slate-800/50 text-[10px] font-mono border-slate-700 h-5"
            >
              {selectedLeague.season}
            </Badge>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* League List */}
              <div className="max-h-64 overflow-y-auto py-1">
                {leagues.map((league) => (
                  <button
                    key={league.league_id}
                    onClick={() => {
                      selectLeague(league.league_id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors ${
                      selectedLeague?.league_id === league.league_id ? 'bg-yellow-400/5' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center ${
                        selectedLeague?.league_id === league.league_id
                          ? 'bg-yellow-400/20'
                          : 'bg-slate-700'
                      }`}
                    >
                      <Trophy
                        className={`w-3.5 h-3.5 ${
                          selectedLeague?.league_id === league.league_id
                            ? 'text-yellow-400'
                            : 'text-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div
                        className={`text-xs font-bold truncate font-mono uppercase ${
                          selectedLeague?.league_id === league.league_id
                            ? 'text-yellow-400'
                            : 'text-white'
                        }`}
                      >
                        {league.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {league.total_rosters} teams • {league.season}
                      </div>
                    </div>

                    {selectedLeague?.league_id === league.league_id && (
                      <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700" />

              {/* Actions */}
              <div className="p-1">
                <Link href="/league-buddy" onClick={() => setIsOpen(false)}>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white">
                    <Settings className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono uppercase font-bold">Manage Leagues</span>
                  </button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
