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
  width = 88,
  height = 44,
}: KtcSparklineProps) {
  const { data, isLoading } = useSWR<{ history?: KtcDataPoint[] }>(
    historyProp === undefined ? `/api/ktc-values?player=${encodeURIComponent(playerName)}` : null,
    (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`KTC fetch failed: ${r.status}`)
        return r.json()
      }),
    { revalidateOnFocus: false, errorRetryCount: 3 }
  )
  const history = historyProp ?? data?.history ?? []
  const loading = historyProp === undefined && isLoading

  const valueKey = useSf ? 'value_sf' : 'value_1qb'

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

  // No data at all
  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[11px] text-muted-foreground/40"
        style={{ width, height }}
      >
        —
      </div>
    )
  }

  const latest = history[history.length - 1][valueKey] as number
  const hasMultiple = history.length >= 2
  const first = hasMultiple ? (history[0][valueKey] as number) : latest
  const trend = latest - first
  const color = trend > 0 ? '#34d399' : trend < 0 ? '#f87171' : '#94a3b8'

  return (
    <div style={{ width, height }} className="flex flex-col items-end justify-center gap-0.5">
      {/* Value */}
      <span className="text-[13px] font-mono font-bold text-foreground leading-none tabular-nums">
        {latest.toLocaleString()}
      </span>

      {/* Sparkline + delta row */}
      {hasMultiple ? (
        <div className="flex items-center gap-1">
          <div style={{ width: 48, height: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
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
          </div>
          <span
            className="text-[10px] font-mono font-bold leading-none tabular-nums"
            style={{ color }}
          >
            {trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '~'}
          </span>
        </div>
      ) : (
        <span className="text-[10px] font-mono text-muted-foreground/50 leading-none">—</span>
      )}
    </div>
  )
}
