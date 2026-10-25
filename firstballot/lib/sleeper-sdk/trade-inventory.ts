import { pickInventory, type OwnedPick } from './pick-inventory'
import type { SleeperLeague, SleeperRoster, SleeperTradedPick } from './types'
export interface TradeInventory {
  picks: OwnedPick[]
  faab: Record<number, number | null>
  dynasty: boolean
  superflex: boolean
  updatedAt: string
}
export async function loadTradeInventory(leagueId: string): Promise<TradeInventory> {
  const read = async (path: string) => {
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Could not verify current picks and FAAB.')
    return response.json()
  }
  const [league, rosters, traded, drafts]: [
    SleeperLeague,
    (SleeperRoster & { settings?: { waiver_budget_used?: number } })[],
    SleeperTradedPick[],
    { season: string; status: string }[],
  ] = await Promise.all([read(''), read('/rosters'), read('/traded_picks'), read('/drafts')])
  const dynasty = Number(league.settings?.type) === 2
  const rounds = Number(league.settings?.draft_rounds)
  const season = Number(league.season)
  if (
    !Number.isInteger(season) ||
    !Array.isArray(rosters) ||
    !Array.isArray(drafts) ||
    !Array.isArray(traded) ||
    (dynasty && (!Number.isInteger(rounds) || rounds < 1 || rounds > 20))
  )
    throw new Error('League draft configuration unavailable.')
  const first =
    season + (drafts.some((d) => Number(d.season) === season && d.status === 'complete') ? 1 : 0)
  const budget = Number(league.settings?.waiver_budget)
  return {
    picks: dynasty
      ? pickInventory(
          rosters.map((r) => r.roster_id),
          [first, first + 1, first + 2],
          rounds,
          traded
        )
      : [],
    faab: Object.fromEntries(
      rosters.map((r) => [
        r.roster_id,
        Number(league.settings?.waiver_type) === 2 &&
        Number.isFinite(budget) &&
        typeof r.settings?.waiver_budget_used === 'number'
          ? Math.max(0, budget - r.settings.waiver_budget_used)
          : null,
      ])
    ),
    dynasty,
    superflex:
      league.roster_positions?.includes('SUPER_FLEX') === true ||
      (league.roster_positions?.filter((p) => p === 'QB').length ?? 0) > 1,
    updatedAt: new Date().toISOString(),
  }
}
