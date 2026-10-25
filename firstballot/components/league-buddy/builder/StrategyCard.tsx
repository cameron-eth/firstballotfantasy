'use client'
import { useState } from 'react'
const colors: Record<string, string> = {
  QB: 'border-blue-400/40 bg-blue-400/10',
  RB: 'border-emerald-400/40 bg-emerald-400/10',
  WR: 'border-amber-400/40 bg-amber-400/10',
  TE: 'border-purple-400/40 bg-purple-400/10',
}
export function StrategyCard({
  name,
  position,
  team,
  image,
  label,
  action,
  onAction,
  outgoing = false,
}: {
  name: string
  position: string
  team: string
  image?: string | null
  label: string
  action: string
  onAction: () => void
  outgoing?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <article
      className={`relative overflow-hidden rounded-xl border ${colors[position] ?? 'border-slate-600 bg-slate-800'} ${outgoing ? 'opacity-50' : ''}`}
    >
      <div className="flex min-h-24 items-end gap-2 px-3 pt-3">
        {image && !failed ? (
          <img
            src={image}
            alt=""
            onError={() => setFailed(true)}
            className="h-24 w-20 shrink-0 object-contain object-bottom"
          />
        ) : (
          <div className="flex h-24 w-12 shrink-0 items-center text-xl font-semibold text-slate-500">
            {position}
          </div>
        )}
        <div className="min-w-0 self-center">
          <p className="break-words text-sm font-semibold text-white">{name}</p>
          <p className="mt-1 text-xs text-slate-400">
            {position} · {team}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/40 px-3 py-2">
        <span className="text-[11px] text-slate-300">{label}</span>
        <button
          onClick={onAction}
          className="text-xs font-medium text-blue-300 hover:text-white"
          aria-label={`${action} ${name}`}
        >
          {action}
        </button>
      </div>
    </article>
  )
}
