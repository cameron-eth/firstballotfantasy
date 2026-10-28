import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The one section header (docs/design-system/DESIGN_SYSTEM.md §2, `section-title`).
 * Sentence case, sans, no eyebrow label; actions sit on the right and wrap under on phones.
 */
export function SectionHeader({
  title,
  subtitle,
  actions,
  as: Heading = 'h2',
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <Heading className="text-base font-semibold text-white">{title}</Heading>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
