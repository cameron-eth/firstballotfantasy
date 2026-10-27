/** KTC points gained in 30 days that earn the fire marker. */
export const HOT_DELTA = 500

/** KTC points lost in 30 days that earn the ice marker. */
export const COLD_DELTA = 500

export type TierTone = 'elite' | 'good' | 'neutral' | 'bad'

const GOOD_ADJECTIVE: Record<number, string> = { 1: 'Elite', 2: 'Star', 3: 'Strong' }

export const toneForTier = (tierNumber: number): TierTone =>
  tierNumber === 1 ? 'elite' : tierNumber <= 3 ? 'good' : tierNumber >= 7 ? 'bad' : 'neutral'

/** Lineup slot a player's position rank implies: top 12 = 1, next 12 = 2, then 3. */
const slotFor = (positionRank: number) => Math.min(3, Math.ceil(positionRank / 12))

/**
 * Plain-English description of a player's dynasty standing, e.g. "Elite WR1".
 * Middle tiers (4-6) return null on purpose: only clearly good or clearly bad
 * players deserve a marker.
 */
export function describeTier(input: {
  tierNumber: number
  position: string
  positionRank?: number | null
}): { label: string | null; tone: TierTone } {
  const tone = toneForTier(input.tierNumber)
  if (tone === 'neutral') return { label: null, tone }
  const { position, positionRank } = input
  if (tone === 'bad')
    return { label: `${input.tierNumber === 7 ? 'Fringe' : 'Waiver-level'} ${position}`, tone }
  const adjective = GOOD_ADJECTIVE[input.tierNumber]
  const slot = positionRank ? `${position}${slotFor(positionRank)}` : position
  return { label: `${adjective} ${slot}`, tone }
}

export const isHot = (delta30: number | null | undefined) =>
  typeof delta30 === 'number' && delta30 >= HOT_DELTA

export const isCold = (delta30: number | null | undefined) =>
  typeof delta30 === 'number' && delta30 <= -COLD_DELTA

/** Published tier text may carry a "(Tier 5)" suffix; the card shows only the plain name. */
export const plainTierName = (name: string) => name.replace(/\s*\(Tier \d+\)\s*$/, '')
