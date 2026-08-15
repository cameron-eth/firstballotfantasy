'use client'

import { useMemo, useState } from 'react'
import { formatValue } from '@/lib/trade-utils'
import type { PnlSeries } from './types'

export function TradePnLChart({ series }: { series: PnlSeries[] }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [hover, setHover] = useState<number | null>(null)

  const W = 760
  const H = 340
  const padL = 62
  const padR = 18
  const padT = 16
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const visible = series.filter((s) => !hidden.has(s.rosterId))

  const { minTs, maxTs, minVal, maxVal } = useMemo(() => {
    let minTs = Infinity
    let maxTs = -Infinity
    let minVal = 0
    let maxVal = 0
    const src = visible.length ? visible : series
    for (const s of src) {
      for (const p of s.points) {
        if (p.ts < minTs) minTs = p.ts
        if (p.ts > maxTs) maxTs = p.ts
        if (p.value < minVal) minVal = p.value
        if (p.value > maxVal) maxVal = p.value
      }
    }
    if (!isFinite(minTs)) {
      minTs = 0
      maxTs = 1
    }
    if (maxVal === minVal) maxVal = minVal + 1
    return { minTs, maxTs, minVal, maxVal }
  }, [visible, series])

  const fx = (ts: number) => padL + ((ts - minTs) / Math.max(maxTs - minTs, 1)) * plotW
  const fy = (v: number) => padT + (1 - (v - minVal) / Math.max(maxVal - minVal, 1)) * plotH

  const yTicks = useMemo(() => {
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => minVal + ((maxVal - minVal) * i) / steps)
  }, [minVal, maxVal])

  const xTicks = useMemo(() => {
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => minTs + ((maxTs - minTs) * i) / steps)
  }, [minTs, maxTs])

  const toggle = (id: number) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (series.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground text-center rounded-lg border border-border bg-card/60">
        No trade activity to chart in this window
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trade P&L over time">
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => {
          const isZero = Math.abs(t) < 1e-6
          return (
            <g key={`y-${i}`}>
              <line
                x1={padL}
                y1={fy(t)}
                x2={W - padR}
                y2={fy(t)}
                stroke={isZero ? '#475569' : '#1e293b'}
                strokeWidth={1}
                strokeDasharray={isZero ? '' : '2 3'}
              />
              <text x={padL - 8} y={fy(t) + 3} textAnchor="end" fontSize={9} className="font-mono" fill="#64748b">
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          )
        })}
        {/* x labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x-${i}`}
            x={fx(t)}
            y={H - padB + 16}
            textAnchor="middle"
            fontSize={9}
            className="font-mono"
            fill="#64748b"
          >
            {new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </text>
        ))}
        {/* P&L lines */}
        {visible.map((s) => {
          const dim = hover !== null && hover !== s.rosterId
          const pts = s.points.map((p) => `${fx(p.ts)},${fy(p.value)}`).join(' ')
          return (
            <polyline
              key={s.rosterId}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.rosterId ? 2.5 : 1.5}
              opacity={dim ? 0.18 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          )
        })}
        {/* Transparent hit areas — let the user hover the line itself */}
        {visible.map((s) => {
          const pts = s.points.map((p) => `${fx(p.ts)},${fy(p.value)}`).join(' ')
          return (
            <polyline
              key={`hit-${s.rosterId}`}
              points={pts}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHover(s.rosterId)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        {/* endpoints — avatar bubble on hover, dot otherwise */}
        {visible.map((s) => {
          const last = s.points[s.points.length - 1]
          if (!last) return null
          const isHover = hover === s.rosterId
          const dim = hover !== null && !isHover
          const cx = fx(last.ts)
          const cy = fy(last.value)

          if (isHover && s.ownerAvatar) {
            const R = 15
            const clipId = `pnl-clip-${s.rosterId}`
            return (
              <g key={`end-${s.rosterId}`} style={{ pointerEvents: 'none' }}>
                <clipPath id={clipId}>
                  <circle cx={cx} cy={cy} r={R} />
                </clipPath>
                <circle cx={cx} cy={cy} r={R + 2} fill="#0f172a" stroke={s.color} strokeWidth={2} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <image
                  href={`https://sleepercdn.com/avatars/${s.ownerAvatar}`}
                  x={cx - R}
                  y={cy - R}
                  width={R * 2}
                  height={R * 2}
                  clipPath={`url(#${clipId})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <text
                  x={cx - R - 6}
                  y={cy + 3}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={700}
                  className="font-mono"
                  fill={s.color}
                >
                  {s.ownerName}
                </text>
              </g>
            )
          }

          return (
            <circle
              key={`end-${s.rosterId}`}
              cx={cx}
              cy={cy}
              r={isHover ? 4 : 2.5}
              fill={s.color}
              opacity={dim ? 0.18 : 1}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}
      </svg>

      {/* Legend — click to toggle, hover to highlight */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {series.map((s) => {
          const off = hidden.has(s.rosterId)
          return (
            <button
              key={s.rosterId}
              type="button"
              onClick={() => toggle(s.rosterId)}
              onMouseEnter={() => setHover(s.rosterId)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors hover:border-foreground/40 ${
                off ? 'border-border/40 opacity-40' : 'border-border'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-foreground">{s.ownerName}</span>
              <span className={s.final >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatValue(s.final)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
