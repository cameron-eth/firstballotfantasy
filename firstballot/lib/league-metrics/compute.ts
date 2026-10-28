/**
 * Every league-level dashboard metric, computed by the same modules the dashboard uses
 * (PR-15, audit R3-1). The golden-metric test runs this on recorded leagues, and
 * /api/league/[id]/metrics runs it on the server, so the two can't drift apart.
 *
 * Viewer-specific values (trade ideas, picks) are not here: a league snapshot is shared by
 * everyone in the league.
 */
import { createHash } from 'node:crypto'
import {
  applyKtc,
  fetchKtcMaps,
  fetchLeagueDataBundle,
  ktcNamesFor,
  withTeamScores,
} from '@/components/league-buddy/leagueDataBundle'
import { fetchDraftOrderBundle } from '@/components/league-buddy/draft-order/draftOrderBundle'
import { fetchStandingsSettings } from '@/components/league-buddy/standingsSettings'
import { projectLeagueMaxPointsFor } from '@/components/league-buddy/draft-order/projectedMaxPointsFor'
import {
  buildDraftOrder,
  type DraftOrderMetric,
} from '@/components/league-buddy/draft-order/draftOrderBoard'
import { calculatePlayoffOdds } from '@/components/league-buddy/utils/playoffOdds'
import { calculateLeaguePositionRankings, recordOrder } from '@/components/league-buddy/utils'
import { calculateLeaguePlacements } from '@/components/league-buddy/competitiveState'
import { buildPowerRankings } from '@/lib/sleeper-sdk/values'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import { leagueTeamValues } from './team-value'
import { draftSlots } from './draft-slots'

/** Version of the computed shape; bump with any change to what a snapshot holds. */
export const LEAGUE_METRICS_VERSION = 1

const round = (n: number | null | undefined, places = 4) =>
  typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(places)) : (n ?? null)

/** Everything the metrics read, fetched the way the dashboard fetches it. */
export async function loadLeagueInputs(leagueId: string, apiBase = '') {
  const bundle = await fetchLeagueDataBundle(leagueId, null, 0, apiBase)
  const ktc = await fetchKtcMaps(ktcNamesFor(bundle.teams), 0, apiBase)
  const ctx = bundle.leagueContext
  const teams = withTeamScores(applyKtc(bundle.teams, ktc), ctx)
  const slots = bundle.rosterPositionsRaw
  const positions = Object.fromEntries(
    Object.entries(bundle.allPlayers).flatMap(([id, p]) => (p?.position ? [[id, p.position]] : []))
  )
  const draft = await fetchDraftOrderBundle(leagueId, slots, positions)
  const seasonProjections =
    (await (await fetch(`${apiBase}/api/projections?leagueId=${leagueId}`)).json()).points ?? {}
  const projection = projectLeagueMaxPointsFor(teams, seasonProjections, slots, draft)
  const inventoryResponse = await fetch(`${apiBase}/api/trade-inventory?leagueId=${leagueId}`)
  const inventory: TradeInventory | null = inventoryResponse.ok
    ? await inventoryResponse.json()
    : null
  const settings = await fetchStandingsSettings(leagueId, teams).catch((e: Error) => ({
    error: e.message,
  }))
  return {
    bundle,
    ktc,
    ctx,
    teams,
    slots,
    draft,
    seasonProjections,
    projection,
    inventory,
    settings,
  }
}

export type LeagueInputs = Awaited<ReturnType<typeof loadLeagueInputs>>

/**
 * Hash of what the metrics depend on: records, points, each player's values and
 * projections, Max PF, and playoff settings. Two snapshots with the same hash hold the
 * same numbers.
 */
