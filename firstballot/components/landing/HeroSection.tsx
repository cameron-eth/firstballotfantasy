'use client'

import { Zap, Users2, Trophy, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlayerCardHero } from '@/components/PlayerCardHero'

export function HeroSection() {
  return (
    <section className="relative max-w-7xl mx-auto py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-green-400/5 rounded-3xl blur-3xl" />
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-[128px] animate-pulse"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-[128px] animate-pulse"
        style={{ animationDuration: '6s', animationDelay: '1s' }}
      />

      <div className="relative text-center mb-16 space-y-8">
        <div className="inline-flex items-center space-x-2 text-xs font-mono text-yellow-400 uppercase tracking-wider mb-6 px-4 py-2 border border-yellow-400/40 rounded-full bg-yellow-400/10 backdrop-blur-sm shadow-[0_0_20px_rgba(250,204,21,0.3)] animate-on-scroll">
          <Trophy className="h-3 w-3" />
          <span>Dynasty Fantasy Football</span>
        </div>

        <div className="space-y-6 animate-on-scroll" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight font-mono leading-none">
            FIRST
            <br />
            <span className="text-yellow-400">BALLOT</span>
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </div>

        <p
          className="text-xl sm:text-2xl md:text-3xl text-green-400 font-bold font-mono max-w-2xl mx-auto animate-on-scroll"
          style={{ animationDelay: '0.2s' }}
        >
          Built by degens, for degens
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center max-w-md sm:max-w-none mx-auto pt-4 animate-on-scroll"
          style={{ animationDelay: '0.3s' }}
        >
          <Link href="/draft-buddy" className="w-full sm:w-auto group">
            <Button
              size="lg"
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-8 font-mono w-full sm:w-auto h-14 text-base shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:shadow-[0_0_40px_rgba(250,204,21,0.6)] transition-all duration-300 hover:scale-105"
            >
              <Zap className="h-5 w-5 mr-2 group-hover:animate-pulse" />
              DRAFT BUDDY
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/league-buddy" className="w-full sm:w-auto group">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-green-400 text-green-400 hover:bg-green-400/20 hover:text-green-300 px-8 font-mono w-full sm:w-auto h-14 text-base backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-green-300 bg-transparent"
            >
              <Users2 className="h-5 w-5 mr-2" />
              LEAGUE BUDDY
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-12 sm:mb-16 md:mb-20 animate-on-scroll" style={{ animationDelay: '0.4s' }}>
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
  )
}
