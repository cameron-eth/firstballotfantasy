import type { TeamData, PlayerData } from '@/components/league-buddy/types'
import type { OwnedPick } from './sleeper-sdk/pick-inventory'
import { buildSlotLineup } from '../components/league-buddy/builder/slotLineup'

export interface FundingPlan {
  targetId: string
  partnerId: number
  receivePickId: string
  givePlayerIds: string[]
  givePickIds: string[]
}
export interface PickQuote {
  player_name: string
  value_sf: number
  value_1qb: number
  scraped_date: string
}
export function projectedPick(pick: OwnedPick, slots: Record<number, number>, size: number) {
  return slots[pick.roster_id] ? (pick.round - 1) * size + slots[pick.roster_id] : undefined
}
export function pickBenchmark(pick: OwnedPick, slots: Record<number, number>, size: number) {
  const slot = slots[pick.roster_id]
  if (!slot || !size) return null
  const band =
    slot <= Math.ceil(size / 3) ? 'Early' : slot <= Math.ceil((size * 2) / 3) ? 'Mid' : 'Late'
  const suffix = ['1st', '2nd', '3rd', '4th'][pick.round - 1]
  return suffix ? `${pick.season} ${band} ${suffix}` : null
}
/** Hypothetical ownership only. Never mutates live inventory or counts a pick twice. */
export function applyFundingPlans(picks: OwnedPick[], plans: FundingPlan[], mine: number) {
  const result = picks.map((p) => ({ ...p }))
  const accepted: FundingPlan[] = [],
    rejected: FundingPlan[] = []
  const spent = new Set<string>()
  for (const plan of plans) {
    const receive = result.find((p) => p.id === plan.receivePickId)
    const give = plan.givePickIds.map((id) => result.find((p) => p.id === id))
    const assets = [
      ...plan.givePlayerIds.map((id) => `player:${id}`),
      ...plan.givePickIds,
      plan.receivePickId,
    ]
    if (
      !receive ||
      receive.owner_id !== plan.partnerId ||
      plan.partnerId === mine ||
      give.some((p) => !p || p.owner_id !== mine) ||
      assets.some((id) => spent.has(id))
    ) {
      rejected.push(plan)
      continue
    }
    receive.owner_id = mine
    for (const pick of give) pick!.owner_id = plan.partnerId
    assets.forEach((id) => spent.add(id))
    accepted.push(plan)
  }
  return { picks: result, accepted, rejected }
}
export function lineupBaseline(players: PlayerData[], rawSlots: string[]) {
  const mapped = players.map((p) => ({
    id: p.playerId,
    position: p.position,
    positions: p.fantasyPositions,
    ppg: p.games_played && Number.isFinite(p.fantasy_ppg) ? p.fantasy_ppg : undefined,
  }))
  const lineup = buildSlotLineup(rawSlots, mapped)
  return {
    ppg: lineup.reduce((sum, s) => sum + (s.starter?.ppg ?? 0), 0),
    missing: lineup.filter((s) => s.starter?.ppg == null).length,
  }
}
export function draftFundingIdeas({
  targetId,
  year,
  rank,
  mine,
  teams,
  picks,
  slots,
  quotes,
  superflex,
  rawSlots,
  excludedPlayers = [],
  excludedPicks = [],
}: {
  targetId: string
  year?: number
  rank?: number
  mine: TeamData
  teams: TeamData[]
  picks: OwnedPick[]
  slots: Record<number, number>
  quotes: PickQuote[]
  superflex: boolean
  rawSlots: string[]
  excludedPlayers?: string[]
  excludedPicks?: string[]
}) {
  if (!year || !rank || rank < 1) return []
  const value = (p: PlayerData) => (superflex ? p.ktcValueSf : p.ktcValue1qb) ?? 0
  const pickValue = (p: OwnedPick) => {
    const name = pickBenchmark(p, slots, teams.length)
    const q = quotes.find((q) => q.player_name === name)
    return { name, quote: q, value: (superflex ? q?.value_sf : q?.value_1qb) ?? 0 }
  }
  const roster = mine.players.filter((p) => !excludedPlayers.includes(p.playerId))
  const baseline = lineupBaseline(roster, rawSlots)
  const assets = roster.filter((p) => value(p) > 0)
  const minePicks = picks.filter(
    (p) => p.owner_id === mine.rosterId && !excludedPicks.includes(p.id)
  )
  return picks
    .filter(
      (p) =>
        p.owner_id !== mine.rosterId &&
        Number(p.season) === year &&
        !excludedPicks.includes(p.id) &&
        (projectedPick(p, slots, teams.length) ?? Infinity) <= rank &&
        teams.some((t) => t.rosterId === p.owner_id)
    )
    .flatMap((pick) => {
      const benchmark = pickValue(pick)
      if (!benchmark.value) return []
      const packages: { players: PlayerData[]; picks: OwnedPick[]; value: number }[] = assets.map(
        (p) => ({ players: [p], picks: [], value: value(p) })
      )
      for (let i = 0; i < assets.length; i++)
        for (let j = i + 1; j < assets.length; j++)
          packages.push({
            players: [assets[i], assets[j]],
            picks: [],
            value: value(assets[i]) + value(assets[j]),
          })
      for (const p of minePicks) {
        const v = pickValue(p).value
        if (v <= 0) continue
        packages.push({ players: [], picks: [p], value: v })
        for (const player of assets)
          packages.push({ players: [player], picks: [p], value: v + value(player) })
      }
      return packages
        .filter((p) => p.value >= benchmark.value * 0.85 && p.value <= benchmark.value * 1.3)
        .map((p) => {
          const after = lineupBaseline(
            roster.filter((x) => !p.players.some((y) => y.playerId === x.playerId)),
            rawSlots
          )
          const loss = Math.max(0, baseline.ppg - after.ppg)
          const owner = teams.find((t) => t.rosterId === pick.owner_id)!
          const partnerNeed = p.players.some(
            (player) =>
              owner.players.filter((x) => x.position === player.position).length <
              mine.players.filter((x) => x.position === player.position).length
          )
          return {
            plan: {
              targetId,
              partnerId: pick.owner_id,
              receivePickId: pick.id,
              givePlayerIds: p.players.map((x) => x.playerId),
              givePickIds: p.picks.map((x) => x.id),
            } satisfies FundingPlan,
            pick,
            owner,
            give: p.players,
            givePicks: p.picks,
            value: p.value,
            benchmark,
            loss,
            missing: baseline.missing > 0 || after.missing > 0,
            partnerNeed,
            score:
              loss * 100 +
              (Math.abs(p.value - benchmark.value) / benchmark.value) * 10 +
              p.players.length +
              p.picks.length -
              (partnerNeed ? 1 : 0),
          }
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)
}