export function leagueInputHash({ teams, slots, draft, projection, settings }: LeagueInputs) {
  const text = JSON.stringify([
    LEAGUE_METRICS_VERSION,
    slots,
    teams.map((t) => [
      t.rosterId,
      t.wins,
      t.losses,
      t.ties ?? 0,
      t.pointsFor,
      t.players.map((p) => [
        p.playerId,
        p.ktcValueSf ?? null,
        p.ktcValue1qb ?? null,
        p.rank,
        p.age,
        p.fantasy_ppg ?? null,
      ]),
    ]),
    Object.values(draft.maxPointsFor).map((e) => [e.rosterId, e.maxPointsFor]),
    projection.projected,
    settings,
  ])
  return createHash('sha256').update(text).digest('hex')
}

/** The league's metrics from its inputs; pure. */
export function leagueMetrics(inputs: LeagueInputs) {
  const { bundle, ktc, ctx, teams, slots, draft, projection, inventory, settings } = inputs
  const odds =
    'spots' in settings
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
  const outlookValue = (id: number) => placements.placements[id]?.valueTotal ?? 0
  const outlookRank = (id: number) =>
    teams.filter((o) => outlookValue(o.rosterId) > outlookValue(id)).length + 1
  const order = (metric: DraftOrderMetric) =>
    Object.fromEntries(
      buildDraftOrder(teams, draft.maxPointsFor, projection.projected, metric).map((row) => [
        row.rosterId,
        row.label,
      ])
    )
  const policy = draftSlots(teams, {
    maxPointsFor: draft.maxPointsFor,
    projectedMaxPointsFor: projection.projected,
    projectedPerWeek: projection.perWeek,
    weeksCounted: draft.weeksCounted,
    remainingWeeks: projection.remainingWeeks,
    loading: false,
  })

  return {
    league: {
      currentWeek: bundle.currentWeek,
      isDynasty: bundle.leagueOverview?.isDynasty ?? null,
      rosterPositions: slots,
      // Every consumer of the league format, side by side (one rule since PR-5). The
      // trade inventory is a server response, so it reflects the league as Sleeper has it.
      superflex: {
        powerRankings: power.superflex,
        leagueContext: ctx.superflex,
        tradeInventory: inventory?.superflex ?? null,
      },
      ktcNamesMatched: Object.keys(ktc.latest).length,
    },
    teams: Object.fromEntries(
      teams.map((t) => {
        const value = teamValues.get(t.rosterId)!
        const entry = power.teams.find((x) => x.rosterId === t.rosterId)
        const p = placements.placements[t.rosterId]
        return [
          t.rosterId,
          {
            record: [t.wins, t.losses, t.ties ?? 0],
            pointsFor: round(t.pointsFor, 2),
            grade: t.grade,
            gradeScore: round(t.gradeScore),
            teamValueScore: round(value.value),
            valueEstimated: value.estimated,
            dynastyRank: { teamValue: value.rank, outlook: outlookRank(t.rosterId) },
            ktcSfTotal: t.players.reduce((s, pl) => s + (pl.ktcValueSf ?? 0), 0),
            tieredPlayers: t.players.filter((pl) => pl.tierNumber).length,
            power: entry ? { rank: entry.rank, score: entry.score } : null,
            placement: p
              ? {
                  state: p.state,
                  now: p.nowScore,
                  future: p.futureScore,
                  coreAge: round(p.avgAge, 2),
                  ageKnown: p.ageKnown,
                }
              : null,
            positionRanks: positionRanks[t.rosterId] ?? null,
            maxPointsFor: round(draft.maxPointsFor[t.rosterId]?.maxPointsFor ?? null, 2),
            projectedMaxPointsFor: round(projection.projected[t.rosterId] ?? null, 2),
            playoffOdds: round(
              odds.find((o) => o.rosterId === t.rosterId)?.playoffProbability ?? null,
              2
            ),
          },
        ]
      })
    ),
    standingsOrder: recordOrder(teams).map((t) => t.rosterId),
    draftOrder: {
      record: order('record'),
      maxpf: order('maxpf'),
      projected: order('projected'),
      weeksCounted: draft.weeksCounted,
      // The default every page shows (D2): projected when every team has a real projection.
      policy: { basis: policy.basis, slots: policy.slotByRoster },
    },
  }
}

export type LeagueMetrics = ReturnType<typeof leagueMetrics>
