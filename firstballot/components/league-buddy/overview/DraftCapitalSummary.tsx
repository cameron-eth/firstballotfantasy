import { ChevronRight, Ticket } from 'lucide-react'
import type { PickYear } from '@/lib/picks-overview'
import { Skeleton } from '@/components/ui/skeleton'

/** Header summary of draft capital by year; the chips themselves live on the Picks tab. */
export function DraftCapitalSummary({
  years,
  loading,
  onOpen,
}: {
  years: PickYear[]
  loading: boolean
  onOpen: () => void
}) {
  if (loading) return <Skeleton className="h-16 w-full rounded-xl bg-surface/60 sm:w-80" />
  if (!years.length) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open draft picks"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line/60 bg-surface/40 px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-action sm:flex-none"
    >
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg border border-pick/30 bg-pick/10 text-violet-200 sm:grid">
        <Ticket className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0 flex-1 grid-flow-col divide-x divide-line/60">
        {years.map((y) => {
          const firsts = y.owned.filter((p) => p.round === 1).length
          return (
            <span key={y.season} className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-3">
              <span className="block text-sm font-semibold tabular-nums text-white">
                {y.season}
              </span>
              <span className="block whitespace-nowrap text-xs text-slate-400">
                {y.owned.length} {y.owned.length === 1 ? 'pick' : 'picks'}
                {firsts > 0 && <span className="text-pick"> · {firsts} R1</span>}
              </span>
            </span>
          )
        })}
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
    </button>
  )
}
