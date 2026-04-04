/**
 * Canonical scouting grade tiers shown in UI (DB may still store legacy labels).
 * "Contributer" matches product copy (common alternate spelling of Contributor).
 */
export const SCOUTING_DISPLAY_TIER_ORDER = [
  'Generational',
  'Elite',
  'Blue Chip',
  'Contributer',
  'Depth',
  'Walk-On',
] as const

export type ScoutingDisplayTier = (typeof SCOUTING_DISPLAY_TIER_ORDER)[number]

const ORDER_SET = new Set<string>(SCOUTING_DISPLAY_TIER_ORDER)

export function scoutingTierFromGrade(grade: number): ScoutingDisplayTier {
  if (grade >= 95) return 'Generational'
  if (grade >= 90) return 'Elite'
  if (grade >= 85) return 'Blue Chip'
  if (grade >= 78) return 'Contributer'
  if (grade >= 68) return 'Depth'
  return 'Walk-On'
}

/**
 * Map `grade_tier` from DB (or legacy values) + numeric grade → display tier.
 */
export function normalizeScoutingGradeTier(
  gradeTier: string | null | undefined,
  grade: number
): ScoutingDisplayTier {
  if (gradeTier == null || String(gradeTier).trim() === '') {
    return scoutingTierFromGrade(grade)
  }
  const t = String(gradeTier).trim()

  if (ORDER_SET.has(t)) {
    return t as ScoutingDisplayTier
  }

  const lower = t.toLowerCase()

  if (/elite\s*prospect/i.test(t)) return 'Generational'
  if (/generational/i.test(lower)) return 'Generational'
  if (/^s\+?$/i.test(t) || /^ss$/i.test(t)) return 'Generational'

  if (/blue\s*chip/i.test(lower) || lower === 'bluechip') return 'Blue Chip'

  if (/starter|rotational|backup/i.test(lower)) return 'Contributer'

  if (/longshot|walk\s*-?\s*on|walkon|undrafted/i.test(lower)) return 'Walk-On'

  if (lower.includes('depth')) return 'Depth'

  if (lower.includes('elite')) return 'Elite'

  return scoutingTierFromGrade(grade)
}

/** Tailwind classes for tier chips / breakdown rows */
export const SCOUTING_TIER_STYLES: Record<
  ScoutingDisplayTier,
  { bg: string; text: string; border: string }
> = {
  Generational: {
    bg: 'bg-amber-500/25',
    text: 'text-amber-300',
    border: 'border-amber-400/50',
  },
  Elite: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
  },
  'Blue Chip': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
  },
  Contributer: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/50',
  },
  Depth: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/50',
  },
  'Walk-On': {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
  },
}
