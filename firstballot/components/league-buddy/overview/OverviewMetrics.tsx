import { cn } from '@/lib/utils'
import { RANK_TEXT, probabilityText, rankTone } from '@/lib/design/tones'
import { StatTile } from '@/components/ui/stat-tile'
import type { CompetitiveStateMeta } from '../competitiveState'

export interface OverviewMetricValues {
  leagueSize: number
  /** Dynasty (KTC) value rank; 0 when values haven't loaded. */
  valueRank: number
  state: CompetitiveStateMeta | null
  playoffOdds?: number
  playoffSpots?: number
  pointsFor: number
  pointsAgainst: number
  avgPointsFor: number
  avgPointsAgainst: number
  projectedThisWeek: number
  /** Rank of this week's starter projection; 0 when nothing is projected. */
  projectedRank: number
  maxPointsFor?: number
  /** Draft slot by Max PF, e.g. '1.01'; dynasty leagues only. */
  maxPfSlot?: string
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`

/** Six metrics that answer "how competitive is this team?". Only real, current numbers. */
export function OverviewMetrics({ m }: { m: OverviewMetricValues }) {
  const pfDelta = m.pointsFor - m.avgPointsFor
  const paDelta = m.pointsAgainst - m.avgPointsAgainst
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        size="lg"
        label="Dynasty rank"
        value={m.valueRank > 0 ? `#${m.valueRank}` : '—'}
        valueClassName={m.valueRank > 0 ? RANK_TEXT[rankTone(m.valueRank, m.leagueSize)] : ''}
        detail={
          m.state ? (
            <span className={m.state.text}>{m.state.label}</span>
          ) : (
            `of ${m.leagueSize} by KTC value`
          )
        }
      />
      <StatTile
        size="lg"
        label="Playoff odds"
        value={m.playoffOdds == null ? '—' : `${m.playoffOdds.toFixed(1)}%`}
        valueClassName={m.playoffOdds == null ? '' : probabilityText(m.playoffOdds)}
        detail={m.playoffSpots ? `${m.playoffSpots} of ${m.leagueSize} make it` : 'Simulated'}
      />
      <StatTile
        size="lg"
        label="Points for"
        value={m.pointsFor.toFixed(1)}
        detail={
          <span className={pfDelta >= 0 ? 'text-positive' : 'text-negative'}>
            {signed(pfDelta)} vs avg
          </span>
        }
      />
      <StatTile
        size="lg"
        label="Points against"
        value={m.pointsAgainst.toFixed(1)}
        detail={
          <span className={paDelta <= 0 ? 'text-positive' : 'text-negative'}>
            {signed(paDelta)} vs avg
          </span>
        }
      />
      <StatTile
        size="lg"
        label="Projected this week"
        value={m.projectedThisWeek > 0 ? m.projectedThisWeek.toFixed(1) : '—'}
        valueClassName="text-production"
        detail={m.projectedRank > 0 ? `#${m.projectedRank} of ${m.leagueSize}` : 'Current starters'}
      />
      <StatTile
        size="lg"
        label="Max PF"
        value={m.maxPointsFor ? m.maxPointsFor.toFixed(1) : '—'}
        detail={
          m.maxPfSlot ? (
            <span className={cn(m.maxPfSlot === '1.01' ? 'text-pick' : '')}>
              Slot {m.maxPfSlot} by Max PF
            </span>
          ) : (
            'Best possible lineups'
          )
        }
      />
    </div>
  )
}
