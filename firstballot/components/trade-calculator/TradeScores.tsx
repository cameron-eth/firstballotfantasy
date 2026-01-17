'use client'

import type { TradeResult } from '@/types/trade-calculator'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TradeScoresProps {
  result: TradeResult
}

export function TradeScores({ result }: TradeScoresProps) {
  const totalValue = result.side1_total + result.side2_total
  const side1Pct = totalValue > 0 ? (result.side1_total / totalValue) * 100 : 50
  const side2Pct = totalValue > 0 ? (result.side2_total / totalValue) * 100 : 50
  const isEven = result.winner === 'EVEN'

  return (
    <div className="mb-10 relative group">
      <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Animated background glow */}
        <div 
          className="absolute inset-0 opacity-10 blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at ${side1Pct}%, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4))`
          }}
        />

        <div className="relative z-10">
          {/* Decision HUD */}
          <div className="flex flex-col items-center text-center mb-8 border-b border-white/5 pb-8">
            <span className="text-[10px] text-slate-500 font-mono font-black uppercase tracking-[0.3em] mb-3">Analysis Decision</span>
            <div className="flex items-center gap-4">
               {!isEven && result.winner === 'SIDE 1' && <TrendingUp className="h-6 w-6 text-blue-400 animate-bounce" />}
               <div className="text-4xl font-black text-white font-mono tracking-tighter uppercase">
                 Decision: <span className={isEven ? 'text-slate-500' : 'text-yellow-400'}>{result.winner}</span>
               </div>
               {!isEven && result.winner === 'SIDE 2' && <TrendingDown className="h-6 w-6 text-purple-400 animate-bounce rotate-180" />}
            </div>
            <div className="mt-4 flex items-center gap-6">
               <div className="flex flex-col items-center">
                 <span className="text-[9px] text-slate-600 font-mono uppercase">Value Delta</span>
                 <span className="text-sm font-black text-white font-mono">+{result.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
               </div>
               <div className="w-px h-6 bg-white/5" />
               <div className="flex flex-col items-center">
                 <span className="text-[9px] text-slate-600 font-mono uppercase">Index Delta</span>
                 <span className="text-sm font-black text-yellow-400 font-mono">{result.difference_pct.toFixed(1)}%</span>
               </div>
            </div>
          </div>

          <div className="flex justify-between items-end mb-6">
            {/* Side 1 Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Side 1 Assets</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-blue-500/40 font-mono text-[10px] font-bold">INDEX</span>
              </div>
              {result.side1_rank && (
                <Badge variant="outline" className="mt-2 w-fit bg-blue-500/5 text-blue-400 border-blue-500/20 font-mono text-[9px] uppercase px-2 py-0">
                  Top Rank #{result.side1_rank}
                </Badge>
              )}
            </div>

            {/* Side 2 Info */}
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Side 2 Assets</span>
                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-purple-500/40 font-mono text-[10px] font-bold">INDEX</span>
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              {result.side2_rank && (
                <Badge variant="outline" className="mt-2 w-fit bg-purple-500/5 text-purple-400 border-purple-500/20 font-mono text-[9px] uppercase px-2 py-0">
                  Top Rank #{result.side2_rank}
                </Badge>
              )}
            </div>
          </div>

          {/* Unified Value Meter */}
          <div className="relative h-4 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden shadow-inner">
            {/* Center Balance Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-20" />
            
            {/* Side 1 Bar */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              style={{ width: `${side1Pct}%` }}
            />
            
            {/* Side 2 Bar */}
            <div 
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              style={{ width: `${side2Pct}%` }}
            />

            {/* Splitter Notch */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white z-30 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              style={{ left: `${side1Pct}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Percentage Labels */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[10px] font-black font-mono text-blue-400 uppercase tracking-tighter">{side1Pct.toFixed(1)}% Weight</span>
            <span className="text-[10px] font-black font-mono text-purple-400 uppercase tracking-tighter">{side2Pct.toFixed(1)}% Weight</span>
          </div>
        </div>
      </div>
    </div>
  )
}
