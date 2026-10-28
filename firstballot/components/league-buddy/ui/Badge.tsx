import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'
import { describeTier, isCold, isHot, type TierTone } from '@/lib/player-signals'
import {
  COLD_TONE,
  HOT_TONE,
  PRODUCTION_TONE,
  TONE,
  VALUE_TONE,
  gradeTone,
} from '@/lib/design/tones'

export { gradeTone, PRODUCTION_TONE, VALUE_TONE }

/**
 * One badge shape for the whole team view: 10px semibold, 6px radius, a tinted fill with a
 * matching hairline border. Color carries meaning and nothing else does:
 * position = hue (blue/green/amber/violet), tier = gold/green/rose, heat = emerald/ice.
 * Tones come from lib/design/tones.ts.
 */
const base =
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-badge font-semibold leading-none'

export function PositionBadge({ position }: { position: string }) {
  const palette = positionPalette[position] ?? neutralPalette
  return (
    <span
      className={base}
      style={{
        color: palette.ink,
        borderColor: `${palette.ink}40`,
        backgroundColor: `${palette.glow}26`,
      }}
    >
      {position}
    </span>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: TierTone; children: ReactNode }) {
  return <span className={cn(base, TONE[tone])}>{children}</span>
}

/** "Elite WR1", "Fringe RB"; middle tiers stay quiet, as on the cards. */
export function TierBadge({
  tierNumber,
  position,
  positionRank,
}: {
  tierNumber?: number | null
  position: string
  positionRank?: number | null
}) {
  if (!tierNumber) return null
  const { label, tone } = describeTier({ tierNumber, position, positionRank })
  return label ? <Badge tone={tone}>{label}</Badge> : null
}

/** Fire / ice, using the same 500-point rule as the cards. */
export function HeatBadge({ delta30 }: { delta30?: number | null }) {
  if (isHot(delta30))
    return (
      <span className={cn(base, HOT_TONE)} title={`KTC up ${Math.round(delta30!)} in 30 days`}>
        🔥 +{Math.round(delta30!).toLocaleString()}
      </span>
    )
  if (isCold(delta30))
    return (
      <span
        className={cn(base, COLD_TONE)}
        title={`KTC down ${Math.abs(Math.round(delta30!))} in 30 days`}
      >
        ❄️ {Math.round(delta30!).toLocaleString()}
      </span>
    )
  return null
}

const STATUS: Record<string, string> = {
  Starter: 'border-blue-300/30 bg-blue-300/10 text-blue-200',
  Bench: 'border-white/10 bg-white/5 text-slate-400',
  Bye: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
}
export function StatusBadge({ status }: { status: 'Starter' | 'Bench' | 'Bye' }) {
  return <span className={cn(base, STATUS[status])}>{status}</span>
}

export function InjuryBadge({ status }: { status: string }) {
  return (
    <span className={cn(base, 'border-rose-400/40 bg-rose-400/10 text-rose-300')}>{status}</span>
  )
}

/** League grade letter, on the same gold/green/rose scale as tiers. */
export function GradeBadge({ grade }: { grade: string }) {
  return <Badge tone={gradeTone(grade)}>{grade}</Badge>
}

export function RankBadge({
  kind,
  rank,
  of,
}: {
  kind: 'value' | 'production'
  rank: number
  of: number
}) {
  return (
    <span
      className={cn(base, kind === 'value' ? VALUE_TONE : PRODUCTION_TONE)}
      title={`${kind === 'value' ? 'Dynasty value' : 'Points scored'} rank in this league`}
    >
      #{rank} of {of}
    </span>
  )
}
