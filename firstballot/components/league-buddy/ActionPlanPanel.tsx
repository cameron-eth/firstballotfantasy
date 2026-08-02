'use client'

import { Target } from 'lucide-react'
import { COMPETITIVE_STATES, type TeamPlacement } from './competitiveState'

interface ActionPlanPanelProps {
  placement?: TeamPlacement
}

export function ActionPlanPanel({ placement }: ActionPlanPanelProps) {
  const stateMeta = placement ? COMPETITIVE_STATES[placement.state] : null

  if (!stateMeta) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Not enough roster data to generate a plan yet.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-card border ${stateMeta.border} rounded-lg overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-border ${stateMeta.bg}`}>
        <Target className={`h-4 w-4 ${stateMeta.text}`} />
        <h3 className={`${stateMeta.text} font-mono text-sm font-bold uppercase`}>
          {stateMeta.label} Action Plan
        </h3>
        <span className="text-xs text-muted-foreground ml-auto italic">{stateMeta.tagline}</span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">{stateMeta.description}</p>
        <ul className="space-y-2">
          {stateMeta.plan.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${stateMeta.bg} border ${stateMeta.border} flex-shrink-0`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
