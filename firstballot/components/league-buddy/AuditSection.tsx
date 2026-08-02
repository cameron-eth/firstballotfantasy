'use client'

import { StatManagementPanel } from './StatManagementPanel'
import { ActionPlanPanel } from './ActionPlanPanel'
import type { RosterPositions } from './utils'
import type { TeamData } from './types'
import type { LeaguePlacements, TeamPlacement } from './competitiveState'

interface AuditSectionProps {
  selectedTeam: TeamData
  teams: TeamData[]
  rosterPositions: RosterPositions
  currentWeek: number
  placement?: TeamPlacement
  placements: LeaguePlacements
}

export function AuditSection({
  selectedTeam,
  teams,
  rosterPositions,
  currentWeek,
  placement,
  placements,
}: AuditSectionProps) {
  return (
    <div className="space-y-4">
      <StatManagementPanel
        team={selectedTeam}
        teams={teams}
        placements={placements}
        rosterPositions={rosterPositions}
        currentWeek={currentWeek}
      />
      <ActionPlanPanel placement={placement} />
    </div>
  )
}
