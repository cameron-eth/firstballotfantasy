'use client'

import { Header } from '@/components/header'
import { useMetrics } from '@/hooks/use-metrics'
import { OverallPerformance } from './OverallPerformance'
import { PositionMetrics } from './PositionMetrics'
import { PositionInsights } from './PositionInsights'
import { ValidationMethodology } from './ValidationMethodology'

export function MetricsView() {
  const { data, loading, error, refetch } = useMetrics()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING METRICS DATA...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error || 'Failed to load data'}</p>
              <button
                onClick={refetch}
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
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">MODEL METRICS</h1>
          <p className="text-green-400">Detailed performance metrics and validation results</p>
        </div>

        <OverallPerformance stats={data.overallStats} />
        <PositionMetrics metrics={data.modelMetrics} />
        <PositionInsights metrics={data.modelMetrics} />
        <ValidationMethodology />
      </main>
    </div>
  )
}
