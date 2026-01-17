'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Lock,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMembership } from '@/hooks/use-membership'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MegaMenu } from './navigation/MegaMenu'
import { BottomNav } from './navigation/BottomNav'
import { LeagueSelector } from './navigation/LeagueSelector'

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { isMember, loading: membershipLoading } = useMembership()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Main Header */}
          <div className="flex items-center justify-between h-16 min-h-[64px]">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-green-400 font-mono tracking-wide">
                  FIRST BALLOT
                </h1>
                <p className="text-xs text-gray-400 font-mono leading-none">FANTASY</p>
              </div>
            </Link>

            {/* League Selector - Centered and Always Visible on Desktop */}
            <div className="hidden lg:flex items-center justify-center flex-1 px-8">
              <LeagueSelector className="w-full max-w-md" />
            </div>

            {/* Navigation and User */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <MegaMenu isLoggedIn={!!user} />
              </div>
              
              {user ? (
                // ... rest of user section stays similar but maybe more compact
                <motion.div
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* PRO User - Premium Design */}
                  {!membershipLoading && isMember && (
                    <motion.div
                      className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-purple-500/30 shadow-lg shadow-purple-500/25"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center space-x-1">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Sparkles className="h-3 w-3 text-purple-400" />
                        </motion.div>
                        <span className="text-purple-400 text-xs font-bold font-mono hidden sm:block">
                          PRO
                        </span>
                      </div>

                      <div className="flex items-center justify-center w-6 h-6 bg-purple-400/20 rounded-full border border-purple-400/30">
                        <Crown className="h-3 w-3 text-purple-400" />
                      </div>

                      <span className="text-purple-300 text-xs sm:text-sm font-mono hidden sm:block max-w-[120px] truncate">
                        {user.email}
                      </span>

                      <motion.button
                        onClick={signOut}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded"
                        title="Sign out"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <LogOut className="h-3 w-3" />
                      </motion.button>
                    </motion.div>
                  )}

                  {/* FREE User - Standard Design */}
                  {!membershipLoading && !isMember && (
                    <motion.div
                      className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/50 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-slate-600/50"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold font-mono hidden sm:block">
                          FREE
                        </span>
                      </div>

                      <div className="flex items-center justify-center w-6 h-6 bg-slate-600/50 rounded-full border border-slate-500/50">
                        <User className="h-3 w-3 text-gray-400" />
                      </div>

                      <span className="text-gray-300 text-xs sm:text-sm font-mono hidden sm:block max-w-[120px] truncate">
                        {user.email}
                      </span>

                      {/* Upgrade Button for FREE users */}
                      <Link
                        href="/billing"
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 px-2 py-1 rounded text-xs font-bold font-mono hover:from-yellow-300 hover:to-orange-300 transition-all duration-200 shadow-md"
                      >
                        UPGRADE
                      </Link>

                      <motion.button
                        onClick={signOut}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded"
                        title="Sign out"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <LogOut className="h-3 w-3" />
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {membershipLoading && (
                    <motion.div
                      className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/50 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-slate-600/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-400 text-xs font-mono hidden sm:block">
                        Loading...
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <Link
                  href="/login"
                  className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono text-sm hover:bg-yellow-300 transition-all duration-200 shadow-lg shadow-yellow-400/25"
                >
                  LOGIN
                </Link>
              )}

              {/* Mobile Profile Toggle (Only if logged in) */}
              {user && (
                <motion.button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </motion.button>
              )}
            </div>
          </div>

          {/* Mobile Profile Menu (Dropdown from top) */}
          <AnimatePresence>
            {mobileMenuOpen && user && (
              <motion.div
                className="md:hidden pb-4 border-t border-slate-700/50 pt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <div className="flex flex-col space-y-4 px-2">
                  {/* Mobile League Selector */}
                  <div className="mb-2">
                    <LeagueSelector compact className="w-full" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-xl">
                    <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-300" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-[200px]">{user.email}</div>
                      <div className="text-xs text-gray-400">{isMember ? 'PRO MEMBER' : 'FREE ACCOUNT'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/billing"
                      className="flex items-center justify-center space-x-2 p-3 bg-slate-700/50 rounded-xl text-sm font-mono text-gray-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Crown className="h-4 w-4 text-yellow-400" />
                      <span>BILLING</span>
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setMobileMenuOpen(false)
                      }}
                      className="flex items-center justify-center space-x-2 p-3 bg-red-500/10 rounded-xl text-sm font-mono text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>LOGOUT</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      
      {/* Global Mobile Bottom Nav */}
      <BottomNav />
    </>
  )
}
