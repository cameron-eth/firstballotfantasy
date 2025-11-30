'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ModelMetric } from '@/types/metrics'

interface PositionInsightsProps {
  metrics: ModelMetric[]
}

export function PositionInsights({ metrics }: PositionInsightsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.position} className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <h4 className="text-yellow-400 font-mono mb-2">{metric.position} INSIGHTS</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <p>• {metric.records} total records</p>
              <p>• {metric.players} unique players</p>
              <p>• {(metric.records / metric.players).toFixed(1)} seasons per player</p>
              <p>• {metric.r2 > 0.6 ? 'Strong' : 'Moderate'} predictive performance</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
