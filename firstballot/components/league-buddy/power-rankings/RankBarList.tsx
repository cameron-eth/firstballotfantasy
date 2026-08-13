'use client'

import { ordinal } from '@/lib/sleeper-sdk'
import { toneForRank } from './rank-colors'

export interface RankBarRow {
  key: string
  label: string
  /** 0–1 — width of the bar relative to the league leader in this row's category. */
  share: number
  rank: number
  /** Optional detail shown under the label, e.g. the player filling the slot. */
  sublabel?: string
}

interface RankBarListProps {
  rows: RankBarRow[]
  leagueSize: number
  /** Column header over the labels, e.g. 'POS' or 'SLOT'. */
  labelHeader: string
  emptyMessage?: string
}

/**
 * The shared bar-and-rank readout used by both the positional and starter boards:
 * one row per category, bar length = share of the league leader, rank on the right.
 */
export function RankBarList({
  rows,
  leagueSize,
  labelHeader,
  emptyMessage = 'No data available',
}: RankBarListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">{emptyMessage}</p>
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-700">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          {labelHeader}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Rank</span>
      </div>

      {rows.map((row) => {
        const tone = toneForRank(row.rank, leagueSize)
        return (
          <div key={row.key} className="flex items-center gap-3 py-1.5">
            <div className="w-14 shrink-0">
              <div className="text-xs font-mono font-bold text-slate-200">{row.label}</div>
              {row.sublabel && (
                <div className="text-[10px] text-slate-500 truncate" title={row.sublabel}>
                  {row.sublabel}
                </div>
              )}
            </div>

            <div className="flex-1 h-2.5 rounded-full bg-slate-700/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
                style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }}
              />
            </div>

            <span className={`w-10 text-right text-xs font-mono font-bold ${tone.text}`}>
              {ordinal(row.rank)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
