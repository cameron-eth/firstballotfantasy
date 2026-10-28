// Runs the dashboard's real data pipeline and metric functions on a fixture league and
// returns every lineage metric (docs/data-architecture/DATA_INVENTORY.md §2) as plain JSON.
// No metric is re-implemented here: each value comes from the production function.
import {
  fetchLeagueDataBundle,
  fetchKtcMaps,
  applyKtc,
  withTeamScores,
  ktcNamesFor,
  clearPlayersMemo,
} from '../../components/league-buddy/useLeagueData.ts'
import { fetchDraftOrderBundle } from '../../components/league-buddy/draft-order/useDraftOrder.ts'
import { fetchStandingsSettings } from '../../components/league-buddy/useStandingsOdds.ts'
import { projectLeagueMaxPointsFor } from '../../components/league-buddy/draft-order/projectedMaxPointsFor.ts'
import { buildDraftOrder } from '../../components/league-buddy/draft-order/draftOrderBoard.ts'
import {
  calculatePlayoffOdds,
  clearPlayoffOddsCache,
} from '../../components/league-buddy/utils/playoffOdds.ts'
import {
  calculateLeaguePositionRankings,
  recordOrder,
} from '../../components/league-buddy/utils.ts'
import { calculateLeaguePlacements } from '../../components/league-buddy/competitiveState.ts'
import { buildPowerRankings } from '../../lib/sleeper-sdk/values.ts'
import { leagueTeamValues } from '../../lib/league-metrics/team-value.ts'
import { draftSlots } from '../../lib/league-metrics/draft-slots.ts'
import { suggestedTeamTrades } from '../../lib/sleeper-sdk/trade-opportunities.ts'
import { tradeSignals } from '../../lib/trade-signals.ts'
import { picksByYear, leagueCapital } from '../../lib/picks-overview.ts'

const r = (n, places = 4) => (Number.isFinite(n) ? Number(n.toFixed(places)) : (n ?? null))

export async function computeLeagueMetrics(leagueId) {
  // The players DB is memoized per module for 6 h; each league must load its own.
  clearPlayersMemo()
  // The determinism check below must compare two real simulations, not a cache hit.
  clearPlayoffOddsCache()
  const bundle = await fetchLeagueDataBundle(leagueId, null, 0)
  const ktc = await fetchKtcMaps(ktcNamesFor(bundle.teams), 0)
  const ctx = bundle.leagueContext
  const teams = withTeamScores(applyKtc(bundle.teams, ktc), ctx)
  const slots = bundle.rosterPositionsRaw
  const positions = Object.fromEntries(
    Object.entries(bundle.allPlayers).flatMap(([id, p]) => (p?.position ? [[id, p.position]] : []))
  )
  const draft = await fetchDraftOrderBundle(leagueId, slots, positions)
  const seasonProjections =
    (await (await fetch(`/api/projections?leagueId=${leagueId}`)).json()).points ?? {}
  const projection = projectLeagueMaxPointsFor(teams, seasonProjections, slots, draft)
  const inventoryResponse = await fetch(`/api/trade-inventory?leagueId=${leagueId}`)
  const inventory = inventoryResponse.ok ? await inventoryResponse.json() : null

  const settings = await fetchStandingsSettings(leagueId, teams).catch((e) => ({
    error: e.message,
  }))
  // The simulation seeds itself from the league state, so no Math.random patching here:
  // the golden test's double run proves the odds are deterministic.
  const odds = settings.spots
    ? calculatePlayoffOdds(
        teams,
        settings.completed,
        settings.end,
        settings.spots,
        settings.schedule
      )
    : []

  const power = buildPowerRankings(
    teams.map((t) => ({ rosterId: t.rosterId, players: t.players })),
    slots
  )
  const placements = calculateLeaguePlacements(teams, true, ctx)
  const positionRanks = calculateLeaguePositionRankings(teams, ctx)
  // Overview "Dynasty rank" and My Team "Team value" both read leagueTeamValues.
  const teamValues = leagueTeamValues(teams, ctx)
  // The Outlook orders teams by placement value; rank it with the same tie rule.
  const outlookValue = (id) => placements.placements[id]?.valueTotal ?? 0
  const outlookRank = (id) => teams.filter((o) => outlookValue(o.rosterId) > outlookValue(id)).length + 1
  const order = (metric) =>
    Object.fromEntries(
      buildDraftOrder(teams, draft.maxPointsFor, projection.projected, metric).map((row) => [
        row.rosterId,
        row.label,
      ])
    )
  const viewer = teams.find((t) => t.rosterId === bundle.defaultSelectedRosterId) ?? teams[0]
  const superflexInventory = inventory?.superflex ?? true

  return {
    league: {
      currentWeek: bundle.currentWeek,
      isDynasty: bundle.leagueOverview?.isDynasty ?? null,
      rosterPositions: slots,
      // Every consumer of the league format, side by side (one rule since PR-5). The
      // trade inventory is a recorded server response, so it reflects the recorded league.
      superflex: {
        powerRankings: power.superflex,
        leagueContext: ctx.superflex,
        tradeInventory: inventory?.superflex ?? null,
      },
      ktcNamesMatched: Object.keys(ktc.latest).length,
    },
    teams: Object.fromEntries(
      teams.map((t) => [
        t.rosterId,
        {
          record: [t.wins, t.losses, t.ties ?? 0],
          pointsFor: r(t.pointsFor, 2),
          grade: t.grade,
          gradeScore: r(t.gradeScore),
          teamValueScore: r(teamValues.get(t.rosterId).value),
          valueEstimated: teamValues.get(t.rosterId).estimated,
          dynastyRank: { teamValue: teamValues.get(t.rosterId).rank, outlook: outlookRank(t.rosterId) },
          ktcSfTotal: t.players.reduce((s, p) => s + (p.ktcValueSf ?? 0), 0),
          tieredPlayers: t.players.filter((p) => p.tierNumber).length,
          power: (() => {
            const e = power.teams.find((x) => x.rosterId === t.rosterId)
            return e ? { rank: e.rank, score: e.score } : null
          })(),
          placement: (() => {
            const p = placements.placements[t.rosterId]
            return p
              ? {
                  state: p.state,
                  now: p.nowScore,
                  future: p.futureScore,
                  coreAge: r(p.avgAge, 2),
                  ageKnown: p.ageKnown,
                }
              : null
          })(),
          positionRanks: positionRanks[t.rosterId] ?? null,
          maxPointsFor: r(draft.maxPointsFor[t.rosterId]?.maxPointsFor ?? null, 2),
          projectedMaxPointsFor: r(projection.projected[t.rosterId] ?? null, 2),
          playoffOdds: r(
            odds.find((o) => o.rosterId === t.rosterId)?.playoffProbability ?? null,
            2
          ),
        },
      ])
    ),
    standingsOrder: recordOrder(teams).map((t) => t.rosterId),
    draftOrder: {
      record: order('record'),
      maxpf: order('maxpf'),
      projected: order('projected'),
      weeksCounted: draft.weeksCounted,
      // The default every page shows (D2): projected when every team has a real projection.
      policy: (() => {
        const slots = draftSlots(teams, {
          maxPointsFor: draft.maxPointsFor,
          projectedMaxPointsFor: projection.projected,
          projectedPerWeek: projection.perWeek,
          weeksCounted: draft.weeksCounted,
          remainingWeeks: projection.remainingWeeks,
          loading: false,
        })
        return { basis: slots.basis, slots: slots.slotByRoster }
      })(),
    },
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
