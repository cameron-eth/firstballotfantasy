'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, User, LogOut, Menu, X, Lock, Crown, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMembership } from '@/hooks/use-membership'
import { useState } from 'react'
import { MegaMenu } from './navigation/MegaMenu'
import { BottomNav } from './navigation/BottomNav'
import { LeagueSelector } from './navigation/LeagueSelector'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { isMember, loading: membershipLoading } = useMembership()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      setMobileMenuOpen(false)
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    }
  }

  return (
    <>
      <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Main Header */}
          <div className="flex items-center justify-between h-16 min-h-[64px]">
            {/* Logo and Brand */}
            <Link
              href="/"
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
            >
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
                <div className="flex items-center space-x-2 animate-in fade-in duration-200">
                  {/* PRO User - Premium Design */}
                  {!membershipLoading && isMember && (
                    <div className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-purple-500/30 shadow-lg shadow-purple-500/25 hover:scale-[1.02] transition-transform">
                      <div className="flex items-center space-x-1">
                        <Sparkles className="h-3 w-3 text-purple-400 animate-wiggle" />
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

                      <button
                        onClick={handleSignOut}
                        className="text-gray-400 hover:text-red-400 hover:scale-110 active:scale-90 transition-all p-1 rounded"
                        title="Sign out"
                      >
                        <LogOut className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* FREE User - Standard Design */}
                  {!membershipLoading && !isMember && (
                    <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/50 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-slate-600/50 hover:scale-[1.02] transition-transform">
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

                      <button
                        onClick={handleSignOut}
                        className="text-gray-400 hover:text-red-400 hover:scale-110 active:scale-90 transition-all p-1 rounded"
                        title="Sign out"
                      >
                        <LogOut className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {membershipLoading && (
                    <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/50 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 border border-slate-600/50 animate-in fade-in">
                      <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-400 text-xs font-mono hidden sm:block">
                        Loading...
                      </span>
                    </div>
                  )}
                </div>
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
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-slate-700/50 hover:scale-105 active:scale-95 rounded-lg transition-all flex items-center justify-center"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Profile Menu (Dropdown from top) */}
          <div
            className={cn(
              'md:hidden overflow-hidden transition-all duration-200 ease-in-out',
              mobileMenuOpen && user
                ? 'max-h-80 opacity-100 pb-4 border-t border-slate-700/50 pt-4'
                : 'max-h-0 opacity-0'
            )}
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
                  <div className="text-sm font-bold text-white truncate max-w-[200px]">
                    {user?.email}
                  </div>
                  <div className="text-xs text-gray-400">
                    {isMember ? 'PRO MEMBER' : 'FREE ACCOUNT'}
                  </div>
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
                  onClick={handleSignOut}
                  className="flex items-center justify-center space-x-2 p-3 bg-red-500/10 rounded-xl text-sm font-mono text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>LOGOUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CSS for sparkle wiggle — pure GPU, no JS per frame */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes wiggle {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(10deg); }
              75% { transform: rotate(-10deg); }
            }
            .animate-wiggle {
              animation: wiggle 2s ease-in-out infinite;
            }
          `,
        }}
      />

      {/* Global Mobile Bottom Nav */}
      <BottomNav />
    </>
  )
}
