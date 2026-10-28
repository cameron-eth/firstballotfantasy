import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * One metric: sentence-case label, a tabular `metric` number, and an optional delta or detail.
 * Tone colors the value only when the number carries meaning (value, production, rank).
 */
export function StatTile({
  label,
  value,
  detail,
  valueClassName,
  className,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  valueClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border border-line/60 bg-surface/40 px-3 py-2.5',
        className
      )}
    >
      <div className="truncate text-xs text-slate-400">{label}</div>
      <div
        className={cn(
          'mt-1 truncate text-base font-semibold tabular-nums text-white',
          valueClassName
        )}
      >
        {value}
      </div>
      {detail && <div className="mt-0.5 truncate text-2xs text-slate-500">{detail}</div>}
    </div>
  )
}
