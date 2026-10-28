import { ktcValue } from '@/lib/sleeper-sdk'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RANK_TEXT, rankTone } from '@/lib/design/tones'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import type { PlayerData, TeamData } from '../types'
import { PlayerFace } from '../ui/PlayerFace'
import { PositionBadge } from '../ui/Badge'

const POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

/**
 * Position-group cards in the Team Builder's card language: the position wash, faces of the
 * most valuable players, and where the group ranks in the league by dynasty value.
 */
export function RosterOverview({
  team,
  positionRanks,
  leagueSize,
  superflex,
  onOpen,
  openLabel,
}: {
  team: TeamData
  /** position → league rank by value (1 = best group). */
  positionRanks: Record<string, number>
  leagueSize: number
  superflex: boolean
  onOpen: () => void
  openLabel: string
}) {
  const value = (p: PlayerData) => ktcValue(p, { superflex }) ?? 0
  return (
    <section aria-label="Roster overview">
      <SectionHeader
        title="Roster overview"
        subtitle="Position groups ranked against the league by dynasty value"
        actions={
          <Button variant="tint" size="xs" onClick={onOpen}>
            {openLabel}
            <ArrowRight aria-hidden />
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {POSITIONS.map((pos) => {
          const players = team.players
            .filter((p) => p.position === pos)
            .sort((a, b) => value(b) - value(a))
          const top = players[0]
          const rank = positionRanks[pos]
          const palette = positionPalette[pos] ?? neutralPalette
          return (
            <div
              key={pos}
              className="relative min-w-0 overflow-hidden rounded-xl border border-line/60 p-3"
              // The Map's position wash, so a group reads as its position at a glance.
              style={{
                background: `linear-gradient(155deg, ${palette.glow}33, ${palette.wash} 60%, transparent)`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <PositionBadge position={pos} />
                  <div className="mt-2 text-xs text-slate-400">{players.length} rostered</div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      'text-xl font-semibold tabular-nums',
                      rank ? RANK_TEXT[rankTone(rank, leagueSize)] : 'text-slate-500'
                    )}
                  >
                    {rank ? `#${rank}` : '—'}
                  </div>
                  <div className="text-2xs text-slate-500">of {leagueSize}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex -space-x-3">
                  {players.slice(0, 3).map((p) => (
                    <PlayerFace
                      key={p.playerId}
                      player={p}
                      size={44}
                      className="ring-2 ring-background"
                      rounded="rounded-full"
                    />
                  ))}
                </div>
                {top && (
                  <div className="min-w-0 sm:text-right">
                    <div className="truncate text-xs font-medium text-slate-200">
                      {top.playerName}
                    </div>
                    <div className="text-2xs tabular-nums text-value">
                      KTC {value(top).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
