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
            <h1 className="text-3xl font-bold text-white font-mono mb-2 flex items-center gap-2">
              <Scale className="h-8 w-8" />
              TRADE CALCULATOR
            </h1>
            <p className="text-gray-400 font-mono">
              Evaluate dynasty trades using ML-weighted player valuations
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Enter player names or draft picks (format: "2025 1.05")
            </p>
          </div>

          {/* Manual Evaluate Button */}
          {(side1.length > 0 || side2.length > 0) && (
            <div className="mb-6 flex justify-center">
              <Button
                onClick={handleEvaluate}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4 mr-2" />
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
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold">Side 1 Total</h4>
                  {result.side1_rank && (
                    <span className="text-blue-400 text-sm">Rank #{result.side1_rank}</span>
                  )}
                </div>
                <div className="text-4xl font-bold text-white">
                  {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Side 2 Score */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold">Side 2 Total</h4>
                  {result.side2_rank && (
                    <span className="text-blue-400 text-sm">Rank #{result.side2_rank}</span>
                  )}
                </div>
                <div className="text-4xl font-bold text-white">
                  {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          )}

          {/* Trade Summary - Above Inputs */}
          {result && (
            <Card className="bg-slate-800 border border-slate-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 text-sm">Difference</span>
                    <div className="mt-1">
                      <span className="text-white font-semibold">Winner: {result.winner}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {result.winner === 'SIDE 1' && (
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      )}
                      {result.winner === 'SIDE 2' && (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                      {result.winner === 'EVEN' && <Minus className="h-5 w-5 text-gray-400" />}
                      <div>
                        <div className="text-white font-bold text-xl">
                          {result.difference.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-gray-400 text-sm">
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
            <Card className="bg-slate-800 border border-slate-700">
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
            <Card className="bg-slate-800 border border-slate-700">
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
            <Card className="bg-slate-800 border border-slate-700">
              <CardContent className="p-12 text-center">
                <Scale className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">
                  Add players or draft picks to both sides to evaluate a trade
                </p>
                <p className="text-gray-500 text-sm">
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
