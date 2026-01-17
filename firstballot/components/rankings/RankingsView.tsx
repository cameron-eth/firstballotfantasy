'use client'

import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRankings } from '@/hooks/use-rankings'
import { RankingsFilters } from './RankingsFilters'
import { RankingsTable } from './RankingsTable'
import { RankingsPagination } from './RankingsPagination'
import { getTierIcon } from './tierUtils'

export function RankingsView() {
  const {
    loading,
    filters,
    sort,
    pagination,
    paginatedRankings,
    filteredAndSortedRankings,
    uniqueTiers,
    isDiamondTier,
    getRowBgColor,
    getTierColor,
    getTierDisplayName,
  } = useRankings()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Card className="!bg-gradient-to-br !from-slate-800 !via-slate-800 !to-yellow-950/20 border border-yellow-500/30 rounded-xl shadow-none">
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
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading rankings...</p>
                </div>
              ) : (
                <>
                  <RankingsTable
                    rankings={paginatedRankings}
                    sort={sort}
                    isDiamondTier={isDiamondTier}
                    getRowBgColor={getRowBgColor}
                    getTierColor={getTierColor}
                    getTierDisplayName={getTierDisplayName}
                  />
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
