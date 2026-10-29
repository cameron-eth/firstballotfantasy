import type { ReactNode } from 'react'
import { Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PICK_PINNED_TONE, PICK_PLANNED_TONE, PICK_TONE, pickRoundTone } from '@/lib/design/tones'

/**
 * A draft pick. Violet like the builder's pick rail, but told apart from a TE badge by shape
 * (chip with a ticket glyph), a softer violet, and a slot label instead of a position code.
 * With `round`, an owned pick's strength shows its value: firsts brightest, later rounds neutral.
 * Rounded like the section cards it sits in.
 */
export function PickChip({
  label,
  state = 'owned',
  round,
  children,
  className,
}: {
  label: string
  state?: 'owned' | 'planned' | 'pinned'
  round?: number
  children?: ReactNode
  className?: string
}) {
  const tone =
    state === 'planned'
      ? PICK_PLANNED_TONE
      : state === 'pinned'
        ? PICK_PINNED_TONE
        : round != null
          ? pickRoundTone(round)
          : PICK_TONE
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-xs font-semibold tabular-nums leading-none',
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
