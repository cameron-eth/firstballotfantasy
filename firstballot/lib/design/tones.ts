/**
 * Class recipes for the semantic colors in app/globals.css (docs/design-system/DESIGN_SYSTEM.md §1).
 * Components read tones from here instead of picking palette classes, so a meaning keeps one color.
 * The shape everywhere is a tinted fill with a matching hairline, as on the Team Builder map.
 */
import type { TierTone } from '@/lib/player-signals'

export const TONE: Record<TierTone, string> = {
  elite: 'border-elite/50 bg-elite/10 text-amber-200',
  good: 'border-positive/40 bg-positive/10 text-emerald-200',
  neutral: 'border-white/10 bg-white/5 text-slate-300',
  bad: 'border-negative/40 bg-negative/10 text-rose-300',
}

/** Value and production are separate axes, so they never share a color. */
export const VALUE_TONE = 'border-value/50 bg-value/10 text-amber-200'
export const PRODUCTION_TONE = 'border-production/50 bg-production/10 text-sky-200'

export const HOT_TONE = 'border-positive/50 bg-positive/10 text-emerald-200'
export const COLD_TONE = 'border-cold/50 bg-cold/10 text-cyan-100'

/** Draft picks: desaturated violet chip with a ticket glyph, so a pick never reads as a TE badge. */
export const PICK_TONE = 'border-pick/30 bg-pick/10 text-violet-200'
export const PICK_PLANNED_TONE = 'border-dashed border-value/40 bg-value/5 text-violet-200'
export const PICK_PINNED_TONE = 'border-positive/50 bg-positive/5 text-violet-200'

/**
 * Pick value by round, on the tier scale: a first is elite (gold), a second the base pick
 * violet, a third or later neutral. The ticket glyph and chip shape still say "pick".
 */
export const pickRoundTone = (round: number) =>
  round <= 1 ? TONE.elite : round === 2 ? PICK_TONE : TONE.neutral

/** Selected row, tab or card: action tint plus an accent. Never gold. */
export const SELECTED_ROW = 'bg-action/10 shadow-[inset_3px_0_0_hsl(var(--action))]'
/** Sticky table cells need an opaque fill, so the selected and hover tints are pre-mixed. */
export const STICKY_SELECTED =
  'bg-[color-mix(in_srgb,hsl(var(--action))_10%,hsl(var(--background)))] shadow-[inset_3px_0_0_hsl(var(--action))]'
export const STICKY_HOVER = 'group-hover:bg-[color-mix(in_srgb,white_3%,hsl(var(--background)))]'

export const gradeTone = (grade: string): TierTone =>
  /^A/.test(grade) ? 'elite' : /^B/.test(grade) ? 'good' : /^[DF]/.test(grade) ? 'bad' : 'neutral'

/** Text color for a rank on the one league scale. */
export const RANK_TEXT: Record<TierTone, string> = {
  elite: 'text-elite',
  good: 'text-positive',
  neutral: 'text-slate-200',
  bad: 'text-negative',
}

/** One rank scale for the app: top third good, middle neutral, bottom third bad. */
export const rankTone = (rank: number, of: number): TierTone =>
  rank <= Math.ceil(of / 3) ? 'good' : rank > of - Math.ceil(of / 3) ? 'bad' : 'neutral'

/** Text color for a 0-100 probability: likely is positive, long shot is negative. */
export const probabilityText = (pct: number) =>
  pct >= 50 ? 'text-positive' : pct < 10 ? 'text-negative' : 'text-slate-200'

/** Shared recharts styling, so charts stop hand-copying axis and grid hex values. */
export const chartTheme = {
  axis: 'hsl(215 20% 65%)',
  grid: 'hsl(var(--line))',
  tooltipBg: 'hsl(var(--overlay))',
  value: 'hsl(var(--value))',
  production: 'hsl(var(--production))',
  positive: 'hsl(var(--positive))',
  negative: 'hsl(var(--negative))',
  action: 'hsl(var(--action))',
} as const
