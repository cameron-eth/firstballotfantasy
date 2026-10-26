'use client'

import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRankings } from '@/hooks/use-rankings'
import { RankingsFilters } from './RankingsFilters'
import { RankingsPagination } from './RankingsPagination'
import { RankingsTable } from './RankingsTable'

export function RankingsView() {
  const {
    loading, error, fetchedAt, format, setFormat, filters, sort, pagination, paginatedRankings, filteredAndSortedRankings,
    uniqueTiers, isDiamondTier, getRowBgColor, getTierColor, getTierDisplayName,
  } = useRankings()

  return (
    <div className="min-h-screen fb-app-surface">
      <Header />
      <main className="w-full px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-xl border border-white/[0.06] !bg-slate-800/60 shadow-none">
            <CardHeader className="!bg-transparent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg text-white sm:text-xl">Dynasty player tiers</CardTitle>
                <div role="group" aria-label="League scoring format" className="flex rounded-lg border border-slate-600 p-1">
                  {[{ value: 'sf', label: 'Superflex' }, { value: 'one_qb', label: '1 QB' }].map((option) => (
                    <button key={option.value} aria-pressed={format === option.value}
                      onClick={() => { setFormat(option.value as 'sf' | 'one_qb'); pagination.setCurrentPage(1) }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${format === option.value ? 'bg-blue-400/20 text-blue-200' : 'text-slate-400 hover:text-white'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-400">
                Global rankings. KTC anchors the model; current PPR production, fantasy ADP,
                age and NFL draft capital refine the order. Updated after the daily market snapshot.
              </p>
              {fetchedAt && <p className="text-xs text-slate-500">Tier snapshot: {new Date(fetchedAt).toUTCString()}</p>}
              <RankingsFilters filters={filters} uniqueTiers={uniqueTiers} />
            </CardHeader>
            <CardContent className="!bg-transparent">
              {error ? <p role="alert" className="py-12 text-center text-amber-200">Current tiers are unavailable. Please retry shortly.</p>
                : loading ? <p className="py-12 text-center text-slate-400">Loading tiers…</p> : (
                <>
                  <RankingsTable rankings={paginatedRankings} sort={sort}
                    isDiamondTier={isDiamondTier} getRowBgColor={getRowBgColor}
                    getTierColor={getTierColor} getTierDisplayName={getTierDisplayName} />
                  <RankingsPagination pagination={pagination}
                    totalResults={filteredAndSortedRankings.length} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
