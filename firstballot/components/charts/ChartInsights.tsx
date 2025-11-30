'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ChartInsights() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">CHART INSIGHTS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gradient-border">
            <div className="gradient-border-content">
              <h3 className="text-green-400 font-mono text-sm mb-2">DECLINING PRODUCTION</h3>
              <p className="text-gray-300 text-sm">
                Fantasy production has generally declined from 2016-2024, likely due to rule
                changes, increased parity, and defensive evolution.
              </p>
            </div>
          </div>
          <div className="gradient-border">
            <div className="gradient-border-content">
              <h3 className="text-green-400 font-mono text-sm mb-2">STRONG MODEL FIT</h3>
              <p className="text-gray-300 text-sm">
                R² of 0.72 demonstrates strong predictive capability, with most predictions
                clustering around the diagonal trend line.
              </p>
            </div>
          </div>
          <div className="gradient-border">
            <div className="gradient-border-content">
              <h3 className="text-green-400 font-mono text-sm mb-2">DRAFT CAPITAL VALUE</h3>
              <p className="text-gray-300 text-sm">
                Clear inverse relationship between draft position and fantasy performance, with
                early picks showing significantly higher upside.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
