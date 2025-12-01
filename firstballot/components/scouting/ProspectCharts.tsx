'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { BarChart3, PieChart, TrendingUp, Users } from 'lucide-react'
import type { Prospect } from './types'

interface ProspectChartsProps {
  prospects: Prospect[]
}

export function ProspectCharts({ prospects }: ProspectChartsProps) {
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

  const chartCount = 4 // Position, Tier, Grade Tier, Valuation

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
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/3">
                  <Card className="bg-slate-800 border border-slate-700 h-full">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-yellow-400 font-mono text-xs flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          Position
                        </CardTitle>
                        <span className="text-lg font-bold text-white font-mono">
                          {prospects.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="space-y-1">
                        {Object.entries(positionDistribution)
                          .sort(([, a], [, b]) => b - a)
                          .map(([position, count], i) => (
                            <div key={position} className="flex items-center gap-2">
                              <div className="text-[10px] text-slate-400 font-mono w-6">
                                {position}
                              </div>
                              <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                                <div
                                  className={`h-full ${positionColors[position] || 'bg-slate-500'} rounded`}
                                  style={{
                                    width: `${(count / maxPositionCount) * 100}%`,
                                    animation: mounted
                                      ? `chart-fill 0.5s ease ${i * 0.05}s both`
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Tier Distribution */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/3">
                  <Card className="bg-slate-800 border border-slate-700 h-full">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-purple-400 font-mono text-xs flex items-center gap-1.5">
                          <BarChart3 className="h-3 w-3" />
                          Tier
                        </CardTitle>
                        <span className="text-lg font-bold text-white font-mono">
                          {prospects.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="space-y-1">
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
                          .map(([tier, count], i) => (
                            <div key={tier} className="flex items-center gap-2">
                              <div className="text-[10px] text-slate-400 font-mono w-10 truncate">
                                {tier.replace('Tier ', 'T')}
                              </div>
                              <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                                <div
                                  className={`h-full ${tierColors[tier] || 'bg-gray-400'} rounded`}
                                  style={{
                                    width: `${(count / maxTierCount) * 100}%`,
                                    animation: mounted
                                      ? `chart-fill 0.5s ease ${i * 0.05}s both`
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Grade Tier Distribution */}
                <CarouselItem className="pl-3 basis-1/2 lg:basis-1/3">
                  <Card className="bg-slate-800 border border-slate-700 h-full">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-green-400 font-mono text-xs flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3" />
                          Grade
                        </CardTitle>
                        <span className="text-lg font-bold text-white font-mono">
                          {prospects.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="space-y-1">
                        {Object.entries(gradeTierDistribution)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([gradeTier, count], i) => (
                            <div key={gradeTier} className="flex items-center gap-2">
                              <div className="text-[10px] text-slate-400 font-mono w-12 truncate">
                                {gradeTier}
                              </div>
                              <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                                <div
                                  className="h-full bg-green-400 rounded"
                                  style={{
                                    width: `${(count / Math.max(...Object.values(gradeTierDistribution), 1)) * 100}%`,
                                    animation: mounted
                                      ? `chart-fill 0.5s ease ${i * 0.05}s both`
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                                {count}
                              </span>
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
                                    width: `${(count / maxValuationCount) * 100}%`,
                                    animation: mounted
                                      ? `chart-fill 0.5s ease ${i * 0.05}s both`
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                                {count}
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
              <Card className="bg-slate-800 border border-slate-700">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-yellow-400 font-mono text-xs flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Position
                    </CardTitle>
                    <span className="text-lg font-bold text-white font-mono">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  <div className="space-y-1">
                    {Object.entries(positionDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([position, count]) => (
                        <div key={position} className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 font-mono w-6">{position}</div>
                          <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className={`h-full ${positionColors[position] || 'bg-slate-500'} rounded`}
                              style={{ width: `${(count / maxPositionCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Tier */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-800 border border-slate-700">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-purple-400 font-mono text-xs flex items-center gap-1.5">
                      <BarChart3 className="h-3 w-3" />
                      Tier
                    </CardTitle>
                    <span className="text-lg font-bold text-white font-mono">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  <div className="space-y-1">
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
                        <div key={tier} className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 font-mono w-10 truncate">
                            {tier.replace('Tier ', 'T')}
                          </div>
                          <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className={`h-full ${tierColors[tier] || 'bg-gray-400'} rounded`}
                              style={{ width: `${(count / maxTierCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Grade */}
            <CarouselItem className="pl-2 basis-[85%]">
              <Card className="bg-slate-800 border border-slate-700">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 font-mono text-xs flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" />
                      Grade
                    </CardTitle>
                    <span className="text-lg font-bold text-white font-mono">
                      {prospects.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  <div className="space-y-1">
                    {Object.entries(gradeTierDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([gradeTier, count]) => (
                        <div key={gradeTier} className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 font-mono w-12 truncate">
                            {gradeTier}
                          </div>
                          <div className="flex-1 h-3 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded"
                              style={{
                                width: `${(count / Math.max(...Object.values(gradeTierDistribution), 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                            {count}
                          </span>
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
                              style={{ width: `${(count / maxValuationCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                            {count}
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
