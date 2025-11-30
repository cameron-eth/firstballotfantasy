'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { TradeResult } from '@/types/trade-calculator'

interface TradeSummaryProps {
  result: TradeResult
}

export function TradeSummary({ result }: TradeSummaryProps) {
  return (
    <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-yellow-950/30 border border-yellow-500/40 rounded-xl mb-6 shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm font-mono uppercase tracking-wider">
              Difference
            </span>
            <div className="mt-2">
              <span className="text-white font-semibold font-mono text-lg">
                Winner: <span className="text-yellow-400">{result.winner}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3">
              {result.winner === 'SIDE 1' && (
                <TrendingUp className="h-6 w-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              )}
              {result.winner === 'SIDE 2' && (
                <TrendingDown className="h-6 w-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
              )}
              {result.winner === 'EVEN' && <Minus className="h-6 w-6 text-gray-400" />}
              <div>
                <div className="text-white font-bold text-2xl font-mono bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                  {result.difference.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="text-gray-400 text-sm font-mono">
                  ({result.difference_pct.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
