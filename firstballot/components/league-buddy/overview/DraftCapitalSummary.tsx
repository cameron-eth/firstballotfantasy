import { Ticket } from 'lucide-react'
import type { PickYear } from '@/lib/picks-overview'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Header summary of draft capital: one column per draft year, each opening that year on the
 * Picks tab. The chips themselves live on Picks.
 */
export function DraftCapitalSummary({
  years,
  loading,
  onOpen,
}: {
  years: PickYear[]
  loading: boolean
  onOpen: (season: string) => void
}) {
  if (loading) return <Skeleton className="h-14 w-full rounded-xl bg-surface/60 sm:w-72" />
  if (!years.length) return null
  return (
    <div
      role="group"
      aria-label="Draft capital by year"
      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line/60 bg-surface/40 p-1.5 sm:flex-none"
    >
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg border border-pick/30 bg-pick/10 text-violet-200 sm:grid">
        <Ticket className="size-4" aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 grid-flow-col divide-x divide-line/60">
        {years.map((y) => {
          const firsts = y.owned.filter((p) => p.round === 1).length
          return (
            <button
              key={y.season}
              type="button"
              onClick={() => onOpen(y.season)}
              aria-label={`${y.season} draft: ${y.owned.length} picks, open on the Picks tab`}
              className="min-w-0 rounded-md px-2.5 py-1 text-left transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-action sm:px-3"
            >
              <span className="block text-sm font-semibold tabular-nums text-white">
                {y.season}
              </span>
              <span className="block whitespace-nowrap text-xs text-slate-400">
                {y.owned.length} {y.owned.length === 1 ? 'pick' : 'picks'}
                {firsts > 0 && <span className="text-pick"> · {firsts} R1</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
