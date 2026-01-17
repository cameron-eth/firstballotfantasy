'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type CarouselApi, Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { BarChart3, PieChart, TrendingUp, Users } from 'lucide-react'
import type { Prospect } from './types'

interface ProspectChartsProps {
  prospects: Prospect[]
  variant?: 'carousel' | 'grid'
}

export function ProspectCharts({ prospects, variant = 'carousel' }: ProspectChartsProps) {
  const [mounted, setMounted] = useState(false)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!api) {
      return
    }

    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  // Calculate position distribution
  const positionDistribution = useMemo(() => {
    const distribution: Record<string, number> = {}
    prospects.forEach((prospect) => {
      distribution[prospect.position] = (distribution[prospect.position] || 0) + 1
    })
    return distribution
  }, [prospects])

  // Calculate tier distribution
  const tierDistribution = useMemo(() => {
    const distribution: Record<string, number> = {}
    prospects.forEach((prospect) => {
      const tier = prospect.tier || 'Ungraded'
      distribution[tier] = (distribution[tier] || 0) + 1
    })
    return distribution
  }, [prospects])

  // Calculate grade tier distribution
  const gradeTierDistribution = useMemo(() => {
    const distribution: Record<string, number> = {}
    prospects.forEach((prospect) => {
      const gradeTier = prospect.grade_tier || 'Ungraded'
      distribution[gradeTier] = (distribution[gradeTier] || 0) + 1
    })
    return distribution
  }, [prospects])

  // Calculate valuation ranges
  const valuationRanges = useMemo(() => {
    const ranges = {
      '80+': 0,
      '60-79': 0,
      '40-59': 0,
      '20-39': 0,
      '<20': 0,
    }
    prospects.forEach((prospect) => {
      const val = prospect.valuation || 0
      if (val >= 80) ranges['80+']++
      else if (val >= 60) ranges['60-79']++
      else if (val >= 40) ranges['40-59']++
      else if (val >= 20) ranges['20-39']++
      else ranges['<20']++
    })
    return ranges
  }, [prospects])

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
    Ungraded: 'bg-gray-400',
  }

  const maxPositionCount = Math.max(...Object.values(positionDistribution), 1)
  const maxTierCount = Math.max(...Object.values(tierDistribution), 1)
  const maxValuationCount = Math.max(...Object.values(valuationRanges), 1)

  // Calculate positional scarcity (Elite players left at each position)
  const positionalScarcity = useMemo(() => {
    const topTiers = ['Tier 1', 'Tier 2']
    const scarcity: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }
    prospects.forEach((prospect) => {
      if (topTiers.includes(prospect.tier || '') || (prospect.overall_grade || 0) >= 85) {
        scarcity[prospect.position] = (scarcity[prospect.position] || 0) + 1
      }
    })
    return scarcity
  }, [prospects])

  const chartCount = 5

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Position Distribution */}
        <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-blue-500/20 transition-colors">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Users className="h-2.5 w-2.5" />
                Positioning
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="space-y-1.5">
              {Object.entries(positionDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([position, count]) => (
                  <div key={position} className="group/item">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-blue-300 transition-colors">
                        {position}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{count as number}</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${positionColors[position] || 'bg-slate-500'} opacity-40 group-hover/item:opacity-100 transition-opacity`}
                        style={{ width: `${((count as number) / maxPositionCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-purple-500/20 transition-colors">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <BarChart3 className="h-2.5 w-2.5" />
                Tier_Map
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="space-y-1.5">
              {Object.entries(tierDistribution)
                .sort(([a], [b]) => {
                  const tierOrder = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Ungraded']
                  return tierOrder.indexOf(a) - tierOrder.indexOf(b)
                })
                .map(([tier, count]) => (
                  <div key={tier} className="group/item">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-purple-300 transition-colors">
                        {tier.replace('Tier ', 'T')}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{count as number}</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${tierColors[tier] || 'bg-gray-400'} opacity-40 group-hover/item:opacity-100 transition-opacity`}
                        style={{ width: `${((count as number) / maxTierCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Grade Tier Distribution */}
        <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-green-500/20 transition-colors">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <TrendingUp className="h-2.5 w-2.5" />
                Scout_Intel
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="space-y-1.5">
              {Object.entries(gradeTierDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([gradeTier, count]) => (
                  <div key={gradeTier} className="group/item">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-green-300 transition-colors truncate max-w-[80px]">
                        {gradeTier}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{count as number}</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 opacity-40 group-hover/item:opacity-100 transition-opacity"
                        style={{
                          width: `${((count as number) / Math.max(...(Object.values(gradeTierDistribution) as number[]), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Positional Scarcity Analysis */}
        <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-orange-500/20 transition-colors">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <TrendingUp className="h-2.5 w-2.5" />
                Elite_Scarcity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="space-y-1.5">
              {Object.entries(positionalScarcity)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([pos, count]) => (
                  <div key={pos} className="group/item">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-orange-300 transition-colors">
                        {pos}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{count as number}</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 opacity-40 group-hover/item:opacity-100 transition-opacity"
                        style={{
                          width: `${((count as number) / Math.max(...(Object.values(positionalScarcity) as number[]), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Valuation Ranges */}
        <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-blue-500/20 transition-colors">
          <CardHeader className="pb-1.5 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <PieChart className="h-2.5 w-2.5" />
                Value_Dist
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="space-y-1">
              {Object.entries(valuationRanges)
                .reverse()
                .map(([range, count], i) => (
                  <div key={range} className="group/item">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-blue-300 transition-colors">
                        {range}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">{count as number}</span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 opacity-40 group-hover/item:opacity-100 transition-opacity"
                        style={{ width: `${((count as number) / maxValuationCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Desktop: Grid layout with navigation */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => api?.scrollPrev()}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 hover:border-yellow-400/50 text-slate-400 hover:text-yellow-400 flex items-center justify-center transition-all"
          >
            ←
          </button>
          <div className="flex-1 overflow-hidden">
            <Carousel
              setApi={setApi}
              opts={{
                align: 'start',
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3">
                {/* Position Distribution */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/4 xl:basis-1/5">
                  <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-blue-500/20 transition-colors">
                    <CardHeader className="pb-1.5 pt-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-blue-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <Users className="h-2.5 w-2.5" />
                          Positioning
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2 px-3">
                      <div className="space-y-1.5">
                        {Object.entries(positionDistribution)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([position, count]) => (
                            <div key={position} className="group/item">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-blue-300 transition-colors">
                                  {position}
                                </span>
                                <span className="text-[9px] font-mono text-slate-600">
                                  {count as number}
                                </span>
                              </div>
                              <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${positionColors[position] || 'bg-slate-500'} opacity-40 group-hover/item:opacity-100 transition-opacity`}
                                  style={{
                                    width: `${((count as number) / maxPositionCount) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Tier Distribution */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/4 xl:basis-1/5">
                  <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-purple-500/20 transition-colors">
                    <CardHeader className="pb-1.5 pt-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-purple-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <BarChart3 className="h-2.5 w-2.5" />
                          Tier_Map
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2 px-3">
                      <div className="space-y-1.5">
                        {Object.entries(tierDistribution)
                          .sort(([a], [b]) => {
                            const tierOrder = [
                              'Tier 1',
                              'Tier 2',
                              'Tier 3',
                              'Tier 4',
                              'Tier 5',
                              'Ungraded',
                            ]
                            return tierOrder.indexOf(a) - tierOrder.indexOf(b)
                          })
                          .map(([tier, count]) => (
                            <div key={tier} className="group/item">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-purple-300 transition-colors">
                                  {tier.replace('Tier ', 'T')}
                                </span>
                                <span className="text-[9px] font-mono text-slate-600">
                                  {count as number}
                                </span>
                              </div>
                              <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${tierColors[tier] || 'bg-gray-400'} opacity-40 group-hover/item:opacity-100 transition-opacity`}
                                  style={{
                                    width: `${((count as number) / maxTierCount) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Grade Tier Distribution */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/4 xl:basis-1/5">
                  <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-green-500/20 transition-colors">
                    <CardHeader className="pb-1.5 pt-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-green-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Scout_Intel
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2 px-3">
                      <div className="space-y-1.5">
                        {Object.entries(gradeTierDistribution)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([gradeTier, count]) => (
                            <div key={gradeTier} className="group/item">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-green-300 transition-colors truncate max-w-[80px]">
                                  {gradeTier}
                                </span>
                                <span className="text-[9px] font-mono text-slate-600">
                                  {count as number}
                                </span>
                              </div>
                              <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-400 opacity-40 group-hover/item:opacity-100 transition-opacity"
                                  style={{
                                    width: `${((count as number) / Math.max(...(Object.values(gradeTierDistribution) as number[]), 1)) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Positional Scarcity Analysis */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/4 xl:basis-1/5">
                  <Card className="bg-slate-950/20 border-white/5 h-full backdrop-blur-sm group hover:border-orange-500/20 transition-colors">
                    <CardHeader className="pb-1.5 pt-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-orange-400/60 font-mono text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Elite_Scarcity
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2 px-3">
                      <div className="space-y-1.5">
                        {Object.entries(positionalScarcity)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([pos, count]) => (
                            <div key={pos} className="group/item">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] text-slate-500 font-mono font-bold group-hover/item:text-orange-300 transition-colors">
                                  {pos}
                                </span>
                                <span className="text-[9px] font-mono text-slate-600">
                                  {count as number}
                                </span>
                              </div>
                              <div className="h-0.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 opacity-40 group-hover/item:opacity-100 transition-opacity"
                                  style={{
                                    width: `${((count as number) / Math.max(...(Object.values(positionalScarcity) as number[]), 1)) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Valuation Ranges */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/3">
                  <Card className="bg-slate-800 border border-slate-700 h-full">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-blue-400 font-mono text-xs flex items-center gap-1.5">
                          <PieChart className="h-3 w-3" />
                          Value
                        </CardTitle>
                        <span className="text-lg font-bold text-white font-mono">
                          {prospects.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="space-y-1">
                        {Object.entries(valuationRanges)
                          .reverse()
                          .map(([range, count], i) => (
                            <div key={range} className="flex items-center gap-2">
                              <div className="text-[10px] text-slate-400 font-mono w-8">
                                {range}
                              </div>
                              <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded"
                                  style={{
                                    width: `${((count as number) / maxValuationCount) * 100}%`,
                                    animation: mounted
                                      ? `chart-fill 0.5s ease ${i * 0.05}s both`
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                                {count as number}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </div>
          <button
            onClick={() => api?.scrollNext()}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 hover:border-yellow-400/50 text-slate-400 hover:text-yellow-400 flex items-center justify-center transition-all"
          >
            →
          </button>
        </div>
      </div>

      {/* Mobile: Swipeable carousel */}
      <div className="md:hidden">
        <Carousel setApi={setApi} opts={{ align: 'start', loop: false }} className="w-full">
          <CarouselContent className="-ml-2">
            {/* Position Distribution */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-950/40 border border-white/5 h-full backdrop-blur-sm group hover:border-blue-500/30 transition-colors">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                      <Users className="h-3 w-3" />
                      Position
                    </CardTitle>
                    <span className="text-xl font-black text-white font-mono leading-none">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="space-y-2">
                    {Object.entries(positionDistribution)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([position, count]) => (
                        <div key={position} className="group/item">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {position}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {count as number}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${positionColors[position] || 'bg-slate-500'} rounded-full`}
                              style={{ width: `${((count as number) / maxPositionCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Tier */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-950/40 border border-white/5 h-full backdrop-blur-sm group hover:border-purple-500/30 transition-colors">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-purple-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                      <BarChart3 className="h-3 w-3" />
                      Tiering
                    </CardTitle>
                    <span className="text-xl font-black text-white font-mono leading-none">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="space-y-2">
                    {Object.entries(tierDistribution)
                      .sort(([a], [b]) => {
                        const tierOrder = [
                          'Tier 1',
                          'Tier 2',
                          'Tier 3',
                          'Tier 4',
                          'Tier 5',
                          'Ungraded',
                        ]
                        return tierOrder.indexOf(a) - tierOrder.indexOf(b)
                      })
                      .map(([tier, count]) => (
                        <div key={tier} className="group/item">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {tier.replace('Tier ', 'T')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {count as number}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${tierColors[tier] || 'bg-gray-400'} rounded-full`}
                              style={{ width: `${((count as number) / maxTierCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Grade */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-950/40 border border-white/5 h-full backdrop-blur-sm group hover:border-green-500/30 transition-colors">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                      <TrendingUp className="h-3 w-3" />
                      Scouting
                    </CardTitle>
                    <span className="text-xl font-black text-white font-mono leading-none">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="space-y-2">
                    {Object.entries(gradeTierDistribution)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([gradeTier, count]) => (
                        <div key={gradeTier} className="group/item">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold truncate max-w-[80px]">
                              {gradeTier}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {count as number}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full"
                              style={{
                                width: `${((count as number) / Math.max(...(Object.values(gradeTierDistribution) as number[]), 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Scarcity */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-950/40 border border-white/5 h-full backdrop-blur-sm group hover:border-orange-500/30 transition-colors">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-orange-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                      <TrendingUp className="h-3 w-3" />
                      Scarcity
                    </CardTitle>
                    <span className="text-xl font-black text-white font-mono leading-none">
                      {Object.values(positionalScarcity).reduce(
                        (a, b) => (a as number) + (b as number),
                        0
                      )}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="space-y-2">
                    {Object.entries(positionalScarcity)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([pos, count]) => (
                        <div key={pos} className="group/item">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {pos}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {count as number} Left
                            </span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{
                                width: `${((count as number) / Math.max(...(Object.values(positionalScarcity) as number[]), 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Value */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-800 border border-slate-700">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-400 font-mono text-xs flex items-center gap-1.5">
                      <PieChart className="h-3 w-3" />
                      Value
                    </CardTitle>
                    <span className="text-lg font-bold text-white font-mono">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  <div className="space-y-1">
                    {Object.entries(valuationRanges)
                      .reverse()
                      .map(([range, count]) => (
                        <div key={range} className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 font-mono w-8">{range}</div>
                          <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded"
                              style={{ width: `${((count as number) / maxValuationCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                            {count as number}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {/* Mobile Navigation Dots */}
        <div className="flex justify-center gap-2 mt-3">
          {Array.from({ length: chartCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                current === index ? 'w-6 bg-yellow-400' : 'w-1.5 bg-slate-600'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
