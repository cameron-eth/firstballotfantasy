import useSWR from 'swr'
import { cn } from '@/lib/utils'
import type { CommunityTrend } from '@/lib/community/trends'

const fetchTrends = async (url: string): Promise<Record<string, CommunityTrend>> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Community ranks unavailable')
  return (await r.json()).trends
}

/** Community rank and 7-day movement for every prospect, keyed by `prospect:<id>`. */
export function useCommunityTrends() {
  const { data } = useSWR('/api/community-trends', fetchTrends, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
    shouldRetryOnError: false,
  })
  return data
}

function Spark({ values, up }: { values: number[]; up: boolean | null }) {
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 56},${12 - ((v - min) / span) * 11 - 0.5}`)
    .join(' ')
  return (
    <svg width="56" height="12" viewBox="0 0 56 12" aria-hidden="true" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={up === null ? 'stroke-slate-500' : up ? 'stroke-emerald-400' : 'stroke-rose-400'}
      />
    </svg>
  )
}

export function CrowdRank({ trend }: { trend?: CommunityTrend }) {
  if (!trend) return <span className="text-xs text-slate-600">—</span>
  const delta = trend.rankDelta
  const net = trend.spark[trend.spark.length - 1] - trend.spark[0]
  return (
    <div
      className="flex flex-col items-center gap-0.5 leading-none"
      title={`Community score ${trend.score} from ${trend.comparisons} comparisons${delta ? `; ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} in 7 days` : ''}`}
    >
      <span className="font-mono text-sm font-bold tabular-nums text-violet-100">
        {trend.rank ? `#${trend.rank}` : 'New'}
      </span>
      {trend.rank && delta ? (
        <span
          className={cn(
            'text-[10px] font-semibold tabular-nums',
            delta > 0 ? 'text-emerald-400' : 'text-rose-400'
          )}
        >
          {delta > 0 ? '▲' : '▼'}
          {Math.abs(delta)}
        </span>
      ) : (
        <span className="text-[10px] text-slate-500">{trend.comparisons} votes</span>
      )}
      <Spark values={trend.spark} up={Math.abs(net) < 3 ? null : net > 0} />
    </div>
  )
}
