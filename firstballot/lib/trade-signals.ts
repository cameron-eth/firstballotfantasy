import type { PlayerData, TeamData } from '@/components/league-buddy/types'
import {
  calculateLeaguePlacements,
  COMPETITIVE_STATES,
  type CompetitiveStateKey,
} from '@/components/league-buddy/competitiveState'
import { describeTier, isHot } from '@/lib/player-signals'
import { resolveLeagueContext } from '@/lib/league-metrics/context'

/**
 * Every threshold the trade engine uses lives here so the logic is auditable and a
 * change is one reviewed edit. Bump `version` when a rule changes.
 */
export const TRADE_RULES = {
  version: 1,
  /** Age at which a productive player is "older" for his position (matches the tier age curve). */
  agingAge: { QB: 33, RB: 27, WR: 29, TE: 30 } as Record<string, number>,
  /** Tiers 1-4 are worth selling: buyers exist and the player is not replaceable off waivers. */
  sellableTierMax: 4,
  /** A lineup spot held by tier 6+ (or empty) is a real need. */
  weakStarterTierMin: 6,
  /** Teams in these states are not competing for this season's title. */
  rebuildingStates: ['rebuild', 'purgatory'] as CompetitiveStateKey[],
  /** Teams in these states pay for production now. */
  buyingStates: ['juggernaut', 'contender', 'house-money'] as CompetitiveStateKey[],
}

export type TradeSignalKind = 'aging' | 'surplus'

export type TradeSignal = {
  playerId: string
  kind: TradeSignalKind
  headline: string
  /** Each step of the reasoning, in the order the engine took it. */
  reasons: string[]
  partners: { rosterId: number; teamName: string; why: string }[]
  priority: number
}

const CORE = ['QB', 'RB', 'WR', 'TE']
const FLEX_ELIGIBLE: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: CORE,
  'QB/RB/WR/TE': CORE,
  REC_FLEX: ['WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  'W/R': ['RB', 'WR'],
  'W/R/T': ['RB', 'WR', 'TE'],
}

const strength = (p: PlayerData) => p.tierScore ?? -1
const tierOf = (p: PlayerData | null) => p?.tierNumber ?? 9

/** Fills dedicated slots first, then flex slots, with the strongest available player. */
function fillLineup(players: PlayerData[], rawSlots: string[]) {
  const pool = players
    .filter((p) => CORE.includes(p.position))
    .sort((a, b) => strength(b) - strength(a))
  const taken = new Set<string>()
  const slots: { slot: string; positions: string[]; player: PlayerData | null }[] = []
  const take = (positions: string[]) => {
    const pick = pool.find((p) => !taken.has(p.playerId) && positions.includes(p.position)) ?? null
    if (pick) taken.add(pick.playerId)
    return pick
  }
  for (const slot of rawSlots.filter((s) => CORE.includes(s)))
    slots.push({ slot, positions: [slot], player: take([slot]) })
  for (const slot of rawSlots.filter((s) => FLEX_ELIGIBLE[s]))
    slots.push({ slot, positions: FLEX_ELIGIBLE[slot], player: take(FLEX_ELIGIBLE[slot]) })
  return { slots, bench: pool.filter((p) => !taken.has(p.playerId)) }
}

function profile(team: TeamData, rawSlots: string[]) {
  const { slots, bench } = fillLineup(team.players, rawSlots)
  const weakSlots = slots.filter((s) => tierOf(s.player) >= TRADE_RULES.weakStarterTierMin)
  // A weak dedicated slot is a need at that position; a weak flex slot is a need at any eligible one.
  const needs = new Set(weakSlots.flatMap((s) => s.positions))
  const surplus = new Map<string, PlayerData[]>()
  for (const p of bench)
    if (tierOf(p) <= TRADE_RULES.sellableTierMax)
      surplus.set(p.position, [...(surplus.get(p.position) ?? []), p])
  return { needs, surplus, weakSlots }
}

/**
 * Who on `mine` is worth shopping, and the chain of facts behind each answer.
 * Pure: the same rosters and standings always give the same signals.
 */
