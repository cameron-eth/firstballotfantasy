'use client'

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'
import { PositionBadge } from '@/components/league-buddy/ui/Badge'
import { tierStyleFor } from './board-player'
import { useCommunityTrends } from './CrowdRank'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import type { Prospect } from './types'

interface ProspectDetailModalProps {
  prospect: Prospect | null
  positionNeeds: Record<string, number>
  hasTeamContext: boolean
  isLoggedIn: boolean
  onClose: () => void
  onAddToDraftBoard: () => void
  onSaveNotes: (id: number, notes: string) => void
  noteSaveStatus?: string | null
  noteSaveError?: string | null
  notesAvailable?: boolean
  getProspectGrade: (prospect: Prospect) => string
  getDraftPick: (prospect: Prospect) => string
  getProspectTier: (rank: number, tier?: string | null) => string
  calculateProspectValue: (rank: number, position?: string) => number
  getPositionColor: (position: string) => string
}

export function ProspectDetailModal({
  prospect,
  positionNeeds,
  hasTeamContext,
  isLoggedIn,
  onClose,
  onAddToDraftBoard,
  onSaveNotes,
  noteSaveStatus,
  noteSaveError,
  notesAvailable = true,
  getProspectGrade,
  getDraftPick,
}: ProspectDetailModalProps) {
  const [localNotes, setLocalNotes] = React.useState(prospect?.notes || '')
  const trends = useCommunityTrends()

  React.useEffect(() => {
    setLocalNotes(prospect?.notes || '')
  }, [prospect])

  if (!prospect) return null

  const palette = positionPalette[prospect.position] ?? neutralPalette
  const tier = getProspectGrade(prospect)
  const tierStyle = tierStyleFor(tier)
  const graded = prospect.overall_grade != null
  const crowd = trends?.[`prospect:${prospect.id}`]
  const need = !hasTeamContext ? null : positionNeeds[prospect.position] > 0
  const canSave = !prospect.is_fallback && isLoggedIn && notesAvailable
  const stats: { label: string; value: string }[] = [
    { label: 'Class rank', value: `${prospect.position}${prospect.rank}` },
    { label: 'Grade', value: graded ? Number(prospect.overall_grade).toFixed(1) : '—' },
    ...(graded ? [{ label: 'Projected round', value: getDraftPick(prospect) }] : []),
    { label: 'Crowd rank', value: crowd?.rank ? `#${crowd.rank}` : '—' },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={prospect.name}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <header
          className="flex items-end gap-5 border-b border-white/10 p-6 pb-5"
          style={{
            background: `radial-gradient(ellipse at 15% 20%, ${palette.glow}55, transparent 60%)`,
          }}
        >
          <div
            className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl"
            style={{
              background: `radial-gradient(ellipse at 60% 25%, ${palette.glow}aa, ${palette.wash} 75%)`,
            }}
          >
            <PlayerHeadshot
              headshotUrl={prospect.headshot_url}
              espnId={prospect.espn_id}
              playerName={prospect.name}
              size={112}
              className="!h-full !w-full !rounded-none !bg-transparent"
            />
          </div>
          <div className="min-w-0 pb-1 pr-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{prospect.name}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
              <PositionBadge position={prospect.position} />
              <span
                className={cn(
                  'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  tierStyle.bg,
                  tierStyle.text,
                  tierStyle.border
                )}
              >
                {tier}
              </span>
              <span>{prospect.school}</span>
              <span className="text-slate-600">·</span>
              <span>{prospect.draft_year ?? '—'} class</span>
            </p>
          </div>
        </header>

        <div className="space-y-5 p-6">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-3"
              >
                <dt className="text-[11px] text-slate-400">{stat.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm">
            <span className="text-slate-300">Fit at {prospect.position}</span>
            {need === null ? (
              <span className="text-xs text-slate-400">Connect a league to see roster fit</span>
            ) : (
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 text-xs font-semibold',
                  need
                    ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                    : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                )}
              >
                {need ? 'You need one' : 'Covered'}
              </span>
            )}
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="prospect-notes" className="text-sm font-medium text-slate-200">
                Your notes
              </label>
              <button
                type="button"
                onClick={() => onSaveNotes(prospect.id, localNotes)}
                disabled={!canSave}
                className="rounded-md px-2 py-1 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-400/10 disabled:text-slate-500 disabled:hover:bg-transparent"
              >
                {!notesAvailable
                  ? 'Notes unavailable'
                  : prospect.is_fallback
                    ? 'Available after import'
                    : isLoggedIn
                      ? 'Save'
                      : 'Log in to save'}
              </button>
            </div>
            <textarea
              id="prospect-notes"
              className="min-h-[110px] w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-400/40 focus:outline-none"
              placeholder="Traits, concerns, where you'd take him…"
              disabled={!notesAvailable}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
            />
            {noteSaveStatus && (
              <p role="status" className="text-xs text-blue-300">
                {noteSaveStatus}
              </p>
            )}
            {noteSaveError && (
              <p role="alert" className="text-xs text-rose-300">
                {noteSaveError}
              </p>
            )}
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddToDraftBoard}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110"
            >
              Add to draft board
            </button>
            {prospect.source_url && (
              <a
                href={prospect.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-white"
              >
                Team roster ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
