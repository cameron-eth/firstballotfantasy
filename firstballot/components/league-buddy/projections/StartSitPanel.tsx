'use client'

import { ArrowRight, Zap } from 'lucide-react'
import type { StartSitResult } from './startSit'

const ACCENT = '#34d399' // emerald-400 — points you can still gain

interface StartSitPanelProps {
  result: StartSitResult
  week: number
  /** True when a league scoring rule pays out but isn't projected (K/DEF only). */
  approximate?: boolean
  loading?: boolean
}

export function StartSitPanel({ result, week, approximate, loading }: StartSitPanelProps) {
  const { startersProjected, optimalProjected, pointsLeft, swaps, noLineupSet } = result

  // Nothing projected at all means the feed hasn't posted for this week yet; an
  // empty board is less misleading than a row of zeroes presented as advice.
  if (!loading && optimalProjected === 0) return null

  return (
    <div
      className="rounded-lg px-4 py-3 border bg-slate-900/40"
      style={{ borderColor: `${ACCENT}40` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-3 w-3" style={{ color: ACCENT }} />
        <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">
          Start / Sit
        </span>
        <span className="text-slate-600 text-[10px]">· week {week}</span>

        {!loading && !noLineupSet && (
          <span className="ml-auto font-mono text-[11px] tabular-nums">
            <span className="text-slate-400">{startersProjected.toFixed(1)}</span>
            <ArrowRight className="inline h-2.5 w-2.5 mx-1 text-slate-600" />
            <span style={{ color: ACCENT }} className="font-semibold">
              {optimalProjected.toFixed(1)}
            </span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-slate-500 text-xs font-mono">
          Loading projections…
        </div>
      ) : noLineupSet ? (
        <p className="py-3 text-center text-slate-500 text-xs">
          No lineup set for week {week} yet. Best available is{' '}
          <span className="font-mono text-slate-300">{optimalProjected.toFixed(1)}</span> projected.
        </p>
      ) : swaps.length === 0 ? (
        <p className="py-3 text-center text-xs" style={{ color: ACCENT }}>
          Your lineup is already the best one available.
        </p>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-slate-400">
            <span className="font-mono font-semibold" style={{ color: ACCENT }}>
              +{pointsLeft.toFixed(1)}
            </span>{' '}
            projected points sitting on your bench.
          </p>

          <div className="space-y-1">
            {swaps.map((swap) => (
              <div
                key={swap.start?.playerId ?? swap.sit?.playerId}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded px-2 py-1.5 bg-slate-800/40"
              >
                <div className="min-w-0 flex items-center gap-1.5">
                  {swap.start ? (
                    <>
                      <span className="text-[9px] font-mono text-slate-500 w-6 flex-shrink-0">
                        {swap.start.position}
                      </span>
                      <span className="text-xs text-slate-100 truncate">{swap.start.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums flex-shrink-0">
                        {swap.start.projected.toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-600 italic">bench, no replacement</span>
                  )}
                </div>

                <ArrowRight className="h-3 w-3 text-slate-600 flex-shrink-0" />

                <div className="min-w-0 flex items-center gap-1.5">
                  {swap.sit ? (
                    <>
                      <span className="text-[9px] font-mono text-slate-600 w-6 flex-shrink-0">
                        {swap.sit.position}
                      </span>
                      <span className="text-xs text-slate-500 truncate line-through">
                        {swap.sit.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 tabular-nums flex-shrink-0">
                        {swap.sit.projected.toFixed(1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-600 italic">empty slot</span>
                  )}
                </div>

                <span
                  className="text-[10px] font-mono font-semibold tabular-nums text-right w-10"
                  style={{ color: ACCENT }}
                >
                  +{swap.gain.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
        Rotowire projections, scored with your league&apos;s own settings.
        {approximate &&
          ' Kicker and defense values are estimates — some scoring rules aren’t projected.'}
      </p>
    </div>
  )
}
