"use client"

import { Header } from "@/components/header"
import { PlayerCardHero } from "@/components/PlayerCardHero"
import { Button } from "@/components/ui/button"
import { 
  Zap, 
  Users2, 
  Trophy, 
  Target,
  ArrowRight,
  Music,
  Play
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto py-8 sm:py-12 md:py-16 lg:py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-yellow-400 uppercase tracking-wider mb-6 px-4 py-2 border border-yellow-400/30 rounded-full bg-yellow-400/5">
              <Trophy className="h-3 w-3" />
              <span>Dynasty Fantasy Football</span>
        </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight font-mono">
              FIRST BALLOT
              </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-green-400 font-bold font-mono max-w-2xl mx-auto mb-8 sm:mb-12">
              Built by degens, for degens
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <Link href="/draft-buddy" className="w-full sm:w-auto">
                <Button size="lg" className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-6 sm:px-8 font-mono w-full sm:w-auto min-h-[48px] text-sm sm:text-base">
                  <Zap className="h-4 w-4 mr-2" />
                  DRAFT BUDDY
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/league-buddy" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900 px-6 sm:px-8 font-mono w-full sm:w-auto min-h-[48px] text-sm sm:text-base">
                  <Users2 className="h-4 w-4 mr-2" />
                  LEAGUE BUDDY
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
              </div>

          {/* Featured Player Card */}
          <div className="mb-12 sm:mb-16 md:mb-24">
            <PlayerCardHero
              playerName="Malik Nabers"
              position="WR"
              team="NYG"
              college="LSU"
              rank={8}
              projection="Elite WR1 upside with top-5 potential in year two"
              imageUrl="/maliknabers.jpg"
            />
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto py-8 sm:py-12 md:py-16 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12 md:mb-16">
            {/* Feature 1 */}
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-yellow-400/30 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-400/20 rounded-md">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white font-mono">Draft Buddy</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Real-time draft board with rankings, tier analysis, and value calculations
              </p>
              <Link href="/draft-buddy">
                <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300 font-mono p-0 h-auto hover:bg-transparent min-h-[44px] flex items-center">
                  EXPLORE <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-yellow-400/30 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-400/20 rounded-md">
                  <Users2 className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white font-mono">League Buddy</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Deep team analysis, matchup projections, and dynasty roster grades
              </p>
              <Link href="/league-buddy">
                <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300 font-mono p-0 h-auto hover:bg-transparent min-h-[44px] flex items-center">
                  EXPLORE <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-yellow-400/30 transition-all">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-400/20 rounded-md">
                  <Target className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white font-mono">Scouting Portal</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                2026 rookie rankings with college stats and dynasty projections
              </p>
              <Link href="/scouting-portal">
                <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300 font-mono p-0 h-auto hover:bg-transparent min-h-[44px] flex items-center">
                  EXPLORE <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="max-w-7xl mx-auto py-8 sm:py-12 md:py-16 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            <a 
                href="https://www.tiktok.com/@firstballotfb" 
                target="_blank" 
                rel="noopener noreferrer"
              className="group flex items-center space-x-3 sm:space-x-4 p-4 sm:p-6 border border-slate-700 rounded-lg hover:border-yellow-400/50 transition-all bg-slate-800/50 min-h-[64px] sm:min-h-[80px]"
            >
              <div className="p-2 sm:p-3 bg-yellow-400/10 rounded-md group-hover:bg-yellow-400/20 transition-colors flex-shrink-0">
                <Music className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 font-mono">TikTok</h3>
                <p className="text-xs sm:text-sm text-gray-400">@firstballotfb</p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
            </a>

            <a 
                href="https://www.youtube.com/@FirstBallotPod" 
                target="_blank" 
                rel="noopener noreferrer"
              className="group flex items-center space-x-3 sm:space-x-4 p-4 sm:p-6 border border-slate-700 rounded-lg hover:border-yellow-400/50 transition-all bg-slate-800/50 min-h-[64px] sm:min-h-[80px]"
            >
              <div className="p-2 sm:p-3 bg-yellow-400/10 rounded-md group-hover:bg-yellow-400/20 transition-colors flex-shrink-0">
                <Play className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 font-mono">YouTube</h3>
                <p className="text-xs sm:text-sm text-gray-400">@FirstBallotPod</p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
            </a>
          </div>
        </section>

        {/* Footer Spacing */}
        <div className="h-12 sm:h-16 md:h-24" />
      </main>
    </div>
  )
}
