'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DraftPositionDataPoint } from '@/types/charts'

interface DraftAnalysisChartProps {
  data: DraftPositionDataPoint[]
  loading: boolean
}

export function DraftAnalysisChart({ data, loading }: DraftAnalysisChartProps) {
  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono">PERFORMANCE VS DRAFT POSITION</CardTitle>
          <p className="text-green-400 text-sm">Fantasy PPG by draft pick number • Loading...</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono">PERFORMANCE VS DRAFT POSITION</CardTitle>
        <p className="text-green-400 text-sm">Fantasy PPG by draft pick number • Live Data</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="draftPick"
              stroke="#9CA3AF"
              label={{
                value: 'Draft Pick',
                position: 'insideBottom',
                offset: -10,
                style: { textAnchor: 'middle', fill: '#9CA3AF' },
              }}
            />
            <YAxis
              dataKey="fantasyPPG"
              stroke="#9CA3AF"
              label={{
                value: 'Fantasy PPG',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value, name) => [
                name === 'fantasyPPG' ? `${Number(value).toFixed(2)} PPG` : value,
                name === 'fantasyPPG' ? 'Fantasy PPG' : 'Draft Pick',
              ]}
              labelFormatter={(label) => `Draft Pick: ${label}`}
            />
            <Scatter dataKey="fantasyPPG" fill="#FF6B9D" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
