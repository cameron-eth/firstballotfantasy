'use client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CareerOutcome } from '@/lib/history-outcomes'
import { AppTooltip } from '@/components/ui/app-tooltip'
import { cn } from '@/lib/utils'

/** Hit = good tone, on track = neutral, miss = bad tone; same palette as tier badges. */
export const OUTCOME_TONE: Record<number, string> = {
  1: 'border-rose-400/50 bg-rose-400/10 text-rose-300',
  2: 'border-rose-400/30 bg-rose-400/5 text-rose-200',
  3: 'border-sky-300/40 bg-sky-300/10 text-sky-200',
  4: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  5: 'border-emerald-300/60 bg-emerald-400/15 text-emerald-100',
}
export const OUTCOME_FILL: Record<number, string> = {
  1: 'bg-rose-400',
  2: 'bg-rose-300',
  3: 'bg-sky-300',
  4: 'bg-emerald-400',
  5: 'bg-emerald-300',
}

/** Actual production as a multiple of comparable players' expected production. */
export const outcomeRatio = (outcome?: CareerOutcome) =>
  outcome?.expected ? outcome.actual / outcome.expected : null
export function CareerOutcomeMeter({
  name,
  outcome,
  asOf,
}: {
  name: string
  outcome?: CareerOutcome
  asOf: string
}) {
  const label = outcome?.bars ? outcome.label : 'Not rated'
  const ratio = outcomeRatio(outcome)
  return (
    <Popover>
      <AppTooltip
        content={
          outcome?.expected != null ? (
            <div className="space-y-1">
              <p className="font-semibold text-white">{label}</p>
              <p>
                {Math.round(outcome.actual).toLocaleString()} PPR points vs{' '}
                {Math.round(outcome.expected).toLocaleString()} for players drafted at a similar
                rookie ADP.
              </p>
              <p className="text-blue-200">Click for how this is measured.</p>
            </div>
          ) : (
            <p>{outcome?.reason ?? 'No verified NFL outcome yet.'}</p>
          )
        }
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex min-w-[7.5rem] flex-col gap-1 rounded-lg border px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300',
              outcome?.bars
                ? OUTCOME_TONE[outcome.bars]
                : 'border-white/10 bg-white/5 text-slate-400'
            )}
            aria-label={`${name}: ${label}. View career outcome`}
          >
            <span className="flex items-baseline justify-between gap-2 text-xs font-semibold">
              {label}
              {ratio != null && (
                <span className="tabular-nums opacity-80">{ratio.toFixed(1)}×</span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="relative h-1 w-full overflow-hidden rounded-full bg-white/10"
            >
              {ratio != null && outcome?.bars && (
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    OUTCOME_FILL[outcome.bars]
                  )}
                  style={{ width: `${Math.min(100, (ratio / 2) * 100)}%` }}
                />
              )}
              <span className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
            </span>
          </button>
        </PopoverTrigger>
      </AppTooltip>
      <PopoverContent
        className="w-80 border-slate-700 bg-slate-950 text-sm text-slate-300"
        align="end"
      >
        <h3 className="font-semibold text-white">
          {label}
          {outcome?.early && outcome.bars ? ' · Early signal' : ''}
        </h3>
        {outcome?.expected != null ? (
          <>
            <p className="mt-2">
              <strong className="text-white">
                {Math.round(outcome.actual).toLocaleString()} PPR points
              </strong>{' '}
              vs {Math.round(outcome.expected).toLocaleString()} expected through the same career
              stage.
            </p>
            <p className="mt-2">
              Rookie ADP {outcome.adp?.toFixed(1)} · {outcome.adpCount} draft observations ·{' '}
              {outcome.peers} comparable players.
            </p>
            <p className="mt-2 text-xs">
              Same-position players from earlier classes, within half to twice the rookie ADP.
              Closer ADP receives more weight. Retired players remain included. Regular-season
              cumulative production includes missed time.
            </p>
            <p className="mt-2 text-xs">
              Miss pace &lt;0.5×, below 0.5–0.8×, on track 0.8–1.2×, hit 1.2–1.5×, strong hit ≥1.5×
              of expected production. The line in the bar marks 1.0×. Descriptive outcome, not a
              forecast.
              {outcome.early ? ' This player is still early in their career.' : ''}
            </p>
          </>
        ) : (
          <p className="mt-2">
            {outcome?.reason ?? 'No verified NFL identity or outcome data available.'} Not rated is
            not a miss.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {asOf} · 12-team rookie ADP; full-PPR production. Not a league-specific or superflex
          baseline.{outcome?.window ? ` ADP window: ${outcome.window.join(' – ')}.` : ''}
        </p>
        <p className="mt-2 text-xs">
          <a
            href="https://fantasyfootballcalculator.com/adp/rookie"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            FFC ADP
          </a>{' '}
          ·{' '}
          <a
            href="https://nflreadr.nflverse.com/reference/load_player_stats.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            nflverse production
          </a>
        </p>
      </PopoverContent>
    </Popover>
  )
}
