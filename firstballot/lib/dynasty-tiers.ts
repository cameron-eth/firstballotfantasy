export const DYNASTY_TIER_VERSION = 1

export const DYNASTY_TIERS = [
  { number: 1, name: 'Elite', minimum: 82, emphasis: 'strong' },
  { number: 2, name: 'Star', minimum: 72, emphasis: 'strong' },
  { number: 3, name: 'High-end starter', minimum: 62, emphasis: 'positive' },
  { number: 4, name: 'Solid starter', minimum: 51, emphasis: 'neutral' },
  { number: 5, name: 'Flex / upside', minimum: 40, emphasis: 'neutral' },
  { number: 6, name: 'Depth / dart', minimum: 30, emphasis: 'neutral' },
  { number: 7, name: 'Roster fringe', minimum: 20, emphasis: 'negative' },
  { number: 8, name: 'Waiver range', minimum: 0, emphasis: 'negative' },
] as const

export type TierFormat = 'sf' | 'one_qb'
export type TierEmphasis = (typeof DYNASTY_TIERS)[number]['emphasis']
export type DynastyTier = {
  number: number
  name: string
  emphasis: TierEmphasis
  score: number
  rank: number
  value: number
  factors: { market: number; production: number | null; adp: number | null; age: number | null; draft: number | null }
}
export type TierPlayer = {
  id: string
  name: string
  position: string
  age: number | null
  experience: number | null
  draftSelection: number | null
  draftYear: number | null
  ppgRank: number | null
  games: number | null
  adp: number | null
  valueSf: number
  value1qb: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const productionCutoff: Record<string, number> = { QB: 40, RB: 60, WR: 90, TE: 50 }
const agePeak: Record<string, [number, number]> = { QB: [25, 32], RB: [22, 26], WR: [23, 29], TE: [24, 30] }

/** One global score for each scoring format. Missing inputs are omitted, never set to zero. */
export function scoreDynastyPlayer(player: TierPlayer, format: TierFormat) {
  const market = clamp((format === 'sf' ? player.valueSf : player.value1qb) / 10000)
  const cutoff = productionCutoff[player.position]
  const production = player.ppgRank && (player.games ?? 0) >= 3 && cutoff
    ? clamp(1 - (player.ppgRank - 1) / cutoff)
    : null
  // ESPN's current-season average draft position is a redraft signal, so its weight is small.
  const adp = player.adp && player.adp > 0 && player.adp <= 300
    ? clamp(1 - (player.adp - 1) / 250)
    : null
  const peak = agePeak[player.position]
  const age = player.age && peak
    ? clamp(player.age < peak[0] ? 1 - (peak[0] - player.age) * 0.065
      : player.age > peak[1] ? 1 - (player.age - peak[1]) * 0.11 : 1)
    : null
  const draft = player.draftSelection && player.draftSelection > 0
    ? clamp(1 - Math.log2(player.draftSelection) / Math.log2(260))
    : null
  const weighted = [
    [market, 0.65], [production, 0.18], [adp, 0.08], [age, 0.06], [draft, 0.03],
  ] as const
  const present = weighted.filter(([value]) => value !== null)
  const denominator = present.reduce((sum, [, weight]) => sum + weight, 0)
  const score = Math.round(1000 * present.reduce((sum, [value, weight]) => sum + value! * weight, 0) / denominator) / 10
  const tier = DYNASTY_TIERS.find((candidate) => score >= candidate.minimum) ?? DYNASTY_TIERS[7]
  return { score, tier, factors: { market, production, adp, age, draft } }
}

export function buildDynastyTiers(players: TierPlayer[], format: TierFormat): Record<string, DynastyTier> {
  const sorted = players.map((player) => ({ player, ...scoreDynastyPlayer(player, format) }))
    .sort((a, b) => b.score - a.score || b.player[format === 'sf' ? 'valueSf' : 'value1qb'] - a.player[format === 'sf' ? 'valueSf' : 'value1qb'] || a.player.id.localeCompare(b.player.id))
  return Object.fromEntries(sorted.map(({ player, score, tier, factors }, index) => [player.id, {
    number: tier.number, name: tier.name, emphasis: tier.emphasis,
    score, rank: index + 1, value: format === 'sf' ? player.valueSf : player.value1qb, factors,
  }]))
}
