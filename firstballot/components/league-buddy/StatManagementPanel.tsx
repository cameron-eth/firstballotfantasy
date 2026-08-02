'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { Activity, AlertTriangle, ShieldAlert, Scale, Siren } from 'lucide-react'
import {
  calculatePositionDepthGaps,
  calculateInjuryExposure,
  calculateTransactionActivity,
  calculateProductionVsValue,
  calculateRiskFactor,
  type RosterPositions,
} from './utils'
import type { TeamData } from './types'
import type { LeaguePlacements } from './competitiveState'

const SIGNAL_STYLE: Record<string, string> = {
  underperforming: 'text-red-400',
  overperforming: 'text-yellow-400',
  aligned: 'text-emerald-400',
}

const SIGNAL_LABEL: Record<string, string> = {
  underperforming: 'Underperforming',
  overperforming: 'Overperforming',
  aligned: 'Aligned',
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/40',
  thin: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40',
  healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
}

const RISK_STYLE: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-yellow-400',
  high: 'text-red-400',
}

const ACTIVITY_LABEL: Record<string, string> = {
  inactive: 'Inactive',
  moderate: 'Moderate',
  active: 'Active',
  hyperactive: 'Hyperactive',
}

const RISK_STYLE_LABEL: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-yellow-400',
  high: 'text-red-400',
}

function healthScoreColor(score: number): string {
  if (score >= 150) return 'text-emerald-400'
  if (score >= 100) return 'text-yellow-400'
  return 'text-red-400'
}

interface StatManagementPanelProps {
  team: TeamData
  teams: TeamData[]
  placements: LeaguePlacements
  rosterPositions: RosterPositions
  currentWeek: number
}

