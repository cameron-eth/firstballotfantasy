'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { ModelMetric } from '@/types/metrics'

interface PositionMetricsProps {
  metrics: ModelMetric[]
}

export function PositionMetrics({ metrics }: PositionMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {metrics.map((metric) => (
        <Card key={metric.position} className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono">{metric.position} METRICS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">R² Score</span>
                <span className="font-mono text-white">{metric.r2.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">RMSE</span>
                <span className="font-mono text-white">{metric.rmse.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CV R² Mean</span>
                <span className="font-mono text-white">{metric.cv_r2_mean.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CV R² Std</span>
                <span className="font-mono text-white">{metric.cv_r2_std.toFixed(3)}</span>
              </div>

              {/* Performance Indicator */}
              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center space-x-2">
                  {metric.r2 > 0.6 ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span
                    className={`text-sm ${metric.r2 > 0.6 ? 'text-green-400' : 'text-yellow-400'}`}
                  >
                    {metric.r2 > 0.6 ? 'Strong Performance' : 'Moderate Performance'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
