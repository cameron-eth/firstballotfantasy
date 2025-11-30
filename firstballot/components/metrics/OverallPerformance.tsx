'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, TrendingUp, Target } from 'lucide-react'
import type { OverallStats } from '@/types/metrics'

interface OverallPerformanceProps {
  stats: OverallStats
}

export function OverallPerformance({ stats }: OverallPerformanceProps) {
  return (
    <Card className="mb-8 bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">OVERALL PERFORMANCE</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-2xl font-mono text-white">{stats.overallR2}</p>
            <p className="text-sm text-gray-400">Overall R²</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-yellow-400" />
            </div>
            <p className="text-2xl font-mono text-white">{stats.totalRecords.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Records</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-2xl font-mono text-white">{stats.uniquePlayers.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Unique Players</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <p className="text-2xl font-mono text-white">{stats.seasonsAnalyzed}</p>
            <p className="text-sm text-gray-400">Seasons</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-2xl font-mono text-white">{stats.pipelineRuntime}s</p>
            <p className="text-sm text-gray-400">Runtime</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
