'use client'

import { memo } from 'react'
import Image from 'next/image'
import { TrendingUp, ArrowUp } from 'lucide-react'

interface PlayerCardHeroProps {
  playerName: string
  position: string
  team: string
  college: string
  rank: number
  projection: string
  imageUrl: string
}

export const PlayerCardHero = memo(function PlayerCardHero({
  playerName,
  position,
  team,
  college,
  rank,
  projection,
  imageUrl
}: PlayerCardHeroProps) {
  return (
    <div className="relative group w-full max-w-3xl mx-auto">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-green-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
      
      {/* Card Container - Glassmorphism */}
      <div className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-lg overflow-hidden transition-all duration-300 hover:border-yellow-400/50 shadow-2xl">
        <div className="flex flex-col md:grid md:grid-cols-5 gap-0">
          {/* Image Section */}
          <div className="md:col-span-2 relative h-48 sm:h-56 md:h-auto overflow-hidden">
            <Image
              src={imageUrl}
              alt={playerName}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-110"
              priority
              loading="eager"
            />
            {/* Glass overlay on image */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
            
            {/* Rank Badge - Glassmorphism */}
            <div className="absolute top-4 left-4 bg-yellow-400/90 backdrop-blur-sm text-slate-900 px-3 py-1.5 rounded-md shadow-lg">
              <span className="text-sm font-mono font-bold">#{rank} {position}</span>
            </div>
          </div>

          {/* Info Section - Glass Panel */}
          <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm">
            {/* Player Name */}
            <div className="mb-4">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight font-mono">
                {playerName}
              </h3>
              <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300">
                <span className="font-mono text-xs sm:text-sm font-semibold text-yellow-400">{team}</span>
                <span className="text-xs">•</span>
                <span className="text-xs sm:text-sm">{college}</span>
              </div>
            </div>

            {/* Stats Grid - Glass Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="space-y-1 p-2 sm:p-3 bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-md">
                <div className="text-xs font-mono text-yellow-400 uppercase tracking-wider">Position</div>
                <div className="text-base sm:text-lg font-bold text-white">{position}</div>
              </div>
              <div className="space-y-1 p-2 sm:p-3 bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-md">
                <div className="text-xs font-mono text-yellow-400 uppercase tracking-wider">Dynasty Rank</div>
                <div className="text-base sm:text-lg font-bold text-white">#{rank}</div>
              </div>
            </div>

            {/* Projection - Glass Panel */}
            <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 p-3 sm:p-4 bg-slate-700/40 backdrop-blur-md border border-yellow-400/30 rounded-md shadow-lg">
              <div className="p-1.5 sm:p-2 bg-yellow-400/20 backdrop-blur-sm rounded-md flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-green-400 uppercase tracking-wider mb-1 font-semibold">
                  2026 Projection
                </div>
                <div className="text-xs sm:text-sm text-white font-medium leading-relaxed">{projection}</div>
              </div>
              <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

