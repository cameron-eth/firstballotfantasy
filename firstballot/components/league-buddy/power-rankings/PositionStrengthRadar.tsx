'use client'

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

export interface RadarPoint {
  position: string
  /** 0–100, scaled against the strongest roster in the league at that position. */
  starters: number
  bench: number
}

interface PositionStrengthRadarProps {
  data: RadarPoint[]
}

/**
 * Starter strength against bench strength on the same axes: a wide blue shape with a thin
 * gold one is a top-heavy roster, the reverse is depth waiting for a starting job.
 */
export function PositionStrengthRadar({ data }: PositionStrengthRadarProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No roster data available</p>
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#ffffff18" />
          <PolarAngleAxis
            dataKey="position"
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          {/* Recharts' entry animation never settles under React 19 here, leaving the
              polygons collapsed at the center — draw them at their final size instead. */}
          <Radar
            name="Starters"
            dataKey="starters"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          <Radar
            name="Bench"
            dataKey="bench"
            stroke="#fbbf24"
            fill="#fbbf24"
            fillOpacity={0.2}
            isAnimationActive={false}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}
            iconSize={8}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#fbbf24', fontFamily: 'monospace' }}
            formatter={(value: number, name: string) => [`${value}/100`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
