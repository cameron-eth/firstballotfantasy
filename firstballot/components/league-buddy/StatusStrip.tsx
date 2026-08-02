'use client'

import { useMemo } from 'react'
import { AlertTriangle, LayersIcon, Siren, CheckCircle2 } from 'lucide-react'
import {
  calculateInjuryExposure,
  calculatePositionDepthGaps,
  calculateRiskFactor,
  type RosterPositions,
} from './utils'
import type { TeamData } from './types'

interface StatusItem {
  icon: typeof AlertTriangle
  color: string
  text: string
}

interface StatusStripProps {
  team: TeamData
  rosterPositions: RosterPositions
  currentWeek: number
  onGoToAudit: () => void
}

export function StatusStrip({
  team,
  rosterPositions,
  currentWeek,
  onGoToAudit,
}: StatusStripProps) {
  const injuryExposure = useMemo(
    () => calculateInjuryExposure(team.players, team.starters),
    [team.players, team.starters]
  )

  const criticalPositions = useMemo(
    () =>
      calculatePositionDepthGaps(team.players, rosterPositions)
        .filter((g) => g.severity === 'critical')
        .map((g) => g.position),
    [team.players, rosterPositions]
  )

  const risk = useMemo(() => calculateRiskFactor(team, currentWeek), [team, currentWeek])

  const items: StatusItem[] = [
    injuryExposure.injuredStarterCount > 0 && {
      icon: AlertTriangle,
      color: 'text-red-400',
      text: `${injuryExposure.injuredStarterCount} injured starter${injuryExposure.injuredStarterCount > 1 ? 's' : ''}`,
    },
    criticalPositions.length > 0 && {
      icon: LayersIcon,
      color: 'text-yellow-400',
      text: `thin at ${criticalPositions.join(', ')}`,
    },
    risk.label === 'high' && {
      icon: Siren,
      color: 'text-red-400',
      text: `high risk roster (${risk.score})`,
    },
  ].filter((x): x is StatusItem => Boolean(x))

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-emerald-400 font-mono">
          All clear — no action items right now.
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onGoToAudit}
      className="w-full flex flex-wrap items-center gap-4 rounded-lg border border-yellow-400/30 bg-yellow-400/5 px-4 py-2.5 mb-4 text-left hover:border-yellow-400/50 transition-colors"
    >
      <span className="text-[10px] font-mono uppercase text-yellow-400/70 font-semibold flex-shrink-0">
        Needs Attention
      </span>
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <span key={i} className={`flex items-center gap-1.5 text-sm ${item.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {item.text}
          </span>
        )
      })}
      <span className="text-muted-foreground text-xs ml-auto font-mono">View in Audit →</span>
    </button>
  )
}
