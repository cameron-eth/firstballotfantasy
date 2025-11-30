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
    <div className="mb-8">
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop: false,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {/* Position Distribution */}
          <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-1/2">
            <Card className="bg-slate-800/50 border border-slate-700 hover:border-yellow-400/50 transition-all h-full shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-mono text-sm flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-yellow-400" />
              By Position
            </CardTitle>
            <span className="text-[10px] font-mono text-gray-500 uppercase">Distribution</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="text-xl font-bold text-white font-mono mb-2">{prospects.length}</div>
          <div className="space-y-1.5">
            {Object.entries(positionDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([position, count], i) => (
                <div key={position} className="flex items-center gap-2">
                  <div className="text-xs text-gray-400 font-mono w-8">{position}</div>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${positionColors[position] || 'bg-slate-500'} rounded-full origin-left flex items-center justify-end pr-1`}
                      style={{
                        width: `${(count / maxPositionCount) * 100}%`,
                        animation: mounted
                          ? `chart-fill 0.8s ease ${i * 0.1}s both`
                          : 'none',
                        transformOrigin: 'left center',
                      }}
                    >
                      <span className="text-[9px] font-bold text-slate-900 font-mono">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
            </CardContent>
          </Card>
          </CarouselItem>

          {/* Tier Distribution */}
          <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-1/2">
            <Card className="bg-slate-800/50 border border-slate-700 hover:border-purple-400/50 transition-all h-full shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-mono text-sm flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
              By Tier
            </CardTitle>
            <span className="text-[10px] font-mono text-gray-500 uppercase">Tier Breakdown</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="text-xl font-bold text-white font-mono mb-2">{prospects.length}</div>
          <div className="space-y-1.5">
            {Object.entries(tierDistribution)
              .sort(([a], [b]) => {
                const tierOrder = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Ungraded']
                return tierOrder.indexOf(a) - tierOrder.indexOf(b)
              })
              .map(([tier, count], i) => (
                <div key={tier} className="flex items-center gap-2">
                  <div className="text-xs text-gray-400 font-mono w-14 truncate">{tier}</div>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${tierColors[tier] || 'bg-gray-400'} rounded-full origin-left flex items-center justify-end pr-1`}
                      style={{
                        width: `${(count / maxTierCount) * 100}%`,
                        animation: mounted
                          ? `chart-fill 0.8s ease ${i * 0.1}s both`
                          : 'none',
                        transformOrigin: 'left center',
                      }}
                    >
                      <span className="text-[9px] font-bold text-slate-900 font-mono">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
            </CardContent>
          </Card>
          </CarouselItem>

          {/* Grade Tier Distribution */}
          <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-1/2">
            <Card className="bg-slate-800/50 border border-slate-700 hover:border-green-400/50 transition-all h-full shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              By Grade Tier
            </CardTitle>
            <span className="text-xs font-mono text-gray-500 uppercase">Grade Breakdown</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white font-mono mb-4">{prospects.length}</div>
          <div className="space-y-3">
            {Object.entries(gradeTierDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([gradeTier, count], i) => (
                <div key={gradeTier} className="flex items-center gap-3">
                  <div className="text-sm text-gray-400 font-mono w-24 truncate">{gradeTier}</div>
                  <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full origin-left flex items-center justify-end pr-2"
                      style={{
                        width: `${(count / Math.max(...Object.values(gradeTierDistribution), 1)) * 100}%`,
                        animation: mounted
                          ? `chart-fill 0.8s ease ${i * 0.1}s both`
                          : 'none',
                        transformOrigin: 'left center',
                      }}
                    >
                      <span className="text-xs font-bold text-slate-900 font-mono">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
            </CardContent>
          </Card>
          </CarouselItem>

          {/* Valuation Ranges */}
          <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-1/2">
            <Card className="bg-slate-800/50 border border-slate-700 hover:border-blue-400/50 transition-all h-full shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-400" />
              Valuation Ranges
            </CardTitle>
            <span className="text-xs font-mono text-gray-500 uppercase">Value Distribution</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white font-mono mb-4">{prospects.length}</div>
          <div className="space-y-3">
            {Object.entries(valuationRanges)
              .reverse()
              .map(([range, count], i) => (
                <div key={range} className="flex items-center gap-3">
                  <div className="text-sm text-gray-400 font-mono w-16">{range}</div>
                  <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-300 rounded-full origin-left flex items-center justify-end pr-2"
                      style={{
                        width: `${(count / maxValuationCount) * 100}%`,
                        animation: mounted
                          ? `chart-fill 0.8s ease ${i * 0.1}s both`
                          : 'none',
                        transformOrigin: 'left center',
                      }}
                    >
                      <span className="text-xs font-bold text-slate-900 font-mono">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
            </CardContent>
          </Card>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious className="-left-4 md:-left-12 bg-slate-700/90 border-slate-600 hover:bg-slate-600 hover:border-yellow-400/50 text-white shadow-lg z-10" />
        <CarouselNext className="-right-4 md:-right-12 bg-slate-700/90 border-slate-600 hover:bg-slate-600 hover:border-yellow-400/50 text-white shadow-lg z-10" />
      </Carousel>
      
      {/* Mobile Navigation Dots */}
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {Array.from({ length: chartCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              current === index
                ? 'w-8 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                : 'w-2 bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

