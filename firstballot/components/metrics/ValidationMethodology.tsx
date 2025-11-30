'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ValidationMethodology() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">VALIDATION METHODOLOGY</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="gradient-border">
            <div className="gradient-border-content">
              <h3 className="text-green-400 font-mono mb-3">CROSS-VALIDATION</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• 5-fold cross-validation implemented</li>
                <li>• Proper train/test splits maintained</li>
                <li>• Temporal validation for time series data</li>
                <li>• Consistent performance across folds</li>
              </ul>
            </div>
          </div>

          <div className="gradient-border">
            <div className="gradient-border-content">
              <h3 className="text-green-400 font-mono mb-3">FEATURE IMPORTANCE</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Career games played (primary)</li>
                <li>• Draft pick position</li>
                <li>• Combine metrics</li>
                <li>• Position-specific adjustments</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-700 rounded-lg">
          <h4 className="text-yellow-400 font-mono mb-2">INTERPRETATION NOTES</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            The R² = 0.74 overall score indicates the model explains 72% of fantasy performance
            variance. This is strong for sports prediction models, where many factors remain
            unpredictable. The cross-validation results confirm model stability across different
            data subsets, with TE position showing expected higher variance due to role diversity.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
