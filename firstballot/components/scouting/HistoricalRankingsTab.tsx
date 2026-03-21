'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, BarChart3, Users, Calendar, Shield, Search } from 'lucide-react'
import type { Prospect } from './types'
import { ProspectCard } from './ProspectCard'
import { Input } from '@/components/ui/input'

interface HistoricalProspect extends Prospect {
  draft_year: number
}

interface HistoricalRankingsTabProps {
  currentProspects: Prospect[]
}

export function HistoricalRankingsTab({ currentProspects }: HistoricalRankingsTabProps) {
  const PAGE_SIZE = 30
  const [selectedYear, setSelectedYear] = useState<string>('2024') // Default to 2024 since 2025 is empty
  const [mounted, setMounted] = useState(false)
  const { data: historicalProspects = [], isLoading: loading } = useSWR<HistoricalProspect[]>(
    `/api/prospects?draft_year=${selectedYear}`,
    (url: string) => fetch(url).then((r) => r.json())
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'charts' | 'athletes'>('athletes')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const handleYearChange = (year: string) => {
    setVisibleCount(PAGE_SIZE)
    setSelectedYear(year)
  }

  const handleSearchChange = (term: string) => {
    setVisibleCount(PAGE_SIZE)
    setSearchTerm(term)
  }

  const handleViewModeChange = (mode: 'charts' | 'athletes') => {
    setVisibleCount(PAGE_SIZE)
    setViewMode(mode)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Compare position distribution
  const positionComparison = useMemo(() => {
    const current: Record<string, number> = {}
    const historical: Record<string, number> = {}

    currentProspects.forEach((p) => {
      current[p.position] = (current[p.position] || 0) + 1
    })

    historicalProspects.forEach((p) => {
      historical[p.position] = (historical[p.position] || 0) + 1
    })

    const positions = new Set([...Object.keys(current), ...Object.keys(historical)])

    return Array.from(positions).map((pos) => ({
      position: pos,
      current: current[pos] || 0,
      historical: historical[pos] || 0,
      change: (current[pos] || 0) - (historical[pos] || 0),
    }))
  }, [currentProspects, historicalProspects])

  // Compare tier distribution
  const tierComparison = useMemo(() => {
    const current: Record<string, number> = {}
    const historical: Record<string, number> = {}

    currentProspects.forEach((p) => {
      const tier = p.tier || 'Ungraded'
      current[tier] = (current[tier] || 0) + 1
    })

    historicalProspects.forEach((p) => {
      const tier = p.tier || 'Ungraded'
      historical[tier] = (historical[tier] || 0) + 1
    })

    const tiers = new Set([...Object.keys(current), ...Object.keys(historical)])

    return Array.from(tiers)
      .map((tier) => ({
        tier,
        current: current[tier] || 0,
        historical: historical[tier] || 0,
        change: (current[tier] || 0) - (historical[tier] || 0),
      }))
      .sort((a, b) => {
        const tierOrder = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6', 'Ungraded']
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
      })
  }, [currentProspects, historicalProspects])

  // Compare average grade (use overall_grade, fallback to valuation for legacy data)
  const valuationComparison = useMemo(() => {
    const getGrade = (p: Prospect) => p.overall_grade || p.valuation || 0

    const currentAvg =
      currentProspects.length > 0
        ? currentProspects.reduce((sum, p) => sum + getGrade(p), 0) / currentProspects.length
        : 0
    const historicalAvg =
      historicalProspects.length > 0
        ? historicalProspects.reduce((sum, p) => sum + getGrade(p), 0) / historicalProspects.length
        : 0

    return {
      current: currentAvg,
      historical: historicalAvg,
      change: currentAvg - historicalAvg,
    }
  }, [currentProspects, historicalProspects])

  const positionColors: Record<string, string> = {
    QB: 'bg-blue-400',
    RB: 'bg-green-400',
    WR: 'bg-yellow-400',
    TE: 'bg-purple-400',
  }

  const tierColors: Record<string, string> = {
    'Tier 1': 'bg-yellow-400',
    'Tier 2': 'bg-purple-400',
    'Tier 3': 'bg-blue-400',
    'Tier 4': 'bg-green-400',
    'Tier 5': 'bg-orange-400',
    'Tier 6': 'bg-red-400',
    Ungraded: 'bg-gray-400',
  }

  const maxPositionCount = Math.max(
    ...positionComparison.map((p) => Math.max(p.current, p.historical)),
    1
  )

  const maxTierCount = Math.max(...tierComparison.map((t) => Math.max(t.current, t.historical)), 1)

  const filteredHistorical = useMemo(() => {
    if (!searchTerm) return historicalProspects
    return historicalProspects.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.school.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [historicalProspects, searchTerm])
  const visibleHistorical = filteredHistorical.slice(0, visibleCount)

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading historical data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Year Selector & View Toggle */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-white font-mono text-base uppercase tracking-wider">
                  Compare to Class
                </CardTitle>
              </div>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-28 bg-slate-900 border-white/5 text-white h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white font-mono text-xs">
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="2027">2027 Class</SelectItem>
                  <SelectItem value="2026">2026 (Current)</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                  <SelectItem value="2019">2019</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => handleViewModeChange('athletes')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-widest transition-all ${
                  viewMode === 'athletes'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Athletes
              </button>
              <button
                onClick={() => handleViewModeChange('charts')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-widest transition-all ${
                  viewMode === 'charts'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'charts' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Grade Comparison */}
          <Card className="bg-slate-800/50 border border-slate-700 hover:border-yellow-400/50 transition-all md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-mono text-sm flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp className="h-4 w-4 text-yellow-400" />
                Grade Comparison Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                  <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase tracking-widest">
                    2026 Class
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tighter">
                    {valuationComparison.current.toFixed(1)}
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                  <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase tracking-widest">
                    {selectedYear === 'all' ? 'Database Avg' : `${selectedYear} Class`}
                  </div>
                  <div className="text-3xl font-black text-white font-mono tracking-tighter">
                    {valuationComparison.historical.toFixed(1)}
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                  <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase tracking-widest">
                    Grade Delta
                  </div>
                  <div
                    className={`text-3xl font-black font-mono tracking-tighter ${
                      valuationComparison.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {valuationComparison.change >= 0 ? '+' : ''}
                    {valuationComparison.change.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-6 border border-white/5">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full origin-left"
                  style={{
                    width: `${Math.min((valuationComparison.current / 100) * 100, 100)}%`,
                    animation: mounted ? 'chart-fill 1.2s ease 0.2s both' : 'none',
                    transformOrigin: 'left center',
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Position Comparison */}
          <Card className="bg-slate-800/50 border border-slate-700 hover:border-blue-400/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-mono text-sm flex items-center gap-2 uppercase tracking-widest">
                <Users className="h-4 w-4 text-blue-400" />
                Position Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {positionComparison.map((pos, i) => (
                  <div key={pos.position}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${positionColors[pos.position] || 'bg-slate-500'} text-slate-950 border-0 font-black text-[10px] px-2 py-0.5 rounded uppercase`}
                        >
                          {pos.position}
                        </Badge>
                        <span
                          className={`text-[10px] font-black font-mono ${pos.change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {pos.change >= 0 ? '+' : ''}
                          {pos.change}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono font-bold">
                        <span>2026: {pos.current}</span>
                        <span>
                          {selectedYear === 'all' ? 'Database' : selectedYear}: {pos.historical}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`absolute inset-y-0 left-0 ${positionColors[pos.position] || 'bg-slate-500'} rounded-full origin-left`}
                          style={{
                            width: `${(pos.current / maxPositionCount) * 100}%`,
                            animation: mounted ? `chart-fill 0.8s ease ${i * 0.1}s both` : 'none',
                            transformOrigin: 'left center',
                          }}
                        />
                      </div>
                      <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`absolute inset-y-0 left-0 ${positionColors[pos.position] || 'bg-slate-500'} opacity-30 rounded-full origin-left`}
                          style={{
                            width: `${(pos.historical / maxPositionCount) * 100}%`,
                            animation: mounted
                              ? `chart-fill 0.8s ease ${i * 0.1 + 0.2}s both`
                              : 'none',
                            transformOrigin: 'left center',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Comparison */}
          <Card className="bg-slate-800/50 border border-slate-700 hover:border-purple-400/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-mono text-sm flex items-center gap-2 uppercase tracking-widest">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                Tier Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {tierComparison.map((tier, i) => (
                  <div key={tier.tier}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${tierColors[tier.tier] || 'bg-gray-400'} text-slate-950 border-0 font-black text-[10px] px-2 py-0.5 rounded uppercase`}
                        >
                          {tier.tier}
                        </Badge>
                        <span
                          className={`text-[10px] font-black font-mono ${tier.change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {tier.change >= 0 ? '+' : ''}
                          {tier.change}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono font-bold">
                        <span>2026: {tier.current}</span>
                        <span>
                          {selectedYear === 'all' ? 'Database' : selectedYear}: {tier.historical}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`absolute inset-y-0 left-0 ${tierColors[tier.tier] || 'bg-gray-400'} rounded-full origin-left`}
                          style={{
                            width: `${(tier.current / maxTierCount) * 100}%`,
                            animation: mounted ? `chart-fill 0.8s ease ${i * 0.1}s both` : 'none',
                            transformOrigin: 'left center',
                          }}
                        />
                      </div>
                      <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`absolute inset-y-0 left-0 ${tierColors[tier.tier] || 'bg-gray-400'} opacity-30 rounded-full origin-left`}
                          style={{
                            width: `${(tier.historical / maxTierCount) * 100}%`,
                            animation: mounted
                              ? `chart-fill 0.8s ease ${i * 0.1 + 0.2}s both`
                              : 'none',
                            transformOrigin: 'left center',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search bar for historical class */}
          <div className="sticky top-20 z-20 -mx-2 px-4 py-3 liquid-glass rounded-xl flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder={`Search ${selectedYear} class...`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10 bg-slate-950/60 border-white/5 text-white w-full focus:border-blue-500/30 focus:ring-0 font-mono text-xs rounded-xl transition-all"
              />
            </div>
            <div className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest bg-slate-900/40 px-3 py-2 rounded-lg border border-white/5">
              Showing {visibleHistorical.length} / {filteredHistorical.length} Athletes
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
            {visibleHistorical.length > 0 ? (
              visibleHistorical.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onSelect={() => {}} // Not used in historical tab for now
                  onCompare={() => {}} // Not used in historical tab for now
                  variant="dossier"
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-slate-900/40 rounded-3xl border border-dashed border-white/10">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <Shield className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-sm font-black font-mono text-slate-500 uppercase tracking-[0.2em]">
                  No prospects found for {selectedYear}
                </p>
              </div>
            )}
          </div>
          {visibleHistorical.length < filteredHistorical.length && (
            <div className="pb-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-5 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Load 30 More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
