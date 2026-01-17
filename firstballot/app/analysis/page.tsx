'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamLogo } from '@/components/team-logo'
import { ProspectCharts } from '@/components/scouting/ProspectCharts'
import { ProspectComparison } from '@/components/scouting/ProspectComparison'
import type { Prospect } from '@/components/scouting/types'
import { TrendingUp, TrendingDown, BarChart3, Users, ChevronUp, ChevronDown } from 'lucide-react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
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

interface AggregatedStats {
  position: string
  season: number
  tier: string
  avg_fantasy_ppg: number
  player_count: number
  avg_age: number
  avg_games_played: number
  std_fantasy_ppg: number
  avg_prediction_error: number
}

interface DraftSuccessRates {
  draft_round: string
  total_players: number
  elite_hit_rate: number
  tier1_hit_rate: number
  tier1_plus_hit_rate: number
  analysis: string
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

interface ProspectAnalysis {
  prospect_tier: string
  analysis_type: string
  elite_count: number
  total_count: number
  hit_rate: number
  success_rate: number
}

export default function AnalysisPage() {
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([])
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats[]>([])
  const [draftSuccess, setDraftSuccess] = useState<DraftSuccessRates[]>([])
  const [breakoutBust, setBreakoutBust] = useState<BreakoutBust[]>([])
  const [prospectAnalysis, setProspectAnalysis] = useState<ProspectAnalysis[]>([])
  const [allProspects, setAllProspects] = useState<Prospect[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear1, setSelectedYear1] = useState<number | null>(null)
  const [selectedYear2, setSelectedYear2] = useState<number | null>(null)
  const [selectedDeepDiveYear, setSelectedDeepDiveYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sort state for each chart
  const [positionSort, setPositionSort] = useState<'avgPPG' | 'totalPlayers' | 'avgError'>('avgPPG')
  const [tierSort, setTierSort] = useState<'value' | 'avgPPG'>('value')
  const [draftSort, setDraftSort] = useState<'eliteRate' | 'tier1PlusRate' | 'totalPlayers'>(
    'eliteRate'
  )
  const [prospectSort, setProspectSort] = useState<'hitRate' | 'successRate' | 'totalCount'>(
    'hitRate'
  )
  const [breakoutSort, setBreakoutSort] = useState<
    'surprise_factor' | 'fantasy_ppg' | 'performance_ratio'
  >('surprise_factor')
  const [bustSort, setBustSort] = useState<'surprise_factor' | 'fantasy_ppg' | 'performance_ratio'>(
    'surprise_factor'
  )

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch all analysis data and ALL prospects in parallel
        const [analysisRes, prospectsRes] = await Promise.all([
          fetch('/api/analysis?type=all'),
          fetch('/api/prospects?draft_year=all'),
        ])

        const [analysisResult, prospectsResult] = await Promise.all([
          analysisRes.json(),
          prospectsRes.json(),
        ])

        setModelPerformance(analysisResult.modelPerformance || [])
        setAggregatedStats(analysisResult.aggregatedStats || [])
        setDraftSuccess(analysisResult.draftSuccess || [])
        setBreakoutBust(analysisResult.breakoutBust || [])
        setProspectAnalysis(analysisResult.prospectAnalysis || [])

        // Set all prospects
        const prospects = prospectsResult || []
        setAllProspects(prospects)

        // Extract available years and sort descending (newest first)
        const years = [
          ...new Set(prospects.map((p: Prospect) => p.draft_year).filter(Boolean)),
        ] as number[]
        years.sort((a, b) => b - a)
        setAvailableYears(years)

        // Set default selections - top 2 most recent years
        if (years.length >= 2) {
          setSelectedYear1(years[0])
          setSelectedYear2(years[1])
          setSelectedDeepDiveYear(years[0])
        } else if (years.length === 1) {
          setSelectedYear1(years[0])
          setSelectedYear2(years[0])
          setSelectedDeepDiveYear(years[0])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter prospects by selected years
  const prospectsYear1 = useMemo(
    () => allProspects.filter((p) => p.draft_year === selectedYear1),
    [allProspects, selectedYear1]
  )
  const prospectsYear2 = useMemo(
    () => allProspects.filter((p) => p.draft_year === selectedYear2),
    [allProspects, selectedYear2]
  )
  const prospectsDeepDive = useMemo(
    () => allProspects.filter((p) => p.draft_year === selectedDeepDiveYear),
    [allProspects, selectedDeepDiveYear]
  )

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

  // Class Comparison Memoized Calculations
  const classComparison = useMemo(() => {
    const positions = ['QB', 'RB', 'WR', 'TE']
    const year1Label = selectedYear1?.toString() || 'Year 1'
    const year2Label = selectedYear2?.toString() || 'Year 2'

    // Positional Strength Comparison
    const positionalStrength = positions.map((pos) => {
      const countYear1 = prospectsYear1.filter((p) => p.position === pos).length
      const countYear2 = prospectsYear2.filter((p) => p.position === pos).length

      // Elite Count (Grade >= 85)
      const eliteYear1 = prospectsYear1.filter(
        (p) => p.position === pos && (p.overall_grade || 0) >= 85
      ).length
      const eliteYear2 = prospectsYear2.filter(
        (p) => p.position === pos && (p.overall_grade || 0) >= 85
      ).length

      return {
        position: pos,
        [`${year1Label} Count`]: countYear1,
        [`${year2Label} Count`]: countYear2,
        [`${year1Label} Elite`]: eliteYear1,
        [`${year2Label} Elite`]: eliteYear2,
      }
    })

    // Draft Capital Projection (Top 100)
    const draftCapital = [
      {
        round: '1st Round',
        [year1Label]: prospectsYear1.filter((p) => p.rank <= 32).length,
        [year2Label]: prospectsYear2.filter((p) => p.rank <= 32).length,
      },
      {
        round: '2nd Round',
        [year1Label]: prospectsYear1.filter((p) => p.rank > 32 && p.rank <= 64).length,
        [year2Label]: prospectsYear2.filter((p) => p.rank > 32 && p.rank <= 64).length,
      },
      {
        round: '3rd Round',
        [year1Label]: prospectsYear1.filter((p) => p.rank > 64 && p.rank <= 100).length,
        [year2Label]: prospectsYear2.filter((p) => p.rank > 64 && p.rank <= 100).length,
      },
    ]

    // Metric Correlation (Height/Weight vs Valuation)
    const correlationData = [...prospectsYear1, ...prospectsYear2]
      .filter((p) => p.height && p.weight && p.valuation)
      .map((p) => ({
        height: p.height,
        weight: p.weight,
        valuation: p.valuation,
        name: p.name,
        year: p.draft_year,
        position: p.position,
      }))

    // Value Distribution Comparison
    const valueRanges = [
      { name: '80+', min: 80, max: 100 },
      { name: '60-79', min: 60, max: 79 },
      { name: '40-59', min: 40, max: 59 },
      { name: '20-39', min: 20, max: 39 },
      { name: '<20', min: 0, max: 19 },
    ]

    const valueDistribution = valueRanges.map((range) => {
      const countYear1 = prospectsYear1.filter(
        (p) => (p.valuation || 0) >= range.min && (p.valuation || 0) <= range.max
      ).length
      const countYear2 = prospectsYear2.filter(
        (p) => (p.valuation || 0) >= range.min && (p.valuation || 0) <= range.max
      ).length

      return {
        range: range.name,
        [year1Label]: countYear1,
        [year2Label]: countYear2,
      }
    })

    // Summary Metrics
    const avgValYear1 =
      prospectsYear1.length > 0
        ? prospectsYear1.reduce((sum, p) => sum + (p.valuation || 0), 0) / prospectsYear1.length
        : 0
    const avgValYear2 =
      prospectsYear2.length > 0
        ? prospectsYear2.reduce((sum, p) => sum + (p.valuation || 0), 0) / prospectsYear2.length
        : 0

    return {
      positionalStrength,
      draftCapital,
      correlationData,
      valueDistribution,
      year1Label,
      year2Label,
      summary: {
        avgValYear1: avgValYear1.toFixed(1),
        avgValYear2: avgValYear2.toFixed(1),
        eliteCountYear1: prospectsYear1.filter((p) => (p.overall_grade || 0) >= 85).length,
        eliteCountYear2: prospectsYear2.filter((p) => (p.overall_grade || 0) >= 85).length,
        totalYear1: prospectsYear1.length,
        totalYear2: prospectsYear2.length,
      },
    }
  }, [prospectsYear1, prospectsYear2, selectedYear1, selectedYear2])

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

  // Process data for enhanced visualizations
  const positionPerformance = aggregatedStats
    .filter((stat) => stat.season === 2024)
    .reduce(
      (acc, stat) => {
        const existing = acc.find((p) => p.position === stat.position)
        if (existing) {
          existing.avgPPG = Math.max(existing.avgPPG, stat.avg_fantasy_ppg)
          existing.totalPlayers += stat.player_count
          existing.avgError = (existing.avgError + stat.avg_prediction_error) / 2
        } else {
          acc.push({
            position: stat.position,
            avgPPG: stat.avg_fantasy_ppg,
            totalPlayers: stat.player_count,
            avgError: stat.avg_prediction_error,
          })
        }
        return acc
      },
      [] as { position: string; avgPPG: number; totalPlayers: number; avgError: number }[]
    )
    .sort((a, b) => {
      if (positionSort === 'avgPPG') return b.avgPPG - a.avgPPG
      if (positionSort === 'totalPlayers') return b.totalPlayers - a.totalPlayers
      return a.avgError - b.avgError // Lower error is better
    })

  const tierDistribution = aggregatedStats
    .filter((stat) => stat.season === 2024)
    .reduce(
      (acc, stat) => {
        const existing = acc.find((t) => t.name === stat.tier)
        if (existing) {
          existing.value += stat.player_count
          existing.avgPPG = (existing.avgPPG + stat.avg_fantasy_ppg) / 2
        } else {
          acc.push({
            name: stat.tier,
            value: stat.player_count,
            avgPPG: stat.avg_fantasy_ppg,
            color: getTierColor(stat.tier),
          })
        }
        return acc
      },
      [] as { name: string; value: number; avgPPG: number; color: string }[]
    )
    .sort((a, b) => {
      if (tierSort === 'value') return b.value - a.value
      return b.avgPPG - a.avgPPG
    })

  const seasonalTrends = aggregatedStats
    .filter((stat) => ['Elite', 'WR1/RB1', 'Tier1'].includes(stat.tier))
    .reduce(
      (acc, stat) => {
        const existing = acc.find((s) => s.season === stat.season)
        if (existing) {
          existing.avgPPG = (existing.avgPPG + stat.avg_fantasy_ppg) / 2
          existing.playerCount += stat.player_count
        } else {
          acc.push({
            season: stat.season,
            avgPPG: stat.avg_fantasy_ppg,
            playerCount: stat.player_count,
          })
        }
        return acc
      },
      [] as { season: number; avgPPG: number; playerCount: number }[]
    )
    .sort((a, b) => a.season - b.season) // Keep chronological order for trends

  const draftRoundSuccess = draftSuccess
    .map((draft) => ({
      round: draft.draft_round.replace('Round ', 'R'),
      eliteRate: Number((draft.elite_hit_rate * 100).toFixed(1)),
      tier1Rate: Number((draft.tier1_hit_rate * 100).toFixed(1)),
      tier1PlusRate: Number((draft.tier1_plus_hit_rate * 100).toFixed(1)),
      totalPlayers: draft.total_players,
      analysis: draft.analysis,
    }))
    .sort((a, b) => {
      if (draftSort === 'eliteRate') return b.eliteRate - a.eliteRate
      if (draftSort === 'tier1PlusRate') return b.tier1PlusRate - a.tier1PlusRate
      return b.totalPlayers - a.totalPlayers
    })

  const prospectTierData = prospectAnalysis
    .map((prospect) => ({
      tier: prospect.prospect_tier,
      hitRate: Number((prospect.hit_rate * 100).toFixed(1)),
      successRate: Number((prospect.success_rate * 100).toFixed(1)),
      eliteCount: prospect.elite_count,
      totalCount: prospect.total_count,
    }))
    .sort((a, b) => {
      if (prospectSort === 'hitRate') return b.hitRate - a.hitRate
      if (prospectSort === 'successRate') return b.successRate - a.successRate
      return b.totalCount - a.totalCount
    })

  const topBreakouts = breakoutBust
    .filter((player) => player.analysis_type === 'breakout')
    .sort((a, b) => {
      if (breakoutSort === 'surprise_factor') return b.surprise_factor - a.surprise_factor
      if (breakoutSort === 'fantasy_ppg') return b.fantasy_ppg - a.fantasy_ppg
      return (b.performance_ratio || 0) - (a.performance_ratio || 0)
    })
    .slice(0, 12)

  const topBusts = breakoutBust
    .filter((player) => player.analysis_type === 'bust')
    .sort((a, b) => {
      if (bustSort === 'surprise_factor') return a.surprise_factor - b.surprise_factor // Most negative first
      if (bustSort === 'fantasy_ppg') return a.fantasy_ppg - b.fantasy_ppg
      return (a.performance_ratio || 0) - (b.performance_ratio || 0)
    })
    .slice(0, 12)

  const predictionAccuracy = breakoutBust
    .filter((player) => player.predicted_fantasy_ppg > 0 && player.fantasy_ppg >= 0)
    .slice(0, 200)
    .map((player) => ({
      predicted: Number(player.predicted_fantasy_ppg.toFixed(2)),
      actual: Number(player.fantasy_ppg.toFixed(2)),
      error: Math.abs(player.prediction_error),
      position: player.position,
    }))

  function getTierColor(tier: string): string {
    const colors: { [key: string]: string } = {
      Elite: '#8B5CF6',
      'WR1/RB1': '#10B981',
      Tier1: '#10B981',
      QB1: '#10B981',
      RB1: '#10B981',
      TE1: '#10B981',
      'WR2/RB2': '#F59E0B',
      Tier2: '#F59E0B',
      QB2: '#F59E0B',
      RB2: '#F59E0B',
      TE2: '#F59E0B',
      Startable: '#F97316',
      'Flex/Streamer': '#6B7280',
      Streamer: '#6B7280',
      Flex: '#6B7280',
    }
    return colors[tier] || '#6B7280'
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
          <ProspectComparison prospects={allProspects} />
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

        {/* SECTION 3: CLASS INTELLIGENCE */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
              Market Intelligence
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          {/* Class Comparison Hub */}
          <div className="mb-12">
            <div className="flex items-center justify-between gap-4 mb-6 bg-slate-900/50 border border-white/5 p-4 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider">
                    Class Comparison
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    Compare macro data between years
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedYear1 || ''}
                  onChange={(e) => setSelectedYear1(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono font-bold text-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none appearance-none cursor-pointer hover:border-white/20 transition-all"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <div className="w-8 h-px bg-white/10" />
                <select
                  value={selectedYear2 || ''}
                  onChange={(e) => setSelectedYear2(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono font-bold text-slate-400 focus:ring-2 focus:ring-white/20 focus:outline-none appearance-none cursor-pointer hover:border-white/20 transition-all"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Summary Delta Card */}
              <Card className="bg-slate-900/40 border-white/5">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                    Comparative Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">
                          Avg Valuation
                        </p>
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl font-black text-white leading-none">
                            {classComparison.summary.avgValYear1}
                          </span>
                          <span className="text-xs text-blue-400 font-mono font-bold">
                            vs {classComparison.summary.avgValYear2}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black font-mono uppercase tracking-tighter ${
                          parseFloat(classComparison.summary.avgValYear1) >
                          parseFloat(classComparison.summary.avgValYear2)
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                        }`}
                      >
                        {parseFloat(classComparison.summary.avgValYear1) >
                        parseFloat(classComparison.summary.avgValYear2)
                          ? '↗ Winner'
                          : '↘ Second'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">
                          Elite (85+)
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-amber-400 leading-none">
                            {classComparison.summary.eliteCountYear1}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            / {classComparison.summary.totalYear1}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">
                          Total Assets
                        </p>
                        <span className="text-lg font-black text-white leading-none">
                          {classComparison.summary.totalYear1}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Positional Strength Comparison */}
              <Card className="bg-slate-900/40 border-white/5 lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                    Positional Strength ({classComparison.year1Label} vs{' '}
                    {classComparison.year2Label})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classComparison.positionalStrength}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis
                          dataKey="position"
                          stroke="#475569"
                          fontSize={10}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                          }}
                          itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Bar
                          dataKey={`${classComparison.year1Label} Count`}
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        />
                        <Bar
                          dataKey={`${classComparison.year2Label} Count`}
                          fill="#1e293b"
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Deep Dive Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider">
                    Class Deep Dive
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    Internal distribution metrics
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-900/50 border border-white/5 rounded-2xl p-1.5 backdrop-blur-sm">
                {availableYears.slice(0, 5).map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedDeepDiveYear(year)}
                    className={`px-5 py-2 rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedDeepDiveYear === year
                        ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            <ProspectCharts prospects={prospectsDeepDive} variant="grid" />
          </div>
        </div>

        {/* SECTION 4: SYSTEM BENCHMARKS */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl font-black font-mono text-white uppercase tracking-widest">
              System Benchmarks
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Metric Correlation Section */}
            <Card className="bg-slate-900/40 border-white/5 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div>
                  <CardTitle className="text-white font-mono text-sm uppercase tracking-widest">
                    Trait Correlation Matrix
                  </CardTitle>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                    Weight vs Value Correlation • Colored by Draft Class
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
                        domain={['dataMin - 10', 'dataMax + 10']}
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
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-[#0f172a] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                <p className="text-white font-black font-mono text-xs uppercase mb-1">
                                  {data.name}
                                </p>
                                <p className="text-[10px] text-blue-400 font-mono mb-3">
                                  {data.year} {data.position}
                                </p>
                                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                                  <div>
                                    <p className="text-[8px] text-slate-500 uppercase font-black">
                                      Weight
                                    </p>
                                    <p className="text-xs font-bold text-white">
                                      {data.weight} lbs
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-500 uppercase font-black">
                                      Value
                                    </p>
                                    <p className="text-xs font-bold text-blue-400">
                                      {data.valuation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Scatter
                        name={`${classComparison.year1Label} Class`}
                        data={classComparison.correlationData.filter(
                          (d) => d.year === selectedYear1
                        )}
                        fill="#3b82f6"
                        shape="circle"
                      />
                      <Scatter
                        name={`${classComparison.year2Label} Class`}
                        data={classComparison.correlationData.filter(
                          (d) => d.year === selectedYear2
                        )}
                        fill="#1e293b"
                        stroke="rgba(255,255,255,0.1)"
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Value Distribution Comparison */}
            <Card className="bg-slate-900/40 border-white/5">
              <CardHeader>
                <CardTitle className="text-white font-mono text-sm uppercase tracking-widest">
                  Value Density
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                  Cross-class distribution
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={classComparison.valueDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
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
                        dataKey={classComparison.year1Label}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorBlue)"
                        fillOpacity={1}
                      />
                      <Area
                        type="monotone"
                        dataKey={classComparison.year2Label}
                        stroke="#1e293b"
                        strokeWidth={2}
                        fill="rgba(30, 41, 59, 0.3)"
                        fillOpacity={1}
                      />
                      <defs>
                        <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
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
