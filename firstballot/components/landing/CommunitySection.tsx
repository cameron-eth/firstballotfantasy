'use client'

import { Music, Play, ArrowRight } from 'lucide-react'

export function CommunitySection() {
  return (
    <section className="max-w-7xl mx-auto py-12 sm:py-16 md:py-20 border-t border-slate-800">
      <div className="text-center mb-12 animate-on-scroll">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-mono mb-4">
          JOIN THE <span className="text-green-400">COMMUNITY</span>
        </h2>
        <p className="text-gray-400 text-lg">Daily dynasty content and degenerate takes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <a
          href="https://www.tiktok.com/@firstballotfb"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 hover:border-yellow-400/60 transition-all duration-300 backdrop-blur-sm overflow-hidden animate-on-scroll slide-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/10 group-hover:to-transparent transition-all duration-300" />
          <div className="relative flex items-center space-x-4">
            <div className="p-4 bg-yellow-400/20 rounded-xl border border-yellow-400/30 group-hover:scale-110 group-hover:bg-yellow-400/30 transition-all duration-300 flex-shrink-0">
              <Music className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-white mb-1 font-mono group-hover:text-yellow-400 transition-colors">
                TikTok
              </h3>
              <p className="text-gray-400 font-mono">@firstballotfb</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-500 group-hover:text-yellow-400 group-hover:translate-x-2 transition-all flex-shrink-0" />
          </div>
        </a>

        <a
          href="https://www.youtube.com/@FirstBallotPod"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 hover:border-green-400/60 transition-all duration-300 backdrop-blur-sm overflow-hidden animate-on-scroll slide-right"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-green-400/0 group-hover:from-green-400/10 group-hover:to-transparent transition-all duration-300" />
          <div className="relative flex items-center space-x-4">
            <div className="p-4 bg-green-400/20 rounded-xl border border-green-400/30 group-hover:scale-110 group-hover:bg-green-400/30 transition-all duration-300 flex-shrink-0">
              <Play className="h-8 w-8 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-white mb-1 font-mono group-hover:text-green-400 transition-colors">
                YouTube
              </h3>
              <p className="text-gray-400 font-mono">@FirstBallotPod</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-500 group-hover:text-green-400 group-hover:translate-x-2 transition-all flex-shrink-0" />
          </div>
        </a>
      </div>
    </section>
  )
}

