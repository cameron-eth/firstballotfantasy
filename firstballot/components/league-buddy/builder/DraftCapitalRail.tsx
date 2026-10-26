'use client'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
import { projectedPick, type FundingPlan } from '@/lib/draft-funding'
import type { CapitalFit } from '@/lib/team-timeline'
import type { Target } from '@/lib/team-scenarios'
import type { TeamData } from '../types'
export function DraftCapitalRail({
  picks,
  year,
  teams,
  slots,
  fits,
  targets,
  plans,
  available,
  onFund,
  onUndo,
}: {
  picks: OwnedPick[]
  year: number
  teams: TeamData[]
  slots: Record<number, number>
  fits: CapitalFit[]
  targets: Target[]
  plans: FundingPlan[]
  available: boolean
  onFund: (t: Target) => void
  onUndo: (id: string) => void
}) {
  const current = picks.filter((p) => Number(p.season) === year)
  const goals = targets.filter((t) => t.kind === 'draft' && t.year === year)
  return (
    <section
      aria-label="Draft access and funding"
      className="mx-auto w-full rounded-xl border border-violet-400/20 bg-slate-900/80 p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">{year} draft access</h3>
        <span className="text-xs text-slate-400">
          {goals.length} targets · {current.length} picks in plan
        </span>
      </div>
      {!available ? (
        <p className="text-xs text-slate-400">Pick inventory unavailable; funding is unverified.</p>
      ) : !current.length ? (
        <p className="text-xs text-amber-300">
          No picks in this class. A rookie target needs a pick acquisition first.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {current.map((p) => {
            const assigned = fits.find((f) => f.pick?.id === p.id)
            const target = goals.find((t) => t.id === assigned?.targetId)
            const planned = plans.find((f) => f.receivePickId === p.id)
            return (
              <div
                key={p.id}
                className={`rounded-lg border px-3 py-2 ${planned ? 'border-dashed border-amber-400/40' : 'border-violet-400/30'} text-sm`}
              >
                <p className="font-semibold text-violet-200">
                  {slots[p.roster_id]
                    ? `${p.round}.${String(slots[p.roster_id]).padStart(2, '0')}`
                    : `Round ${p.round}`}{' '}
                  · {planned ? 'Trade assumed' : 'Owned'}
                </p>
                <p className="mt-1 text-slate-400">
                  Via {teams.find((t) => t.rosterId === p.roster_id)?.teamName ?? 'original team'}
                  {projectedPick(p, slots, teams.length) ? ' · projected' : ''}
                </p>
                <p className="mt-1 text-slate-300">
                  {target
                    ? `${assigned?.status === 'covered' ? 'In range for' : 'Still short of'} ${target.name}`
                    : 'Unallocated'}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {goals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {goals.map((t) => {
            const fit = fits.find((f) => f.targetId === t.id),
              plan = plans.find((f) => f.targetId === t.id)
            return (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <button
                  className="rounded-lg border border-slate-600 px-3 py-2 text-blue-200"
                  onClick={() => onFund(t)}
                >
                  {t.name} ·{' '}
                  {plan
                    ? 'Review funding'
                    : fit?.status === 'covered'
                      ? 'Pick in range'
                      : 'Find a path'}{' '}
                  →
                </button>
                {plan && (
                  <button onClick={() => onUndo(t.id)} className="text-slate-400">
                    Undo simulation
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-[10px] text-slate-500">
        Projected MaxPF order follows each pick’s original team. Class rank is a cost proxy, not
        ADP; no pick guarantees a player. Dashed picks are hypothetical trades.
      </p>
    </section>
  )
}
