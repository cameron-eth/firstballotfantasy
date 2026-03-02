'use client'

import {
  Zap,
  Users2,
  Trophy,
  ArrowRight,
  Eye,
  ShoppingCart,
  ShieldCheck,
  Activity,
  Target,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlayerCardHero } from '@/components/PlayerCardHero'

export function HeroSection() {
  return (
    <section className="relative max-w-7xl mx-auto pt-20 pb-24 md:pt-32 md:pb-40 px-6">
      {/* Background Intelligence Grid - Subtler */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-400/5 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10">
        {/* HUD Badges - Fantasy Focused */}
        <div className="flex flex-col items-center justify-center gap-4 mb-12 animate-on-scroll">
          <div className="inline-flex items-center space-x-2 text-[10px] font-black font-mono text-yellow-400 uppercase tracking-[0.3em] px-4 py-1.5 border border-yellow-400/20 rounded-full bg-yellow-400/5 backdrop-blur-md shadow-[0_0_30px_rgba(250,204,21,0.1)]">
            <Trophy className="h-3 w-3" />
            <span>2026 Dynasty Season Live</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                Diamond Tier Scouts Online
              </span>
            </div>
          </div>
        </div>

        {/* Main Heading - Fantasy Focused */}
        <div
          className="text-center mb-16 space-y-6 animate-on-scroll"
          style={{ animationDelay: '0.1s' }}
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter font-mono leading-[0.85] uppercase">
            <span className="text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              FIRSTBALLOT
            </span>
          </h1>
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <p className="text-xs md:text-sm text-slate-500 font-mono uppercase tracking-[0.4em] whitespace-nowrap">
              Built by degens, for degens
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>
        </div>

        {/* Action Modules - Fantasy Focused */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20 animate-on-scroll"
          style={{ animationDelay: '0.2s' }}
        >
          {/* Module 1: League Buddy */}
          <Link href="/league-buddy" className="group">
            <div className="h-full bg-slate-950/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 transition-all duration-500 hover:border-yellow-400/30 hover:bg-slate-900/60 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                <Users2 className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest mb-2">
                League Buddy
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed mb-6">
                Analyze your league rosters and identify trade targets.
              </p>
              <div className="mt-auto w-full py-3 bg-yellow-400 text-slate-950 font-black font-mono text-[10px] uppercase tracking-widest rounded-lg group-hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] transition-all">
                Enter League
              </div>
            </div>
          </Link>

          {/* Module 2: Scouting Portal */}
          <Link href="/scouting-portal" className="group">
            <div className="h-full bg-slate-950/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 transition-all duration-500 hover:border-blue-400/30 hover:bg-slate-900/60 flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest mb-2 text-blue-400">
                Scouting Portal
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed mb-6">
                Scout 2026 prospects with advanced data and comps.
              </p>
              <div className="mt-auto w-full py-3 border border-blue-400/30 text-blue-400 font-black font-mono text-[10px] uppercase tracking-widest rounded-lg group-hover:bg-blue-400 group-hover:text-slate-950 transition-all">
                Scout Prospects
              </div>
            </div>
          </Link>

          {/* Module 3: Trade Calc */}
          <Link href="/trade-calculator" className="group">
            <div className="h-full bg-slate-950/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 transition-all duration-500 hover:border-emerald-400/30 hover:bg-slate-900/60 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-6 group-hover:-rotate-6 transition-transform">
                <ShoppingCart className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest mb-2">
                Trade Calc
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed mb-6">
                Evaluate dynasty trades using our ML value index.
              </p>
              <div className="mt-auto w-full py-3 border border-slate-800 text-slate-500 font-black font-mono text-[10px] uppercase tracking-widest rounded-lg group-hover:border-emerald-400/30 group-hover:text-emerald-400 transition-all">
                Evaluate Trade
              </div>
            </div>
          </Link>
        </div>

        {/* Featured Content HUD */}
        <div className="animate-on-scroll" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-white/5" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <span className="text-[10px] font-black font-mono text-slate-700 uppercase tracking-[0.3em]">
                Featured Prospect Report
              </span>
            </div>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <PlayerCardHero
            playerName="Malik Nabers"
            position="WR"
            team="NYG"
            college="LSU"
            rank={8}
            projection="Elite WR1 upside with top-5 potential in year two. Technical separation index exceeds 92nd percentile."
            imageUrl="/maliknabers.jpg"
          />
        </div>
      </div>
    </section>
  )
}
