'use client'
import type { KtcHistoryPoint } from './types'
import { MetricTip } from './MetricTip'
import { ktcHistoryValue, type LeagueContext } from '@/lib/sleeper-sdk'
export function KtcTrend({ history, ctx }: { history?: KtcHistoryPoint[]; ctx: LeagueContext }) {
  const rows = (history ?? [])
    .filter((r) => Number.isFinite(ktcHistoryValue(r, ctx)))
    .slice()
    .sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
  if (rows.length < 2) return <span className="text-xs text-slate-500">—</span>
  const values = rows.map((r) => ktcHistoryValue(r, ctx)),
    low = Math.min(...values),
    range = Math.max(...values) - low || 1
  const delta = values.at(-1)! - values[0]
  return (
    <div className={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
      <svg viewBox="0 0 76 24" className="ml-auto h-6 w-[76px]" aria-hidden="true">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={values
            .map((v, i) => `${2 + (i / (values.length - 1)) * 72},${22 - ((v - low) / range) * 20}`)
            .join(' ')}
        />
      </svg>
      <span className="text-xs tabular-nums">
        <MetricTip label={`${delta > 0 ? '+' : ''}${delta.toLocaleString()}`}>
          KTC {ctx.superflex ? 'superflex' : '1QB'} change from {rows[0].scraped_date} (
          {values[0].toLocaleString()}) to {rows.at(-1)!.scraped_date} (
          {values.at(-1)!.toLocaleString()}). Market value, not fantasy points.
        </MetricTip>
      </span>
    </div>
  )
}
