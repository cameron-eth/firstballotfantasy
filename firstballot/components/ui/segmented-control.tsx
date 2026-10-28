'use client'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Pill toggle group in the dashboard tab style; the active option uses the action tint. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line/60 bg-surface/40 p-1',
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-action',
            value === o.value
              ? 'bg-action/15 text-blue-100'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
