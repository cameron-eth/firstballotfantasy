'use client'

import { useId, useMemo } from 'react'
import useSWR from 'swr'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

interface KtcDataPoint {
  scraped_date: string
  value_sf: number
  value_1qb: number
}

interface KtcSparklineProps {
  playerName: string
  history?: KtcDataPoint[]
  useSf?: boolean
  width?: number
  height?: number
  layout?: 'stack' | 'bar'
}

const EMERALD = '#34d399'
const ROSE = '#f87171'
const SLATE = '#94a3b8'

function yDomainForHistory(
  history: KtcDataPoint[],
  valueKey: 'value_sf' | 'value_1qb'
): [number, number] {
  const values = history.map((h) => h[valueKey] as number)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const spread = maxV - minV
  const pad =
    spread > 0 ? Math.max(spread * 0.18, 0.5) : Math.max(Math.abs(minV) * 0.003, 3)
  return [minV - pad, maxV + pad]
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number; payload?: KtcDataPoint }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as KtcDataPoint
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono shadow-lg z-50">
      <div className="text-slate-400">{d.scraped_date}</div>
      <div className="text-emerald-400 font-bold">{payload[0].value?.toLocaleString()}</div>
    </div>
  )
}

type MiniChartProps = {
  history: KtcDataPoint[]
  valueKey: 'value_sf' | 'value_1qb'
  stroke: string
  chartW: number
  chartH: number
  /** Slightly larger hit targets & dots for bar row */
  dense?: boolean
}

function KtcMiniChart({ history, valueKey, stroke, chartW, chartH, dense }: MiniChartProps) {
  const gradId = useId().replace(/:/g, '')
  const yDomain = useMemo(() => yDomainForHistory(history, valueKey), [history, valueKey])
  const y0 = yDomain[0]

  const dotR = dense ? 2 : 1.75
  const strokeW = dense ? 2 : 1.75

  return (
    <div
      className="rounded-md bg-slate-800/55 border border-slate-600/50 overflow-hidden"
      style={{ width: chartW, height: chartH }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis dataKey="scraped_date" type="category" hide padding={{ left: 0, right: 0 }} />
          <YAxis domain={yDomain} hide allowDataOverflow />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#71717a', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="linear"
            dataKey={valueKey}
            stroke={stroke}
            strokeWidth={strokeW}
            fill={`url(#${gradId})`}
            fillOpacity={1}
            baseValue={y0}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props
              if (cx == null || cy == null || index == null) return <g key={`d-${index}`} />
              const last = index === history.length - 1
              return (
                <circle
                  key={`d-${index}`}
                  cx={cx}
                  cy={cy}
                  r={last ? dotR + 0.75 : dotR}
                  fill={stroke}
                  stroke="#18181b"
                  strokeWidth={last ? 1 : 0.5}
                />
              )
            }}
            activeDot={{ r: dense ? 4 : 3, stroke: '#fafafa', strokeWidth: 1, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Stack layout: thin line-only (no fill) to save vertical space */
function KtcStackSparkline({
  history,
  valueKey,
  stroke,
  chartW,
  chartH,
}: Omit<MiniChartProps, 'dense'>) {
  const yDomain = useMemo(() => yDomainForHistory(history, valueKey), [history, valueKey])

  return (
    <div
      className="rounded-sm bg-slate-800/45 border border-slate-600/45"
      style={{ width: chartW, height: chartH }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
          <XAxis dataKey="scraped_date" type="category" hide padding={{ left: 0, right: 0 }} />
          <YAxis domain={yDomain} hide allowDataOverflow />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#71717a', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line
            type="linear"
            dataKey={valueKey}
            stroke={stroke}
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index } = props
              if (cx == null || cy == null || index == null) return <g key={`l-${index}`} />
              const last = index === history.length - 1
              return (
                <circle
                  key={`l-${index}`}
                  cx={cx}
                  cy={cy}
                  r={last ? 2.5 : 1.5}
                  fill={stroke}
                  stroke="#09090b"
                  strokeWidth={0.75}
                />
              )
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function KtcSparkline({
  playerName,
  history: historyProp,
  useSf = true,
  width = 88,
  height = 44,
  layout = 'stack',
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
    if (layout === 'bar') {
      return (
        <div className="w-full flex items-center justify-between gap-2 min-h-[32px] border-t border-white/5 pt-1.5 mt-1">
          <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">KTC · SF</span>
          <div className="w-4 h-4 border border-slate-600 border-t-slate-400 rounded-full animate-spin shrink-0" />
        </div>
      )
    }
    return (
      <div
        className="flex items-center justify-center text-slate-600"
        style={{ width, height }}
      >
        <div className="w-3 h-3 border border-slate-600 border-t-slate-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (history.length === 0) {
    if (layout === 'bar') {
      return (
        <div className="w-full flex items-center justify-between gap-2 min-h-[28px] border-t border-white/5 pt-1.5 mt-1">
          <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">KTC · SF</span>
          <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
        </div>
      )
    }
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
  /** Line/fill color must match the signed delta text (+ green, − red). */
  const stroke = trend > 0 ? EMERALD : trend < 0 ? ROSE : SLATE

  if (layout === 'bar') {
    const chartW = 88
    const chartH = 36
    return (
      <div className="w-full flex items-center justify-between gap-2 min-h-[36px] border-t border-white/5 pt-1.5 mt-1">
        <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          KTC · SF
        </span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-xs font-mono font-bold text-foreground leading-none tabular-nums shrink-0">
            {latest.toLocaleString()}
          </span>
          {hasMultiple ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <KtcMiniChart
                history={history}
                valueKey={valueKey}
                stroke={stroke}
                chartW={chartW}
                chartH={chartH}
                dense
              />
              <span
                className={cn(
                  'text-[10px] font-mono font-bold leading-none tabular-nums w-[2.25rem] text-right',
                  trend > 0 && 'text-emerald-400',
                  trend < 0 && 'text-rose-400',
                  trend === 0 && 'text-slate-400'
                )}
              >
                {trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '~'}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground/50">—</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width, height }} className="flex flex-col items-end justify-center gap-0.5">
      <span className="text-[13px] font-mono font-bold text-foreground leading-none tabular-nums">
        {latest.toLocaleString()}
      </span>

      {hasMultiple ? (
        <div className="flex items-center gap-1">
          <KtcStackSparkline
            history={history}
            valueKey={valueKey}
            stroke={stroke}
            chartW={Math.max(width - 8, 52)}
            chartH={22}
          />
          <span
            className={cn(
              'text-[10px] font-mono font-bold leading-none tabular-nums',
              trend > 0 && 'text-emerald-400',
              trend < 0 && 'text-rose-400',
              trend === 0 && 'text-slate-400'
            )}
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
