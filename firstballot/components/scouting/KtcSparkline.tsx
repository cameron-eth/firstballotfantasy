'use client'

import useSWR from 'swr'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface KtcDataPoint {
  scraped_date: string
  value_sf: number
  value_1qb: number
}

interface KtcSparklineProps {
  playerName: string
  /** Pre-fetched history (passed from parent bulk fetch). If omitted, fetches individually. */
  history?: KtcDataPoint[]
  /** Show SF value (true) or 1QB value (false). Defaults to SF. */
  useSf?: boolean
  width?: number
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as KtcDataPoint
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono shadow-lg">
      <div className="text-slate-400">{d.scraped_date}</div>
      <div className="text-emerald-400 font-bold">{payload[0].value?.toLocaleString()}</div>
    </div>
  )
}

export function KtcSparkline({
  playerName,
  history: historyProp,
  useSf = true,
  width = 80,
  height = 36,
}: KtcSparklineProps) {
  const { data, isLoading } = useSWR<{ history?: KtcDataPoint[] }>(
    historyProp === undefined ? `/api/ktc-values?player=${encodeURIComponent(playerName)}` : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  )
  const history = historyProp ?? data?.history ?? []
  const loading = historyProp === undefined && isLoading

  const valueKey = useSf ? 'value_sf' : 'value_1qb'

  // Need at least 2 points to draw a line
  if (loading) {
    return (
      <div
        className="flex items-center justify-center text-slate-600"
        style={{ width, height }}
      >
        <div className="w-3 h-3 border border-slate-600 border-t-slate-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (history.length < 2) {
    const val = history[0]?.[valueKey]
    return (
      <div
        className="flex items-center justify-center font-mono text-[11px] text-slate-400"
        style={{ width, height }}
      >
        {val ? val.toLocaleString() : '—'}
      </div>
    )
  }

  const values = history.map((d) => d[valueKey] as number)
  const first = values[0]
  const last  = values[values.length - 1]
  const trend = last - first
  const color = trend > 0 ? '#34d399' : trend < 0 ? '#f87171' : '#94a3b8'

  return (
    <div style={{ width, height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </ResponsiveContainer>

      {/* Trend indicator */}
      <div
        className="absolute bottom-0 right-0 text-[8px] font-mono font-bold leading-none"
        style={{ color }}
      >
        {trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '~'}
      </div>
    </div>
  )
}