export function StatManagementPanel({
  team,
  teams,
  placements,
  rosterPositions,
  currentWeek,
}: StatManagementPanelProps) {
  const depthGaps = useMemo(
    () => calculatePositionDepthGaps(team.players, rosterPositions),
    [team.players, rosterPositions]
  )
  const injuryExposure = useMemo(
    () => calculateInjuryExposure(team.players, team.starters),
    [team.players, team.starters]
  )
  const activity = useMemo(
    () => calculateTransactionActivity(team.transactions, currentWeek),
    [team.transactions, currentWeek]
  )
  const byeThisWeek = useMemo(() => team.players.filter((p) => p.isOnBye), [team.players])
  const productionVsValue = useMemo(
    () => calculateProductionVsValue(team.rosterId, teams, placements),
    [team.rosterId, teams, placements]
  )
  const risk = useMemo(() => calculateRiskFactor(team, currentWeek), [team, currentWeek])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Activity className="h-4 w-4 text-orange-400" />
        <h3 className="text-orange-400 font-mono text-sm font-bold uppercase">Stat Management</h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Activity + waiver tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-secondary/10 border-border">
            <CardContent className="p-3">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Waiver Position
              </div>
              <div className="text-foreground text-xl font-bold font-mono">
                {team.waiverPosition || '—'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/10 border-border">
            <CardContent className="p-3">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Total Moves
              </div>
              <div className="text-foreground text-xl font-bold font-mono">
                {activity.totalMoves}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/10 border-border">
            <CardContent className="p-3">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Last 4 Weeks
              </div>
              <div className="text-foreground text-xl font-bold font-mono">
                {activity.last4WeeksMoves}
                <span className="text-muted-foreground text-xs font-normal ml-1">
                  {ACTIVITY_LABEL[activity.activityLevel]}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/10 border-border">
            <CardContent className="p-3">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                On Bye This Week
              </div>
              <div className="text-foreground text-xl font-bold font-mono">{byeThisWeek.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Production vs. value */}
        {productionVsValue && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale className={`h-3.5 w-3.5 ${SIGNAL_STYLE[productionVsValue.signal]}`} />
              <div className="text-[10px] font-mono uppercase text-muted-foreground">
                Production vs. Value
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 border ${SIGNAL_STYLE[productionVsValue.signal]} border-current/40 ml-auto`}
              >
                {SIGNAL_LABEL[productionVsValue.signal]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="rounded-md border border-border p-3 bg-secondary/10">
                <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                  Value Rank
                </div>
                <div className="text-foreground text-lg font-bold font-mono">
                  #{productionVsValue.valueRank}
                </div>
              </div>
              <div className="rounded-md border border-border p-3 bg-secondary/10">
                <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                  Production Rank
                </div>
                <div className="text-foreground text-lg font-bold font-mono">
                  #{productionVsValue.productionRank}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {productionVsValue.signal === 'underperforming' &&
                "Your roster is more talented than your points scored suggest — talent isn't translating to production yet."}
              {productionVsValue.signal === 'overperforming' &&
                'Your points scored are outrunning your roster talent — a strong sign, but watch for regression toward the mean.'}
              {productionVsValue.signal === 'aligned' &&
                'Your production matches your roster talent — no red flags here.'}
            </p>
          </div>
        )}

        {/* Position health */}
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
            Position Health
            <span className="ml-2 normal-case opacity-60">
              100 = exactly enough available starters
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {depthGaps.map((gap) => (
              <div
                key={gap.position}
                className={`rounded-md border p-3 ${SEVERITY_STYLE[gap.severity]}`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{gap.position}</span>
                  <span
                    className={`font-mono text-xl font-black tabular-nums ${healthScoreColor(gap.healthScore)}`}
                  >
                    {gap.healthScore}
                  </span>
                </div>
                <div className="text-xs font-mono">
                  {gap.availableCount}/{gap.rosteredCount} available
                </div>
                <div className="text-[10px] opacity-70">needs {gap.startersNeeded} to start</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk factor */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Siren className={`h-3.5 w-3.5 ${RISK_STYLE_LABEL[risk.label]}`} />
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Risk Factor</div>
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 border ${RISK_STYLE_LABEL[risk.label]} border-current/40 ml-auto`}
            >
              {risk.label} risk
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border p-3 bg-secondary/10">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Overall
              </div>
              <div className={`text-2xl font-black font-mono ${RISK_STYLE_LABEL[risk.label]}`}>
                {risk.score}
              </div>
            </div>
            <div className="rounded-md border border-border p-3 bg-secondary/10">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Aging Core
              </div>
              <div className="text-foreground text-lg font-bold font-mono">
                {risk.ageRiskScore}
              </div>
              <div className="text-muted-foreground/60 text-[9px]">past peak window</div>
            </div>
            <div className="rounded-md border border-border p-3 bg-secondary/10">
              <div className="text-muted-foreground text-[10px] font-mono uppercase mb-1">
                Injury
              </div>
              <div className="text-foreground text-lg font-bold font-mono">
                {risk.injuryRiskScore}
              </div>
              <div className="text-muted-foreground/60 text-[9px]">current + durability</div>
            </div>
          </div>
        </div>

        {/* Injury exposure */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className={`h-3.5 w-3.5 ${RISK_STYLE[injuryExposure.riskLevel]}`} />
            <div className="text-[10px] font-mono uppercase text-muted-foreground">
              Injury Exposure
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 border ${RISK_STYLE[injuryExposure.riskLevel]} border-current/40 ml-auto`}
            >
              {injuryExposure.riskLevel} risk
            </Badge>
          </div>
          {injuryExposure.players.length === 0 ? (
            <p className="text-xs text-muted-foreground">No injury concerns on this roster.</p>
          ) : (
            <div className="space-y-1.5">
              {injuryExposure.players.map((player) => (
                <div key={player.playerId} className="flex items-center gap-2">
                  <PlayerHeadshot
                    headshotUrl={player.headshot_url}
                    espnId={player.espn_id}
                    playerName={player.playerName}
                    size={24}
                  />
                  <span className="text-xs text-foreground flex-1 truncate">{player.playerName}</span>
                  <span className="text-[10px] text-muted-foreground">{player.position}</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-500/40 text-orange-400">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                    {player.injury_status || 'Injured'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
