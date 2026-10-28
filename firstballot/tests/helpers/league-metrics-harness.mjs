// Runs the dashboard's real data pipeline and metric functions on a fixture league and
// returns every lineage metric (docs/data-architecture/DATA_INVENTORY.md §2) as plain JSON.
// No metric is re-implemented here: the league metrics come from lib/league-metrics/compute,
// the same module /api/league/[id]/metrics runs on the server (PR-15).
import { clearPlayersMemo } from '../../components/league-buddy/leagueDataBundle.ts'
import { clearPlayoffOddsCache } from '../../components/league-buddy/utils/playoffOdds.ts'
import { leagueMetrics, loadLeagueInputs } from '../../lib/league-metrics/compute.ts'
import { suggestedTeamTrades } from '../../lib/sleeper-sdk/trade-opportunities.ts'
import { tradeSignals } from '../../lib/trade-signals.ts'
import { picksByYear, leagueCapital } from '../../lib/picks-overview.ts'

export async function computeLeagueMetrics(leagueId, apiBase = '') {
  // The players DB is memoized per module for 6 h; each league must load its own.
  clearPlayersMemo()
  // The determinism check must compare two real simulations, not a cache hit.
  clearPlayoffOddsCache()
  const inputs = await loadLeagueInputs(leagueId, apiBase)
  const { bundle, teams, slots, inventory } = inputs
  const viewer = teams.find((t) => t.rosterId === bundle.defaultSelectedRosterId) ?? teams[0]
  const superflexInventory = inventory?.superflex ?? true

  return {
    ...leagueMetrics(inputs),
    // Viewer-specific values stay out of the shared league snapshot; recorded here only.
    viewer: {
      rosterId: viewer.rosterId,
      tradeSuggestions: suggestedTeamTrades(viewer, teams, superflexInventory, []).map((s) => ({
        give: s.give.playerId,
        target: s.target.playerId,
        partner: s.team.rosterId,
        reason: s.reason,
      })),
      tradeSignals: tradeSignals(viewer, teams, slots, true).map((s) => ({
        player: s.playerId,
        kind: s.kind,
        headline: s.headline,
      })),
      picksByYear: inventory
        ? picksByYear(inventory.picks, viewer.rosterId).map((y) => ({
            season: y.season,
            owned: y.owned.map((p) => p.id),
            tradedAway: y.tradedAway.map((p) => p.id),
          }))
        : null,
    },
    leagueCapital: inventory
      ? leagueCapital(
          inventory.picks,
          teams.map((t) => t.rosterId)
        ).map((c) => ({
          rosterId: c.rosterId,
          firsts: c.firsts,
          total: c.total,
        }))
      : null,
  }
}
