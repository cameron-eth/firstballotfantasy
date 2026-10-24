import type { ReactNode } from 'react'

interface ScoutingSectionHeaderProps {
  title: string
  description?: string
  controls?: ReactNode
  children?: ReactNode
  secondary?: ReactNode
}

export function ScoutingSectionHeader({ title, description, controls, children, secondary }: ScoutingSectionHeaderProps) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-card/80 px-3 py-2.5 md:px-4" aria-label={`${title} controls`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="min-w-0 lg:max-w-[65%]">{controls || children}</div>
      </div>
      {secondary && <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">{secondary}</div>}
    </section>
  )
}
