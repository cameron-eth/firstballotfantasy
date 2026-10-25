'use client'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
interface Player {
  name: string
  tier: string
  ppg: number
  predicted: number
  error: string
  team: string
  playerId?: string
  position?: string
  jerseyNumber?: string | number
  headshotUrl?: string | null
  espnId?: string | number | null
  statusTag?: string // e.g., "STRONG START", "AVERAGE", etc.
  byeWeek?: string | number
}

interface PlayerCardProps {
  player: Player
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <PlayerTradingCard
      name={player.name}
      position={player.position || player.tier?.split(' ')[0] || 'NFL'}
      team={player.team}
      image={
        player.headshotUrl ||
        (player.espnId
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`
          : player.playerId
            ? `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`
            : null)
      }
      badge={player.statusTag || player.tier}
      label="Season performance"
    >
      <div className="flex justify-between border-t border-white/10 pt-3">
        <span>
          FPPG <strong className="text-white">{player.ppg.toFixed(1)}</strong>
        </span>
        <span>
          Projected <strong className="text-white">{player.predicted.toFixed(1)}</strong>
        </span>
      </div>
    </PlayerTradingCard>
  )
}
