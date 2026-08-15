'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { CORE_POSITIONS, ordinal, type CorePosition, type PowerRankings } from '@/lib/sleeper-sdk'
import type { TeamData } from '../types'
import { RankBarList, type RankBarRow } from './RankBarList'
import { PositionStrengthRadar, type RadarPoint } from './PositionStrengthRadar'
import { StartingLineupChart } from './StartingLineupChart'

interface PowerRankingsViewProps {
  rankings: PowerRankings
  selectedTeam: TeamData | null
  leagueSize: number
}

const CATEGORY_LABELS: Record<string, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  FLEX: 'FLEX',
  SFLX: 'SFLX',
  STARTERS: 'START',
  BENCH: 'BENCH',
}

/**
 * The power-rankings board: one league-wide leaderboard plus four readouts of the
 * selected roster — positional strength, slot-by-slot strength, starters against bench,
 * and the starting lineup itself. Every number is derived in the browser from the Sleeper
 * roster data already in memory (see lib/sleeper-sdk/values.ts).
 */
export function PowerRankingsView({
  rankings,
  selectedTeam,
  leagueSize,
}: PowerRankingsViewProps) {
  const selectedEntry = useMemo(
    () => rankings.teams.find((entry) => entry.rosterId === selectedTeam?.rosterId) ?? null,
    [rankings, selectedTeam?.rosterId]
  )

  const positionalRows = useMemo<RankBarRow[]>(() => {
    if (!selectedEntry) return []
    const ranks = rankings.categoryRanks[selectedEntry.rosterId] ?? {}
    const rows: RankBarRow[] = []
    for (const category of rankings.categories) {
      const ranked = ranks[category]
      if (!ranked) continue
      rows.push({
        key: category,
        label: CATEGORY_LABELS[category] ?? category,
        share: ranked.share,
        rank: ranked.rank,
      })
    }
    return rows.sort((a, b) => a.rank - b.rank)
  }, [rankings, selectedEntry])

  const starterRows = useMemo<RankBarRow[]>(() => {
    if (!selectedEntry) return []
    const ranks = rankings.slotRanks[selectedEntry.rosterId] ?? {}
    return selectedEntry.valuation.slots.map((slot) => ({
      key: slot.id,
      label: slot.label,
      sublabel: slot.player?.playerName,
      share: ranks[slot.id]?.share ?? 0,
      rank: ranks[slot.id]?.rank ?? leagueSize,
    }))
  }, [rankings, selectedEntry, leagueSize])

  const radarData = useMemo<RadarPoint[]>(() => {
    if (!selectedEntry) return []
    // Starters and bench share a denominator per position so the two shapes stay
    // comparable — a wide bench shape really does mean more value sitting than starting.
    return CORE_POSITIONS.map((position: CorePosition) => {
      const leagueMax = Math.max(
        1,
        ...rankings.teams.map((entry) =>
          Math.max(
            entry.valuation.positionValues[position],
            entry.valuation.benchPositionValues[position]
          )
        )
      )
      return {
        position,
        starters: Math.round((selectedEntry.valuation.positionValues[position] / leagueMax) * 100),
        bench: Math.round((selectedEntry.valuation.benchPositionValues[position] / leagueMax) * 100),
      }
    })
  }, [rankings, selectedEntry])

  if (leagueSize === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-12 text-center text-slate-400">
          No rosters available for this league yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
          <BarChart3 className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-yellow-400 font-mono uppercase tracking-wider">
            Power Rankings
          </h2>
          <p className="text-xs text-slate-400">
            {rankings.superflex ? 'Superflex' : '1QB'} dynasty values ·{' '}
            {selectedEntry
              ? `${selectedTeam?.teamName} ranks ${ordinal(selectedEntry.rank)} of ${leagueSize}`
              : `${leagueSize} teams`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-200 uppercase tracking-wider">
              Positional Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankBarList
              rows={positionalRows}
              leagueSize={leagueSize}
              labelHeader="Pos"
              emptyMessage="Select a team to see its positional ranks"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-200 uppercase tracking-wider">
              Starter Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankBarList
              rows={starterRows}
              leagueSize={leagueSize}
              labelHeader="Slot"
              emptyMessage="Select a team to see its starter ranks"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-200 uppercase tracking-wider">
              Position Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PositionStrengthRadar data={radarData} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-200 uppercase tracking-wider">
              Starting Lineup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEntry ? (
              <StartingLineupChart
                slots={selectedEntry.valuation.slots}
                slotRanks={rankings.slotRanks[selectedEntry.rosterId] ?? {}}
                leagueSize={leagueSize}
              />
            ) : (
              <p className="text-sm text-slate-400 py-10 text-center">
                Select a team to see its lineup
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
