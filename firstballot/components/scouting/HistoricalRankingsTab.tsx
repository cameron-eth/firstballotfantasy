'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, BarChart3, Users, Calendar } from 'lucide-react'
import type { Prospect } from './types'

interface HistoricalProspect extends Prospect {
  draft_year: number
}

interface HistoricalRankingsTabProps {
  currentProspects: Prospect[]
}

export function HistoricalRankingsTab({ currentProspects }: HistoricalRankingsTabProps) {
  const [historicalProspects, setHistoricalProspects] = useState<HistoricalProspect[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchHistorical = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/prospects?draft_year=${selectedYear}`)
        if (response.ok) {
          const data = await response.json()
          setHistoricalProspects(data)
        }
      } catch (error) {
        console.error('Error fetching historical prospects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistorical()
  }, [selectedYear])

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
        const tierOrder = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Ungraded']
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
      })
  }, [currentProspects, historicalProspects])

  // Compare average valuation
  const valuationComparison = useMemo(() => {
    const currentAvg =
      currentProspects.reduce((sum, p) => sum + (p.valuation || 0), 0) / currentProspects.length || 0
    const historicalAvg =
      historicalProspects.reduce((sum, p) => sum + (p.valuation || 0), 0) / historicalProspects.length || 0

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
    Ungraded: 'bg-gray-400',
  }

  const maxPositionCount = Math.max(
    ...positionComparison.map((p) => Math.max(p.current, p.historical)),
    1
  )

  const maxTierCount = Math.max(...tierComparison.map((t) => Math.max(t.current, t.historical)), 1)

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
      {/* Year Selector */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-mono flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-400" />
              Compare to Draft Class
            </CardTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="2025" className="text-white">
                  2025
                </SelectItem>
                <SelectItem value="2024" className="text-white">
                  2024
                </SelectItem>
                <SelectItem value="2023" className="text-white">
                  2023
                </SelectItem>
                <SelectItem value="2022" className="text-white">
                  2022
                </SelectItem>
                <SelectItem value="2021" className="text-white">
                  2021
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Average Valuation Comparison */}
      <Card className="bg-slate-800/50 border border-slate-700 hover:border-yellow-400/50 transition-all">
        <CardHeader>
          <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Average Valuation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 font-mono mb-2">2026 Class</div>
              <div className="text-3xl font-bold text-white font-mono">
                {valuationComparison.current.toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 font-mono mb-2">{selectedYear} Class</div>
              <div className="text-3xl font-bold text-white font-mono">
                {valuationComparison.historical.toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 font-mono mb-2">Change</div>
              <div
                className={`text-3xl font-bold font-mono ${
                  valuationComparison.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {valuationComparison.change >= 0 ? '+' : ''}
                {valuationComparison.change.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-hidden mt-6">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full origin-left"
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
        <CardHeader>
          <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Position Distribution Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positionComparison.map((pos, i) => (
              <div key={pos.position}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${positionColors[pos.position] || 'bg-slate-500'} text-slate-900 border-0 font-mono`}
                    >
                      {pos.position}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono">
                      {pos.change >= 0 ? '+' : ''}
                      {pos.change}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    <span>2026: {pos.current}</span>
                    <span>{selectedYear}: {pos.historical}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${positionColors[pos.position] || 'bg-slate-500'} rounded-full origin-left`}
                      style={{
                        width: `${(pos.current / maxPositionCount) * 100}%`,
                        animation: mounted ? `chart-fill 0.8s ease ${i * 0.1}s both` : 'none',
                        transformOrigin: 'left center',
                      }}
                    />
                  </div>
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${positionColors[pos.position] || 'bg-slate-500'} opacity-60 rounded-full origin-left`}
                      style={{
                        width: `${(pos.historical / maxPositionCount) * 100}%`,
                        animation: mounted ? `chart-fill 0.8s ease ${i * 0.1 + 0.2}s both` : 'none',
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
        <CardHeader>
          <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Tier Distribution Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tierComparison.map((tier, i) => (
              <div key={tier.tier}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${tierColors[tier.tier] || 'bg-gray-400'} text-slate-900 border-0 font-mono`}
                    >
                      {tier.tier}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono">
                      {tier.change >= 0 ? '+' : ''}
                      {tier.change}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    <span>2026: {tier.current}</span>
                    <span>{selectedYear}: {tier.historical}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${tierColors[tier.tier] || 'bg-gray-400'} rounded-full origin-left`}
                      style={{
                        width: `${(tier.current / maxTierCount) * 100}%`,
                        animation: mounted ? `chart-fill 0.8s ease ${i * 0.1}s both` : 'none',
                        transformOrigin: 'left center',
                      }}
                    />
                  </div>
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${tierColors[tier.tier] || 'bg-gray-400'} opacity-60 rounded-full origin-left`}
                      style={{
                        width: `${(tier.historical / maxTierCount) * 100}%`,
                        animation: mounted ? `chart-fill 0.8s ease ${i * 0.1 + 0.2}s both` : 'none',
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
  )
}