export function tradeSignals(
  mine: TeamData,
  teams: TeamData[],
  rawSlots: string[],
  /** Pass the dashboard's own rule (`!isOffSeason()`) so franchise states match the header. */
  inSeason: boolean
): TradeSignal[] {
  const { placements } = calculateLeaguePlacements(
    teams,
    inSeason,
    resolveLeagueContext({ roster_positions: rawSlots })
  )
  const stateOf = (t: TeamData) => placements[t.rosterId]?.state
  const myState = stateOf(mine)
  const iAmRebuilding = !!myState && TRADE_RULES.rebuildingStates.includes(myState)
  const me = profile(mine, rawSlots)
  const others = teams
    .filter((t) => t.rosterId !== mine.rosterId)
    .map((team) => ({ team, state: stateOf(team), ...profile(team, rawSlots) }))
  const signals = new Map<string, TradeSignal>()
  const label = (p: PlayerData) =>
    describeTier({
      tierNumber: p.tierNumber ?? 5,
      position: p.position,
      positionRank: p.tierPositionRank,
    }).label ?? `${p.position}`
  const spike = (p: PlayerData) =>
    isHot(p.ktcDelta30)
      ? [`KTC value is up ${Math.round(p.ktcDelta30!)} in 30 days, so the price is high now.`]
      : []

  if (iAmRebuilding && myState) {
    for (const p of mine.players) {
      const cliff = TRADE_RULES.agingAge[p.position]
      if (!cliff || !p.age || p.age < cliff || tierOf(p) > TRADE_RULES.sellableTierMax) continue
      const buyers = others.filter(
        (o) => o.state && TRADE_RULES.buyingStates.includes(o.state) && o.needs.has(p.position)
      )
      signals.set(p.playerId, {
        playerId: p.playerId,
        kind: 'aging',
        headline: 'Sell while he still has value',
        reasons: [
          `${p.age}-year-old ${p.position}s are past their prime (the model's age cutoff is ${cliff}).`,
          `He is still rated ${label(p)}, so contenders will pay for him.`,
          `Your team is ${COMPETITIVE_STATES[myState].label.toLowerCase()}: his production helps you less than a younger asset or pick would, and his value drops each year.`,
          ...spike(p),
        ],
        partners: buyers.slice(0, 3).map((o) => ({
          rosterId: o.team.rosterId,
          teamName: o.team.teamName,
          why: `${COMPETITIVE_STATES[o.state!].label}; has a weak ${p.position} spot`,
        })),
        priority: 2 + strength(p) / 100,
      })
    }
  }

  const myNeeds = [...me.needs]
  if (myNeeds.length) {
    for (const [position, spares] of me.surplus) {
      // The best spare is a roster luxury; deeper spares are the cheapest to move.
      for (const p of spares) {
        if (signals.has(p.playerId)) continue
        const matches = others.filter(
          (o) =>
            o.needs.has(position) && myNeeds.some((need) => (o.surplus.get(need)?.length ?? 0) > 0)
        )
        if (!matches.length) continue
        signals.set(p.playerId, {
          playerId: p.playerId,
          kind: 'surplus',
          headline: `Surplus ${position}: trade for ${myNeeds.slice(0, 2).join('/')}`,
          reasons: [
            `You have ${spares.length} starter-quality ${position}${spares.length > 1 ? 's' : ''} on your bench, so he does not raise your weekly lineup.`,
            `Your ${myNeeds.join('/')} lineup spot${myNeeds.length > 1 ? 's are' : ' is'} held by a weak or empty slot, which is where a trade adds the most.`,
            `${matches.length} team${matches.length > 1 ? 's need' : ' needs'} a ${position} and can spare one of your positions of need.`,
            ...spike(p),
          ],
          partners: matches.slice(0, 3).map((o) => {
            const give = myNeeds.find((need) => (o.surplus.get(need)?.length ?? 0) > 0)!
            return {
              rosterId: o.team.rosterId,
              teamName: o.team.teamName,
              why: `Needs ${position}; has a spare ${give}`,
            }
          }),
          priority: 1 + strength(p) / 100,
        })
      }
    }
  }
  return [...signals.values()].sort((a, b) => b.priority - a.priority)
}
