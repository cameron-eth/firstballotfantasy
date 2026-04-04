'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TradeSideInput } from './TradeSideInput'
import { TradeResultCard } from './TradeResultCard'
import { Scale, Loader2, X, BarChart3, List } from 'lucide-react'
import { useTradeCalculator } from '@/hooks/use-trade-calculator'
import { TradeScores } from './TradeScores'

export function TradeCalculatorView() {
  const { side1, setSide1, side2, setSide2, result, loading, error, handleEvaluate } =
    useTradeCalculator()

  // Mobile result view: 'overview' = graph, 'breakdown' = dossier
  const [mobileResultTab, setMobileResultTab] = useState<'overview' | 'breakdown'>('overview')

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-3 py-4 md:px-4 md:py-8 max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-7xl mx-auto">

          {/* ── Desktop: show both inline ── */}
          {result && (
            <div className="hidden md:block">
              <TradeScores result={result} />
            </div>
          )}

          {/* ── Mobile: flat input layout (no card nesting) ── */}
          <div className="md:hidden space-y-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] font-black font-mono text-blue-400 uppercase tracking-widest">Side 1</span>
              </div>
              <TradeSideInput
                side={side1}
                onChange={setSide1}
                placeholder="Search player or pick..."
                sideLabel="Give"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-[9px] font-black font-mono text-purple-400 uppercase tracking-widest">Side 2</span>
              </div>
              <TradeSideInput
                side={side2}
                onChange={setSide2}
                placeholder="Search player or pick..."
                sideLabel="Get"
              />
            </div>
            {(side1.length > 0 || side2.length > 0) && (
              <Button
                onClick={handleEvaluate}
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black font-mono h-11 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Scale className="h-4 w-4 mr-2" />
                )}
                Evaluate
              </Button>
            )}
          </div>

          {/* ── Mobile: results after inputs (natural scroll: build trade first) ── */}
          {result && (
            <div className="md:hidden mt-2 mb-4">
              <div className="flex gap-1 mb-3 bg-slate-950/60 rounded-lg p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setMobileResultTab('overview')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                    mobileResultTab === 'overview'
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <BarChart3 className="h-3 w-3" />
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setMobileResultTab('breakdown')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                    mobileResultTab === 'breakdown'
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <List className="h-3 w-3" />
                  Breakdown
                </button>
              </div>
              {mobileResultTab === 'overview' && <TradeScores result={result} />}
              {mobileResultTab === 'breakdown' && <TradeResultCard result={result} />}
            </div>
          )}

          {/* ── Desktop: card layout with centered evaluate button ── */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 relative">
            {/* Centered Evaluate Button for Desktop */}
            {(side1.length > 0 || side2.length > 0) && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden lg:block">
                <Button
                  onClick={handleEvaluate}
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black font-mono w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.3)] hover:shadow-[0_0_50px_rgba(250,204,21,0.5)] transition-all duration-500 group border-4 border-slate-900"
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Scale className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                      <span className="text-[8px] mt-1 uppercase font-black">Calc</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Side 1 Input */}
            <div className="relative group">
              <div className="absolute -top-2.5 left-6 px-3 py-1 bg-slate-900 border border-white/5 rounded text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest z-10 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                Side 1
              </div>
              <Card className="bg-slate-950/40 backdrop-blur-sm border border-white/5 rounded-2xl shadow-none hover:border-blue-500/20 transition-all overflow-hidden">
                <CardContent className="p-8">
                  <TradeSideInput
                    side={side1}
                    onChange={setSide1}
                    placeholder="Search player or pick..."
                    sideLabel="Give"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Side 2 Input */}
            <div className="relative group">
              <div className="absolute -top-2.5 left-6 px-3 py-1 bg-slate-900 border border-white/5 rounded text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest z-10 group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors">
                Side 2
              </div>
              <Card className="bg-slate-950/40 backdrop-blur-sm border border-white/5 rounded-2xl shadow-none hover:border-purple-500/20 transition-all overflow-hidden">
                <CardContent className="p-8">
                  <TradeSideInput
                    side={side2}
                    onChange={setSide2}
                    placeholder="Search player or pick..."
                    sideLabel="Get"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 md:p-4 mb-4 md:mb-8 flex items-center gap-3">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <X className="h-3 w-3 md:h-4 md:w-4 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 font-black font-mono text-[10px] uppercase tracking-widest">
                  Analysis Failure
                </p>
                <p className="text-red-300/70 text-xs font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Desktop: dossier always visible */}
          {result && (
            <div className="hidden md:block mt-10">
              <TradeResultCard result={result} />
            </div>
          )}

          {!result && !loading && side1.length === 0 && side2.length === 0 && (
            <Card className="bg-slate-950/40 border border-white/5 rounded-2xl shadow-none mt-6 md:mt-10">
              <CardContent className="p-10 md:p-20 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/10 mb-4 md:mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <Scale className="h-7 w-7 md:h-10 md:w-10 text-slate-600" />
                </div>
                <h3 className="text-white font-black font-mono text-base md:text-lg uppercase tracking-tight mb-2">
                  Initialize Trade Matrix
                </h3>
                <p className="text-slate-500 font-mono text-[10px] md:text-xs uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  Add assets to both sides to activate the ML valuation engine.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
