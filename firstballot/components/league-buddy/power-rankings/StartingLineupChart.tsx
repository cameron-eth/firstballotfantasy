'use client'

import { PlayerHeadshot } from '@/components/ui/player-headshot'
import type { FilledSlot, RankedValue } from '@/lib/sleeper-sdk'
import { toneForRank } from './rank-colors'

interface StartingLineupChartProps {
  slots: FilledSlot[]
  /** Slot id → this team's league-wide rank at that slot. */
  slotRanks: Record<string, RankedValue>
  leagueSize: number
}

/**
 * The starting lineup as a column per slot, each sized by the player's dynasty value and
 * capped with that slot's league rank — the fastest read of which lineup spots win a
 * matchup on their own and which ones are being carried.
 */
export function StartingLineupChart({ slots, slotRanks, leagueSize }: StartingLineupChartProps) {
  const maxValue = Math.max(1, ...slots.map((slot) => slot.value))

  if (slots.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No lineup slots configured</p>
  }

  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-[280px] overflow-x-auto pb-1">
      {slots.map((slot) => {
        const ranked = slotRanks[slot.id]
        const tone = toneForRank(ranked?.rank ?? leagueSize, leagueSize)
        const heightPct = Math.max(6, Math.round((slot.value / maxValue) * 100))

        return (
          <div key={slot.id} className="flex-1 min-w-[42px] flex flex-col items-center h-full">
            <div className="flex-1 w-full flex flex-col justify-end">
              <span className={`text-[10px] font-mono font-bold text-center mb-1 ${tone.text}`}>
                {ranked ? `#${ranked.rank}` : '—'}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-500 flex items-end justify-center ${tone.bar} opacity-80`}
                style={{ height: `${heightPct}%` }}
                title={
                  slot.player
                    ? `${slot.player.playerName} — ${Math.round(slot.value).toLocaleString()} value`
                    : 'Empty slot'
                }
              >
                <div className="mb-1">
                  <PlayerHeadshot
                    headshotUrl={slot.player?.headshot_url}
                    espnId={slot.player?.espn_id}
                    playerName={slot.player?.playerName}
                    size={28}
                    className="ring-1 ring-slate-900/40"
                  />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1.5">{slot.label}</span>
            <span
              className="text-[9px] text-slate-500 truncate max-w-[64px]"
              title={slot.player?.playerName}
            >
              {slot.player?.playerName.split(' ').slice(-1)[0] ?? '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
