'use client'

import { useMemo } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRankings } from '@/hooks/use-rankings'
import { RankingsFilters } from './RankingsFilters'
import { RankingsPagination } from './RankingsPagination'
import { PlayerCard } from '@/components/prospect-board/player-card'
import { SkeletonGrid } from '@/components/prospect-board/player-skeleton'
import type { Player, Position } from '@/lib/players'
import type { PlayerRanking } from '@/types/rankings'

function normalizeTier(grade: number, position: string, posRank: number): string {
  if (grade >= 90) return 'Elite'
  return `${position}${posRank}`
}

function toCardPosition(position: string): Position {
  if (position === 'QB' || position === 'RB' || position === 'WR' || position === 'TE') {
    return position
  }
  return 'WR'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function RankingsView() {
  const {
    loading,
    filters,
    pagination,
    paginatedRankings,
    filteredAndSortedRankings,
    uniqueTiers,
  } = useRankings()

  const positionRankByPlayerKey = useMemo(() => {
    const positionCounters = new Map<string, number>()
    const rankMap = new Map<string, number>()

    filteredAndSortedRankings.forEach((player) => {
      const pos = toCardPosition(player.position)
      const next = (positionCounters.get(pos) || 0) + 1
      positionCounters.set(pos, next)
      rankMap.set(`${player.player_name}__${pos}`, next)
    })

    return rankMap
  }, [filteredAndSortedRankings])

  const rankingsForCards = useMemo<Player[]>(() => {
    if (!filteredAndSortedRankings.length) return []

    const totalScores = filteredAndSortedRankings.map((p) => p.total_score)
    const minScore = Math.min(...totalScores)
    const maxScore = Math.max(...totalScores)
    const scoreRange = Math.max(maxScore - minScore, 1)

    return paginatedRankings.map((player) => {
      const normalizedGrade = 72 + ((player.total_score - minScore) / scoreRange) * 26
      // Sub-scores are raw weighted values (e.g. recent_form max = 4700, not 100).
      // Normalize each by its known max so the averaged result is on a 0–100 scale.
      const production =
        (((player.recent_form_score ?? 0) / 4700) * 100 +
          ((player.volume_score ?? 0) / 1400) * 100 +
          ((player.versatility_score ?? 0) / 500) * 100) /
        3
      const physical =
        (((player.draft_capital_score ?? 0) / 1200) * 100 +
          ((player.epa_efficiency_score ?? 0) / 500) * 100 +
          ((player.td_efficiency_score ?? 0) / 1300) * 100) /
        3
      const position = toCardPosition(player.position)
      const playerKey = `${player.player_name}__${position}`
      const posRank = positionRankByPlayerKey.get(playerKey) ?? player.rank
      const draftClass = player.draft_year ?? player.draft_class ?? null
      const grade = clamp(normalizedGrade, 70, 99.9)

      return {
        id: player.rank,
        rank: posRank,
        name: player.player_name,
        position,
        school: `${player.team} • Age ${player.age}`,
        espnId: player.espn_id ? Number(player.espn_id) : null,
        tier: normalizeTier(grade, position, posRank),
        grade,
        height: '',
        weight: null,
        fortyTime: null,
        production: clamp(production || 0, 0, 100),
        physical: clamp(physical || 0, 0, 100),
        valuation: player.total_score,
        year: draftClass,
        isCollege: false,
        headshotUrl: player.headshot_url || null,
      }
    })
  }, [filteredAndSortedRankings, paginatedRankings, positionRankByPlayerKey])

  return (
    <div className="min-h-screen fb-app-surface">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Card className="!bg-slate-800/60 border border-white/[0.06] rounded-xl shadow-none">
            <CardHeader className="!bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-white text-lg sm:text-xl font-mono">
                  Player Rankings
                </CardTitle>
              </div>

              <RankingsFilters filters={filters} uniqueTiers={uniqueTiers} />
            </CardHeader>

            <CardContent className="!bg-transparent">
              {loading ? (
                <SkeletonGrid count={10} />
              ) : (
                <>
                  {rankingsForCards.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {rankingsForCards.map((player, index) => (
                        <PlayerCard
                          key={`${player.id}-${player.position}`}
                          player={player}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      No players found matching your filters.
                    </div>
                  )}
                  <RankingsPagination
                    pagination={pagination}
                    totalResults={filteredAndSortedRankings.length}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
