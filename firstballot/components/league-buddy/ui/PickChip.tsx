import type { ReactNode } from 'react'
import { Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PICK_PINNED_TONE, PICK_PLANNED_TONE, PICK_TONE } from '@/lib/design/tones'

/**
 * A draft pick. Violet like the builder's pick rail, but told apart from a TE badge by shape
 * (chip with a ticket glyph), a softer violet, and a slot label instead of a position code.
 */
export function PickChip({
  label,
  state = 'owned',
  children,
  className,
}: {
  label: string
  state?: 'owned' | 'planned' | 'pinned'
  children?: ReactNode
  className?: string
}) {
  const tone =
    state === 'planned' ? PICK_PLANNED_TONE : state === 'pinned' ? PICK_PINNED_TONE : PICK_TONE
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold tabular-nums leading-none',
        tone,
        className
      )}
    >
      <Ticket className="size-3 shrink-0 opacity-70" aria-hidden />
      {label}
      {children && <span className="font-normal text-slate-300">{children}</span>}
    </span>
  )
}
