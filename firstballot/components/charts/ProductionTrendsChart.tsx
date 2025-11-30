'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { FantasyProductionTrend } from '@/types/charts'

const fantasyProductionTrends: FantasyProductionTrend[] = [
  { season: 2016, avgPPG: 7.8 },
  { season: 2017, avgPPG: 7.6 },
  { season: 2018, avgPPG: 7.4 },
  { season: 2019, avgPPG: 7.2 },
  { season: 2020, avgPPG: 7.1 },
  { season: 2021, avgPPG: 7.2 },
  { season: 2022, avgPPG: 7.0 },
  { season: 2023, avgPPG: 6.8 },
  { season: 2024, avgPPG: 6.7 },
]

export function ProductionTrendsChart() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">FANTASY PRODUCTION TRENDS</CardTitle>
        <p className="text-green-400 text-sm">Average fantasy PPG by season (2016-2024)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={fantasyProductionTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="season" stroke="#9CA3AF" domain={['dataMin', 'dataMax']} />
            <YAxis stroke="#9CA3AF" domain={[6.6, 7.8]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value) => [`${Number(value).toFixed(2)} PPG`, 'Average Fantasy PPG']}
              labelFormatter={(label) => `Season: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="avgPPG"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
