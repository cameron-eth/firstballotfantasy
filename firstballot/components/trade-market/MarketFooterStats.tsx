interface MarketFooterStatsProps {
  tradeCount: number
  traderCount: number
  leagueSeasonCount: number
}

/** Summary line under the active tab: what was analyzed and across how many seasons. */
export function MarketFooterStats({
  tradeCount,
  traderCount,
  leagueSeasonCount,
}: MarketFooterStatsProps) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-4">
          <span>{tradeCount} trades analyzed</span>
          <span>|</span>
          <span>{traderCount} active traders</span>
                          </div>
        <div className="text-blue-400">
          {leagueSeasonCount} linked league seasons
                    </div>
                  </div>
                </div>
  )
}
