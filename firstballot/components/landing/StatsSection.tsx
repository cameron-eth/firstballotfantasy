'use client'

import { Activity, TrendingUp, BarChart3, LineChart } from 'lucide-react'
import { useEffect, useState } from 'react'

export function StatsSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="max-w-7xl mx-auto py-12 sm:py-16 md:py-20 border-t border-slate-800">
      <div className="text-center mb-12 animate-on-scroll">
        <div className="inline-flex items-center space-x-2 text-xs font-mono text-green-400 uppercase tracking-wider mb-4 px-3 py-1.5 border border-green-400/30 rounded-full bg-green-400/5">
          <Activity className="h-3 w-3" />
          <span>Live Platform Stats</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-mono mb-4">THE NUMBERS</h2>
        <p className="text-gray-400 text-lg">Real-time data driving dynasty decisions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Stat 1 - Animated bar chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-yellow-400/50 transition-all animate-on-scroll slide-left group">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-6 w-6 text-yellow-400" />
            <span className="text-xs font-mono text-gray-500 uppercase">Active Users</span>
          </div>
          <div className="text-4xl font-bold text-white font-mono mb-2">12.5K</div>
          <div className="flex items-end space-x-1 h-16 mt-4">
            {[40, 65, 45, 80, 70, 85, 95, 100].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t origin-bottom opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  height: `${height}%`,
                  animation: mounted ? `chart-fill 0.8s ease ${i * 0.1}s both` : 'none',
                }}
              />
            ))}
          </div>
          <div className="text-sm text-green-400 font-mono mt-2">↑ 23% this month</div>
        </div>

        {/* Stat 2 - Circular progress */}
        <div
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-green-400/50 transition-all animate-on-scroll group"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-6 w-6 text-green-400" />
            <span className="text-xs font-mono text-gray-500 uppercase">Accuracy Rate</span>
          </div>
          <div className="text-4xl font-bold text-white font-mono mb-2">94.2%</div>
          <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-4">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-300 rounded-full origin-left group-hover:from-green-300 group-hover:to-green-200 transition-colors"
              style={{
                width: '94.2%',
                animation: mounted ? 'chart-fill 1.2s ease 0.2s both' : 'none',
                transformOrigin: 'left center',
              }}
            />
          </div>
          <div className="text-sm text-green-400 font-mono mt-2">Top-tier projections</div>
        </div>

        {/* Stat 3 - Stacked visualization */}
        <div
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-yellow-400/50 transition-all animate-on-scroll slide-right group"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <LineChart className="h-6 w-6 text-yellow-400" />
            <span className="text-xs font-mono text-gray-500 uppercase">Players Tracked</span>
          </div>
          <div className="text-4xl font-bold text-white font-mono mb-2">847</div>
          <div className="space-y-2 mt-4">
            {[
              { label: 'QBs', value: 85, color: 'bg-yellow-400' },
              { label: 'RBs', value: 70, color: 'bg-green-400' },
              { label: 'WRs', value: 100, color: 'bg-yellow-400' },
              { label: 'TEs', value: 45, color: 'bg-green-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-xs text-gray-400 font-mono w-8">{item.label}</div>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full origin-left`}
                    style={{
                      width: `${item.value}%`,
                      animation: mounted ? `chart-fill 0.8s ease ${0.3 + i * 0.1}s both` : 'none',
                      transformOrigin: 'left center',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

