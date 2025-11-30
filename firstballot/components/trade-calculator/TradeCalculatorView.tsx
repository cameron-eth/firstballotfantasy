'use client'

import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TradeSideInput } from './TradeSideInput'
import { TradeResultCard } from './TradeResultCard'
import { Scale, Loader2 } from 'lucide-react'
import { useTradeCalculator } from '@/hooks/use-trade-calculator'
import { TradeSummary } from './TradeSummary'
import { TradeScores } from './TradeScores'

export function TradeCalculatorView() {
  const { side1, setSide1, side2, setSide2, result, loading, error, handleEvaluate } =
    useTradeCalculator()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-yellow-400 uppercase tracking-wider mb-4 px-4 py-2 border border-yellow-400/40 rounded-full bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
              <Scale className="h-3 w-3" />
              <span>Trade Analysis</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white font-mono mb-4 flex items-center gap-3">
              <Scale className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-400" />
              TRADE CALCULATOR
            </h1>
            <p className="text-gray-300 font-mono text-lg">
              Evaluate dynasty trades using ML-weighted player valuations
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Enter player names or draft picks (format: "2025 1.05")
            </p>
          </div>

          {(side1.length > 0 || side2.length > 0) && (
            <div className="mb-6 flex justify-center">
              <Button
                onClick={handleEvaluate}
                disabled={loading}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-900 font-mono font-semibold px-8 py-6 text-base shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:shadow-[0_0_40px_rgba(250,204,21,0.6)] transition-all duration-300 hover:scale-105"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Scale className="h-5 w-5 mr-2" />
                    Evaluate Trade
                  </>
                )}
              </Button>
            </div>
          )}

          {result && <TradeScores result={result} />}

          {result && <TradeSummary result={result} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-blue-950/20 border border-blue-500/30 rounded-xl shadow-none hover:border-blue-500/50 transition-all">
              <CardContent className="p-6">
                <TradeSideInput
                  side={side1}
                  onChange={setSide1}
                  placeholder="Enter player name or draft pick (e.g., CeeDee Lamb or 2025 1.05)"
                  sideLabel="Side 1"
                />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-purple-950/20 border border-purple-500/30 rounded-xl shadow-none hover:border-purple-500/50 transition-all">
              <CardContent className="p-6">
                <TradeSideInput
                  side={side2}
                  onChange={setSide2}
                  placeholder="Enter player name or draft pick (e.g., Amon-Ra St. Brown or 2026 2.03)"
                  sideLabel="Side 2"
                />
              </CardContent>
            </Card>
          </div>

          {error && (
            <Card className="bg-red-500/20 border border-red-500/30 mb-6">
              <CardContent className="p-4">
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {result && <TradeResultCard result={result} />}

          {!result && !loading && side1.length === 0 && side2.length === 0 && (
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-none">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 mb-6">
                  <Scale className="h-8 w-8 text-yellow-400" />
                </div>
                <p className="text-gray-300 mb-2 font-mono text-lg">
                  Add players or draft picks to both sides to evaluate a trade
                </p>
                <p className="text-gray-400 text-sm font-mono">
                  Example: Side 1: "CeeDee Lamb" | Side 2: "Amon-Ra St. Brown, 2025 2.03"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
