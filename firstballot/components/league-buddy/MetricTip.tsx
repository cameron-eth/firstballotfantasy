'use client'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
export function MetricTip({
  label,
  children,
  icon,
}: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex items-center gap-1 text-inherit"
          >
            {icon}
            <span>{label}</span>
            <Info className="h-3 w-3 opacity-60" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs font-normal normal-case leading-relaxed tracking-normal">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
