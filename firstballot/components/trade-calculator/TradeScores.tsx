'use client'

import type { TradeResult } from '@/types/trade-calculator'

interface TradeScoresProps {
  result: TradeResult
}

export function TradeScores({ result }: TradeScoresProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-blue-950/30 border border-blue-500/40 rounded-xl p-6 transition-all">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-semibold font-mono">Side 1 Total</h4>
          {result.side1_rank && (
            <span className="text-blue-400 text-sm font-mono bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30">
              Rank #{result.side1_rank}
            </span>
          )}
        </div>
        <div className="text-5xl font-bold text-white font-mono bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-purple-950/30 border border-purple-500/40 rounded-xl p-6 transition-all">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-semibold font-mono">Side 2 Total</h4>
          {result.side2_rank && (
            <span className="text-purple-400 text-sm font-mono bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">
              Rank #{result.side2_rank}
            </span>
          )}
        </div>
        <div className="text-5xl font-bold text-white font-mono bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  )
}
