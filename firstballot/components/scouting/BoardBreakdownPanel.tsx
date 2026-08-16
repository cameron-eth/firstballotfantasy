'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SCOUTING_DISPLAY_TIER_ORDER,
  SCOUTING_TIER_STYLES,
} from '@/lib/scouting-grade-tier'
import { useBreakdownPanelOpen } from '@/hooks/use-breakdown-panel-open'
import type { Prospect } from './types'
import { toBoardPlayer, type BoardPlayer } from './board-player'

interface BoardBreakdownPanelProps {
  /** The user's board, already scoped to the active position tab. */
  userBoard: BoardPlayer[]
  /** Every eligible prospect for that tab, in consensus order. */
  consensusBoard: BoardPlayer[]
  allEligibleProspects: Prospect[]
  position: string
  /** Consensus rank per draft class, keyed by player name. */
  consensusRankByClassName: Map<number, Map<string, number>>
}

/**
 * The board's right-hand analytics stack: Board Breakdown, Your Biggest Takes,
 * and vs Class Average. Every figure it shows is derived from the board, so the
 * derivations live here rather than in the parent.
 */
export function BoardBreakdownPanel({
  userBoard,
  consensusBoard,
  allEligibleProspects,
  position,
  consensusRankByClassName,
}: BoardBreakdownPanelProps) {
  const { open: showBreakdown, toggle: toggleBreakdown } = useBreakdownPanelOpen()

  const boardStats = useMemo(
    () => ({
      avgGrade:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.grade, 0) / userBoard.length
          : 0,
      avgPhysical:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.physical, 0) / userBoard.length
          : 0,
      avgProduction:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.production, 0) / userBoard.length
          : 0,
      speedsters: userBoard.filter((p) => p.fortyTime && p.fortyTime < 4.45).length,
      bigBoys: userBoard.filter((p) => p.weight > 220).length,
      generational: userBoard.filter((p) => p.tier === 'Generational').length,
      blueChips: userBoard.filter((p) => p.tier === 'Blue Chip').length,
    }),
    [userBoard]
  )

  const classAverages = useMemo(() => {
    if (userBoard.length === 0) {
      return { grade: 0, physical: 0, production: 0 }
    }

    const scoped =
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position)

    const cohortAveragesByYear = new Map<
      number | null,
      { grade: number; physical: number; production: number }
    >()
    const grouped = new Map<number | null, BoardPlayer[]>()
    for (const prospect of scoped) {
      const year = prospect.draft_year ?? null
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(toBoardPlayer(prospect))
    }
    for (const [year, cohort] of grouped.entries()) {
      if (cohort.length === 0) continue
      cohortAveragesByYear.set(year, {
        grade: cohort.reduce((sum, p) => sum + p.grade, 0) / cohort.length,
        physical: cohort.reduce((sum, p) => sum + p.physical, 0) / cohort.length,
        production: cohort.reduce((sum, p) => sum + p.production, 0) / cohort.length,
      })
    }

    const perPlayerClassBaseline = userBoard
      .map((player) => cohortAveragesByYear.get(player.draftYear))
      .filter(
        (x): x is { grade: number; physical: number; production: number } => x !== undefined
      )

    if (perPlayerClassBaseline.length === 0) {
      return {
        grade:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.grade, 0) / consensusBoard.length
            : 0,
        physical:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.physical, 0) / consensusBoard.length
            : 0,
        production:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.production, 0) / consensusBoard.length
            : 0,
      }
    }

    return {
      grade:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.grade, 0) /
        perPlayerClassBaseline.length,
      physical:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.physical, 0) /
        perPlayerClassBaseline.length,
      production:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.production, 0) /
        perPlayerClassBaseline.length,
    }
  }, [consensusBoard, allEligibleProspects, position, userBoard])

  const boardConsensusDiffs = useMemo(() => {
    // Group the user's board by year so the comparison stays within a class.
    const byYear = new Map<number, BoardPlayer[]>()
    for (const p of userBoard) {
      const year = p.draftYear ?? 0
      if (!byYear.has(year)) byYear.set(year, [])
      byYear.get(year)!.push(p)
    }
    const results: { player: BoardPlayer; diff: number }[] = []
    for (const [year, players] of byYear) {
      const classNameMap = consensusRankByClassName.get(year)
      players.forEach((p, idx) => {
        const consensusRank = classNameMap?.get(p.name) ?? idx + 1
        results.push({ player: p, diff: consensusRank - (idx + 1) })
      })
    }
    return results
  }, [userBoard, consensusRankByClassName])

  const higherThanConsensus = useMemo(
    () =>
      boardConsensusDiffs
        .filter((x) => x.diff > 0)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 3),
    [boardConsensusDiffs]
  )

  const lowerThanConsensus = useMemo(
    () =>
      boardConsensusDiffs
        .filter((x) => x.diff < 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 3),
    [boardConsensusDiffs]
  )

  const classComparison = [
    { label: 'Grade', yours: boardStats.avgGrade, klass: classAverages.grade },
    { label: 'Physical', yours: boardStats.avgPhysical, klass: classAverages.physical },
    { label: 'Production', yours: boardStats.avgProduction, klass: classAverages.production },
  ]

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={toggleBreakdown}
          className="w-full p-3 lg:p-4 hover:bg-secondary/50 transition-colors text-left flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0"
        >
          <div className="flex items-center justify-between gap-2 w-full lg:w-auto lg:flex-1 lg:min-w-0">
            <h3 className="font-mono font-bold text-foreground">Board Breakdown</h3>
            {showBreakdown ? (
              <ChevronUp className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0" />
            )}
          </div>
          {userBoard.length > 0 && (
            <div className="flex flex-wrap gap-1.5 w-full lg:hidden pointer-events-none">
              <span className="inline-flex items-baseline gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-wide text-primary/80">
                  GRD
                </span>
                <span className="text-xs font-mono font-bold text-primary tabular-nums">
                  {boardStats.avgGrade.toFixed(1)}
                </span>
              </span>
              <span className="inline-flex items-baseline gap-1 rounded-md border border-border bg-secondary/70 px-2 py-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-wide text-muted-foreground">
                  PHYS
                </span>
                <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                  {boardStats.avgPhysical.toFixed(0)}
                </span>
              </span>
              <span className="inline-flex items-baseline gap-1 rounded-md border border-border bg-secondary/70 px-2 py-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-wide text-muted-foreground">
                  PROD
                </span>
                <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                  {boardStats.avgProduction.toFixed(0)}
                </span>
              </span>
            </div>
          )}
        </button>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-4">
                <div className="hidden lg:grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-secondary/50 rounded">
                    <div className="text-xl font-mono font-bold text-primary">
                      {boardStats.avgGrade.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">AVG GRADE</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded">
                    <div className="text-xl font-mono font-bold text-foreground">
                      {boardStats.avgPhysical.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">AVG PHYS</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded">
                    <div className="text-xl font-mono font-bold text-foreground">
                      {boardStats.avgProduction.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">AVG PROD</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    TIER DISTRIBUTION
                  </h4>
                  <div className="space-y-2">
                    {SCOUTING_DISPLAY_TIER_ORDER.map((tier) => {
                      const colors = SCOUTING_TIER_STYLES[tier]
                      const count = userBoard.filter((p) => p.tier === tier).length
                      const pct = userBoard.length > 0 ? (count / userBoard.length) * 100 : 0
                      return (
                        <div key={tier} className="flex items-center gap-2">
                          <span className={cn('text-xs w-24 shrink-0 truncate', colors.text)}>
                            {tier}
                          </span>
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              className={cn('h-full rounded-full', colors.bg.replace('/20', '/60'))}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-6">
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">PLAYER TYPES</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-sm font-mono font-bold">{boardStats.speedsters}</div>
                        <div className="text-[9px] text-muted-foreground">Speedsters</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                      <Scale className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-sm font-mono font-bold">{boardStats.bigBoys}</div>
                        <div className="text-[9px] text-muted-foreground">
                          {'Big Boys (>220)'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                      <Target className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-sm font-mono font-bold">{boardStats.generational}</div>
                        <div className="text-[9px] text-muted-foreground">Generational</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-sm font-mono font-bold">{boardStats.blueChips}</div>
                        <div className="text-[9px] text-muted-foreground">Blue Chips</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono font-bold text-foreground mb-3">Your Biggest Takes</h3>
        <div className="mb-4">
          <h4 className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> HIGHER THAN CONSENSUS
          </h4>
          <div className="space-y-1">
            {higherThanConsensus.map(({ player, diff }) => (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">{player.name}</span>
                <span className="text-emerald-400 font-mono">+{diff}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs text-rose-400 font-medium mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> LOWER THAN CONSENSUS
          </h4>
          <div className="space-y-1">
            {lowerThanConsensus.map(({ player, diff }) => (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">{player.name}</span>
                <span className="text-rose-400 font-mono">{diff}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono font-bold text-foreground mb-3">vs Class Average</h3>
        <div className="space-y-3">
          {classComparison.map((stat) => {
            const diff = stat.yours - stat.klass
            return (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{stat.yours.toFixed(1)}</span>
                  <span
                    className={cn(
                      'text-xs font-mono',
                      diff > 0
                        ? 'text-emerald-400'
                        : diff < 0
                          ? 'text-rose-400'
                          : 'text-muted-foreground'
                    )}
                  >
                    ({diff > 0 ? '+' : ''}
                    {diff.toFixed(1)})
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
