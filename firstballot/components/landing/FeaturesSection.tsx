'use client'

import { Zap, Users2, Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FeaturesSection() {
  return (
    <section className="max-w-7xl mx-auto py-12 sm:py-16 md:py-20 border-t border-slate-800">
      <div className="text-center mb-12 animate-on-scroll">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-mono mb-4">
          YOUR <span className="text-yellow-400">ARSENAL</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Elite tools engineered for dynasty dominance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Feature 1 */}
        <div
          className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-700 hover:border-yellow-400/60 transition-all duration-500 backdrop-blur-sm overflow-hidden animate-on-scroll"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/5 group-hover:to-transparent transition-all duration-500" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-yellow-400/20 rounded-xl border border-yellow-400/30 group-hover:scale-110 group-hover:bg-yellow-400/30 transition-all duration-300">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-800/50 flex items-center justify-center font-mono text-yellow-400 text-xl font-bold border border-slate-700">
                01
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-white font-mono group-hover:text-yellow-400 transition-colors">
              Draft Buddy
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Real-time draft board with rankings, tier analysis, and value calculations. Make the
              right pick every time.
            </p>
            <Link href="/draft-buddy">
              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-400 hover:text-yellow-300 font-mono p-0 h-auto hover:bg-transparent group-hover:translate-x-2 transition-transform duration-300 flex items-center"
              >
                EXPLORE <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature 2 */}
        <div
          className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-700 hover:border-green-400/60 transition-all duration-500 backdrop-blur-sm overflow-hidden animate-on-scroll"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-green-400/0 group-hover:from-green-400/5 group-hover:to-transparent transition-all duration-500" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-green-400/20 rounded-xl border border-green-400/30 group-hover:scale-110 group-hover:bg-green-400/30 transition-all duration-300">
                <Users2 className="h-6 w-6 text-green-400" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-800/50 flex items-center justify-center font-mono text-green-400 text-xl font-bold border border-slate-700">
                02
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-white font-mono group-hover:text-green-400 transition-colors">
              League Buddy
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Deep team analysis, matchup projections, and dynasty roster grades. Know your
              competition inside out.
            </p>
            <Link href="/league-buddy">
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:text-green-300 font-mono p-0 h-auto hover:bg-transparent group-hover:translate-x-2 transition-transform duration-300 flex items-center"
              >
                EXPLORE <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature 3 */}
        <div
          className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-700 hover:border-yellow-400/60 transition-all duration-500 backdrop-blur-sm overflow-hidden animate-on-scroll"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/5 group-hover:to-transparent transition-all duration-500" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-yellow-400/20 rounded-xl border border-yellow-400/30 group-hover:scale-110 group-hover:bg-yellow-400/30 transition-all duration-300">
                <Target className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-800/50 flex items-center justify-center font-mono text-yellow-400 text-xl font-bold border border-slate-700">
                03
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-white font-mono group-hover:text-yellow-400 transition-colors">
              Scouting Portal
            </h3>
            <p className="text-gray-300 leading-relaxed">
              2026 rookie rankings with college stats and dynasty projections. Stay ahead of the
              draft curve.
            </p>
            <Link href="/scouting-portal">
              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-400 hover:text-yellow-300 font-mono p-0 h-auto hover:bg-transparent group-hover:translate-x-2 transition-transform duration-300 flex items-center"
              >
                EXPLORE <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
