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
    <section className="mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-sm md:mb-6 md:p-4" aria-label={`${title} controls`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <h2 className="font-mono text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">{title}</h2>
          {description && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{description}</p>}
        </div>
        <div className="min-w-0">{controls || children}</div>
      </div>
      {secondary && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">{secondary}</div>}
    </section>
  )
}
