'use client'

import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity } from 'lucide-react'
import { Header } from '@/components/header'
import { leagueCache } from '@/lib/league-cache'
import { useLeagueContext } from '@/lib/league-context'
import { processPlayerForTrade, type PlayerValue } from '@/lib/trade-utils'
import { computeTradeAnalytics } from '@/components/trade-market/analytics'
import {
  INITIAL_MARKET_FILTERS,
  collectSeasonOptions,
  filterTrades,
  marketFiltersReducer,
} from '@/components/trade-market/filters'
import type { MarketTab } from '@/components/trade-market/types'
import { MarketErrorState } from '@/components/trade-market/MarketErrorState'
import { MarketFooterStats } from '@/components/trade-market/MarketFooterStats'
import { MarketHeaderBar } from '@/components/trade-market/MarketHeaderBar'
import { MarketLeaguePrompt } from '@/components/trade-market/MarketLeaguePrompt'
import { MarketOverviewTab } from '@/components/trade-market/MarketOverviewTab'
import { MarketTabs } from '@/components/trade-market/MarketTabs'
import { MarketTrendsTab } from '@/components/trade-market/MarketTrendsTab'

interface TradeMarketData {
  teams: { rosterId: number; ownerName: string }[]
  teamsByLeague: Record<string, { rosterId: number }[]>
  leagueHistory: { leagueId: string; season: string }[]
  allPlayers: Record<string, any>
  transactions: any[]
  dynastyRankings: Record<string, any>
}

async function fetchTradeMarket(url: string): Promise<TradeMarketData> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch trade market data: ${response.status} ${text}`)
  }
  const result = await response.json()
  if (!result.success) throw new Error(result.error || 'Failed to fetch trade market data')
  return result.data as TradeMarketData
}

/**
 * Container for the trade market: resolves the league, fetches the data once, owns the
 * filter and tab state, and derives the analytics every section reads. All rendering
 * lives in components/trade-market.
 */
function TradeMarketContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedLeagueId, isLoading: contextLoading } = useLeagueContext()
  const [leagueId, setLeagueId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<MarketTab>('overview')
  const [filters, dispatchFilter] = useReducer(marketFiltersReducer, INITIAL_MARKET_FILTERS)

  const {
    data: tradeData,
    isLoading: loading,
    error: fetchError,
  } = useSWR(leagueId ? `/api/trade-market?leagueId=${leagueId}` : null, fetchTradeMarket)

  const error: string | null = fetchError?.message ?? null
  const teams = tradeData?.teams ?? []
  const teamsByLeague = tradeData?.teamsByLeague ?? {}
  const leagueHistory = tradeData?.leagueHistory ?? []
  const allPlayers = tradeData?.allPlayers ?? {}
  const transactions = tradeData?.transactions ?? []
  const dynastyRankings = tradeData?.dynastyRankings ?? {}

  const getTeamMeta = useCallback(
    (leagueIdFromTrade: string | undefined, rosterId: number) => {
      const scoped = leagueIdFromTrade ? teamsByLeague[leagueIdFromTrade] || [] : teams
      return (
        scoped.find((t: any) => t.rosterId === rosterId) ||
        teams.find((t: any) => t.rosterId === rosterId)
      )
    },
    [teamsByLeague, teams]
  )

  // Resolve leagueId from context, URL, or cache
  useEffect(() => {
    if (selectedLeagueId) {
      setLeagueId(selectedLeagueId)
      return
    }
    if (contextLoading) return
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
      setLeagueId(urlLeagueId)
      return
    }
    const cachedLeagueId = leagueCache.getLeagueId()
    if (cachedLeagueId) {
      setLeagueId(cachedLeagueId)
    }
  }, [selectedLeagueId, contextLoading, searchParams])

  const noLeagueId = !leagueId && !contextLoading

  const filteredTransactions = useMemo(
    () => filterTrades(transactions, filters),
    [transactions, filters]
  )

  const seasonOptions = useMemo(
    () => collectSeasonOptions(transactions, leagueHistory),
    [transactions, leagueHistory]
  )

  // One valuation pass shared by every section that prices a player.
  const playerValuationCache = useMemo(() => {
    const cache = new Map<string, PlayerValue>()
    const playerIds = new Set<string>()
    for (const tx of filteredTransactions) {
      for (const pid of Object.keys(tx.adds || {})) playerIds.add(pid)
      for (const pid of Object.keys(tx.drops || {})) playerIds.add(pid)
    }
    for (const pid of playerIds) {
      const pv = processPlayerForTrade(pid, allPlayers, dynastyRankings)
      if (pv) cache.set(pid, pv)
    }
    return cache
  }, [filteredTransactions, allPlayers, dynastyRankings])

  const {
    rosterKPIs,
    counterpartyPairs,
    topBuyLows,
    topSellHighs,
    velocity,
    mostTradedPlayers,
    pnlSeries,
  } = useMemo(
    () =>
      computeTradeAnalytics(
        filteredTransactions,
        allPlayers,
        dynastyRankings,
        getTeamMeta,
        playerValuationCache
      ),
    [filteredTransactions, allPlayers, dynastyRankings, getTeamMeta, playerValuationCache]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-blue-400 animate-pulse mx-auto mb-4" />
          <div className="font-mono text-sm text-muted-foreground">Loading market data...</div>
        </div>
      </div>
    )
  }

  if (noLeagueId) {
    return (
      <MarketLeaguePrompt
        onSubmit={(nextLeagueId) => {
          setLeagueId(nextLeagueId)
          leagueCache.setLeagueId(nextLeagueId)
        }}
        onBack={() => router.back()}
      />
    )
  }

  if (error) {
    return <MarketErrorState message={error} onBack={() => router.back()} />
  }

  return (
    <main className="min-h-screen fb-app-surface">
      <Header />

      <MarketHeaderBar
        filters={filters}
        onChange={(key, value) => dispatchFilter({ type: 'set', key, value })}
        seasonOptions={seasonOptions}
        teams={teams}
        tradeCount={filteredTransactions.length}
        onBack={() => router.push(`/league-buddy?leagueId=${leagueId}`)}
      />

      <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <MarketOverviewTab
            rosterKPIs={rosterKPIs}
            topBuyLows={topBuyLows}
            topSellHighs={topSellHighs}
            allPlayers={allPlayers}
            dynastyRankings={dynastyRankings}
            valuationCache={playerValuationCache}
            velocity={velocity}
          />
        )}
        {activeTab === 'trends' && (
          <MarketTrendsTab
            mostTradedPlayers={mostTradedPlayers}
            pnlSeries={pnlSeries}
            counterpartyPairs={counterpartyPairs}
            rosterKPIs={rosterKPIs}
            totalTrades={filteredTransactions.length}
            allPlayers={allPlayers}
            dynastyRankings={dynastyRankings}
          />
        )}

        <MarketFooterStats
          tradeCount={filteredTransactions.length}
          traderCount={rosterKPIs.length}
          leagueSeasonCount={leagueHistory.length}
        />
      </div>
    </main>
  )
}

export default function TradeMarketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground font-mono">Loading trade market...</div>
        </div>
      }
    >
      <TradeMarketContent />
    </Suspense>
  )
}
