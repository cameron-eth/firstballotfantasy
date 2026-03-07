'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProspectComparison } from '@/components/scouting/ProspectComparison'
import type { Prospect } from '@/components/scouting/types'
import { TrendingUp, TrendingDown, BarChart3, ChevronUp, ChevronDown } from 'lucide-react'

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Area,
  AreaChart,
} from 'recharts'

interface ModelPerformance {
  model: string
  r2: number
  rmse: number
  cv_r2_mean: number
  cv_rmse_mean: number
  feature_count: number
  total_players: number
  avg_actual_ppg: number
  avg_predicted_ppg: number
  top_features: string
}

interface BreakoutBust {
  player_name: string
  position: string
  season: number
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  analysis_type: string
  surprise_factor: number
  performance_ratio: number
  tier_upgrade: boolean
  tier_downgrade: boolean
  player_id?: string
  recent_team?: string
}

export default function AnalysisPage() {
  const [comparedProspects, setComparedProspects] = useState<Prospect[]>([])

  const { data: analysisResult, isLoading: analysisLoading, error: analysisError } = useSWR(
    '/api/analysis?type=all',
    (url: string) => fetch(url).then((r) => r.json())
  )
  const { data: prospectsResult, isLoading: prospectsLoading } = useSWR<Prospect[]>(
    '/api/prospects?draft_year=all',
    (url: string) => fetch(url).then((r) => r.json())
  )

  const loading = analysisLoading || prospectsLoading
  const error: string | null = analysisError ? 'Failed to load analytics data' : null
  const modelPerformance: ModelPerformance[] = analysisResult?.modelPerformance || []
  const breakoutBust: BreakoutBust[] = analysisResult?.breakoutBust || []
  const allProspects: Prospect[] = prospectsResult || []
  const availableYears: number[] = useMemo(() => {
    const years = [...new Set(allProspects.map((p) => p.draft_year).filter(Boolean))] as number[]
    years.sort((a, b) => b - a)
    return years
  }, [allProspects])

  // Calculate Overachievers and Underachievers based on NFL performance vs Prediction
  const achievementData = useMemo(() => {
    if (breakoutBust.length === 0) return { overachievers: [], underachievers: [] }

    // Overachievers are 'breakout' players with positive surprise factors
    const over = breakoutBust
      .filter((p) => p.analysis_type === 'breakout' || p.surprise_factor > 0)
      .sort((a, b) => b.surprise_factor - a.surprise_factor)
      .slice(0, 10)

    // Underachievers are 'bust' players with negative surprise factors
    const under = breakoutBust
      .filter((p) => p.analysis_type === 'bust' || p.surprise_factor < 0)
      .sort((a, b) => a.surprise_factor - b.surprise_factor) // Most negative first
      .slice(0, 10)

    return {
      overachievers: over,
      underachievers: under,
    }
  }, [breakoutBust])

  const comparisonBenchmarks = useMemo(() => {
    const comparedIds = new Set(comparedProspects.map((p) => p.id))
    const comparedPositions = Array.from(new Set(comparedProspects.map((p) => p.position)))
    const comparedYears = Array.from(
      new Set(comparedProspects.map((p) => p.draft_year).filter((y): y is number => !!y))
    )

    const peerPool = allProspects.filter((p) => {
      const samePosition = comparedPositions.length ? comparedPositions.includes(p.position) : true
      const sameYear = comparedYears.length ? comparedYears.includes(p.draft_year || 0) : true
      return samePosition && sameYear
    })

    const valueBuckets = [
      { name: '80+', min: 80, max: 1000 },
      { name: '60-79', min: 60, max: 79.999 },
      { name: '40-59', min: 40, max: 59.999 },
      { name: '20-39', min: 20, max: 39.999 },
      { name: '<20', min: -1000, max: 19.999 },
    ]

    const valueDensity = valueBuckets.map((bucket) => ({
      range: bucket.name,
      peers: peerPool.filter((p) => {
        const v = p.valuation || 0
        return v >= bucket.min && v <= bucket.max
      }).length,
      compared: comparedProspects.filter((p) => {
        const v = p.valuation || 0
        return v >= bucket.min && v <= bucket.max
      }).length,
    }))

    const peerScatter = peerPool
      .filter((p) => p.height && p.weight && p.valuation)
      .map((p) => ({
        weight: p.weight as number,
        valuation: p.valuation as number,
        name: p.name,
        position: p.position,
        draftYear: p.draft_year,
        isCompared: comparedIds.has(p.id),
      }))

    const comparedSummary = {
      count: comparedProspects.length,
      avgGrade:
        comparedProspects.length > 0
          ? comparedProspects.reduce((sum, p) => sum + (p.overall_grade || 0), 0) /
            comparedProspects.length
          : 0,
      avgVal:
        comparedProspects.length > 0
          ? comparedProspects.reduce((sum, p) => sum + (p.valuation || 0), 0) /
            comparedProspects.length
          : 0,
    }

    const peerSummary = {
      count: peerPool.length,
      avgGrade:
        peerPool.length > 0
          ? peerPool.reduce((sum, p) => sum + (p.overall_grade || 0), 0) / peerPool.length
          : 0,
      avgVal:
        peerPool.length > 0
          ? peerPool.reduce((sum, p) => sum + (p.valuation || 0), 0) / peerPool.length
          : 0,
    }

    return {
      hasSelection: comparedProspects.length > 0,
      peerPool,
      valueDensity,
      peerScatter,
      comparedSummary,
      peerSummary,
      labels: {
        compared: 'Compared Players',
        peers: 'Peer Cohort',
      },
    }
  }, [allProspects, comparedProspects])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING COMPREHENSIVE ANALYTICS...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
              >
                RETRY
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-200">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-16 relative">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-5xl font-black font-mono text-white mb-4 tracking-tighter">
              ANALYTICS<span className="text-blue-500">_</span>HUB
            </h1>
            <div className="flex items-center gap-4 text-slate-400">
              <div className="flex items-center gap-2 bg-slate-900/50 border border-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">
                  Live Pipeline Active
                </span>
              </div>
              <p className="text-sm font-medium border-l border-white/10 pl-4">
                Processing {allProspects.length} assets across {availableYears.length} draft classes
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: ADVANCED COMPARISON TOOL */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
              Head-to-Head Labs
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          <ProspectComparison prospects={allProspects} onSelectionChange={setComparedProspects} />
        </div>

        {/* SECTION 2: PERFORMANCE LEADERS */}
        {breakoutBust.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
                Performance Leaders
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top 10 Overachievers */}
              <Card className="bg-slate-900/40 border-white/5 backdrop-blur-xl">
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Top 10 Overachievers
                    </CardTitle>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">
                      Actual vs ML Prediction
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    {achievementData.overachievers.map((p, idx) => (
                      <div
                        key={`${p.player_name}-${p.season}`}
                        className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-slate-600 w-4">{idx + 1}</span>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">
                              {p.player_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">
                              {p.position} • {p.season} Season • {p.fantasy_ppg.toFixed(1)} Actual
                              PPG
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-black font-mono text-sm">
                            +{p.surprise_factor.toFixed(1)}
                          </div>
                          <p className="text-[10px] text-slate-600 font-mono uppercase">
                            Surprise Factor
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top 10 Underachievers */}
              <Card className="bg-slate-900/40 border-white/5 backdrop-blur-xl">
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-red-400 font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Top 10 Underachievers
                    </CardTitle>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">
                      Actual vs ML Prediction
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-1">
                    {achievementData.underachievers.map((p, idx) => (
                      <div
                        key={`${p.player_name}-${p.season}`}
                        className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-slate-600 w-4">{idx + 1}</span>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                              {p.player_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">
                              {p.position} • {p.season} Season • {p.fantasy_ppg.toFixed(1)} Actual
                              PPG
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 font-black font-mono text-sm">
                            {p.surprise_factor.toFixed(1)}
                          </div>
                          <p className="text-[10px] text-slate-600 font-mono uppercase">
                            Surprise Factor
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* SECTION 3: PEER BENCHMARKS */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
              System Benchmarks
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          {!comparisonBenchmarks.hasSelection ? (
            <Card className="bg-slate-900/40 border-white/5">
              <CardContent className="py-14 text-center text-slate-500 font-mono text-sm">
                Select players in Head-to-Head Labs to power benchmark charts.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Compared Avg Grade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black font-mono text-white">
                      {comparisonBenchmarks.comparedSummary.avgGrade.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      vs peers {comparisonBenchmarks.peerSummary.avgGrade.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Compared Avg Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black font-mono text-blue-400">
                      {comparisonBenchmarks.comparedSummary.avgVal.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      vs peers {comparisonBenchmarks.peerSummary.avgVal.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Peer Cohort Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black font-mono text-white">
                      {comparisonBenchmarks.peerSummary.count}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      based on selected players&apos; positions and draft years
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="bg-slate-900/40 border-white/5 lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <div>
                      <CardTitle className="text-white font-mono text-sm uppercase tracking-widest">
                        Trait Correlation Matrix
                      </CardTitle>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                        Selected players highlighted against their peer cohort
                      </p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                          <XAxis
                            type="number"
                            dataKey="weight"
                            name="Weight"
                            unit="lbs"
                            stroke="#475569"
                            fontSize={10}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="number"
                            dataKey="valuation"
                            name="Value"
                            stroke="#475569"
                            fontSize={10}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                            }}
                          />
                          <Scatter
                            name={comparisonBenchmarks.labels.peers}
                            data={comparisonBenchmarks.peerScatter.filter((d) => !d.isCompared)}
                            fill="#334155"
                            stroke="rgba(255,255,255,0.08)"
                            shape="circle"
                          />
                          <Scatter
                            name={comparisonBenchmarks.labels.compared}
                            data={comparisonBenchmarks.peerScatter.filter((d) => d.isCompared)}
                            fill="#3b82f6"
                            shape="circle"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white font-mono text-sm uppercase tracking-widest">
                      Value Density
                    </CardTitle>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                      Compared players vs peer cohort
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={comparisonBenchmarks.valueDensity}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff05"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="range"
                            stroke="#475569"
                            fontSize={10}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="peers"
                            stroke="#334155"
                            strokeWidth={2}
                            fill="rgba(51,65,85,0.25)"
                            fillOpacity={1}
                          />
                          <Area
                            type="monotone"
                            dataKey="compared"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="rgba(59,130,246,0.25)"
                            fillOpacity={1}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Master Data Pipeline Insights (Optional Section) */}
        {modelPerformance.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
                Machine Learning Stats
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <Card className="bg-slate-900/40 border-white/5">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono uppercase tracking-[0.2em]">
                  Master Model Performance
                </CardTitle>
                <p className="text-green-400 text-xs font-mono">
                  {modelPerformance[0].model} • {modelPerformance[0].feature_count} features •
                  Cross-validated
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-black text-green-400 mb-1 leading-none">
                      {(modelPerformance[0].r2 * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      R² Score
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-yellow-400 mb-1 leading-none">
                      {modelPerformance[0].rmse.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      RMSE
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-purple-400 mb-1 leading-none">
                      {modelPerformance[0].feature_count}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      Features
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-blue-400 mb-1 leading-none">
                      {modelPerformance[0].total_players?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      Population
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-green-400 mb-1 leading-none">
                      {modelPerformance[0].avg_actual_ppg?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      Avg PPG
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-black">
              FB
            </div>
            <div>
              <p className="text-xs font-black font-mono text-white uppercase tracking-widest">
                First Ballot Fantasy
              </p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                Advanced Analytics Pipeline v4.2.0
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
              Data Refreshed Hourly • © 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
