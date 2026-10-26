'use client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CareerOutcome } from '@/lib/history-outcomes'
const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-300', 'bg-emerald-400', 'bg-green-400']
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-end gap-1 rounded px-2 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
          aria-label={`${name}: ${label}. View career outcome`}
          title={`${label}${outcome?.early ? ' · Early signal' : ''}`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`w-1.5 rounded-sm ${outcome?.bars && i < outcome.bars ? colors[outcome.bars - 1] : 'bg-slate-600/50'}`}
              style={{ height: 6 + i * 3 }}
            />
          ))}
        </button>
      </PopoverTrigger>
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
              1–5 bars: &lt;50%, 50–79%, 80–119%, 120–149%, ≥150% of expected production.
              Descriptive outcome, not a forecast.
              {outcome.early ? ' This player is still early in their career.' : ''}
            </p>
          </>
        ) : (
          <p className="mt-2">
            {outcome?.reason ?? 'No verified NFL identity or outcome data available.'} Gray bars are
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
