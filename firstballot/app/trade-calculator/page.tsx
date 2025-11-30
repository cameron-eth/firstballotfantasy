'use client'

import { useState, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TradeSideInput } from '@/components/trade-calculator/TradeSideInput'
import { TradeResultCard } from '@/components/trade-calculator/TradeResultCard'
import { Scale, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

export default function TradeCalculatorPage() {
  const [side1, setSide1] = useState<string[]>([])
  const [side2, setSide2] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the trade evaluation to avoid too many API calls
  const debouncedSide1 = useDebounce(side1, 500)
  const debouncedSide2 = useDebounce(side2, 500)

  const evaluateTrade = useCallback(async (s1: string[], s2: string[]) => {
    if (s1.length === 0 && s2.length === 0) {
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/trade-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          side1: s1,
          side2: s2,
          season: 2025,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to evaluate trade')
      }

      const tradeResult = await response.json()
      setResult(tradeResult)
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate trade')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-evaluate when sides change (debounced)
  useMemo(() => {
    if (debouncedSide1.length > 0 || debouncedSide2.length > 0) {
      evaluateTrade(debouncedSide1, debouncedSide2)
    } else {
      setResult(null)
    }
  }, [debouncedSide1, debouncedSide2, evaluateTrade])

  const handleEvaluate = () => {
    evaluateTrade(side1, side2)
  }

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

          {/* Manual Evaluate Button */}
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

          {/* Trade Scores - Outside Card */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Side 1 Score */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-blue-950/30 border border-blue-500/40 rounded-xl p-6 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all">
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

              {/* Side 2 Score */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-purple-950/30 border border-purple-500/40 rounded-xl p-6 ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all">
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
          )}

          {/* Trade Summary - Above Inputs */}
          {result && (
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-yellow-950/30 border border-yellow-500/40 rounded-xl mb-6 ring-1 ring-yellow-500/20 shadow-lg shadow-yellow-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wider">Difference</span>
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
                      {result.winner === 'EVEN' && (
                        <Minus className="h-6 w-6 text-gray-400" />
                      )}
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
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Side 1 Input */}
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-blue-950/20 border border-blue-500/30 rounded-xl ring-1 ring-blue-500/10 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/50 transition-all">
              <CardContent className="p-6">
                <TradeSideInput
                  side={side1}
                  onChange={setSide1}
                  placeholder="Enter player name or draft pick (e.g., CeeDee Lamb or 2025 1.05)"
                  sideLabel="Side 1"
                />
              </CardContent>
            </Card>

            {/* Side 2 Input */}
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-purple-950/20 border border-purple-500/30 rounded-xl ring-1 ring-purple-500/10 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/50 transition-all">
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

          {/* Error Display */}
          {error && (
            <Card className="bg-red-500/20 border border-red-500/30 mb-6">
              <CardContent className="p-4">
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && <TradeResultCard result={result} />}

          {/* Empty State */}
          {!result && !loading && side1.length === 0 && side2.length === 0 && (
            <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl ring-1 ring-slate-600/50 shadow-lg">
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
