'use client'

import type { ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

/** App-styled hover/focus tooltip: same slate panel language as the planning drawer. */
export function AppTooltip({
  content,
  children,
  side = 'bottom',
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={100} skipDelayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={12}
            className="z-50 max-w-[260px] rounded-xl border border-blue-300/30 bg-slate-950/95 px-3 py-2 text-xs leading-relaxed text-slate-300 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-950" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
