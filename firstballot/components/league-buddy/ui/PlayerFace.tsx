'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'
import { playerImageSrc } from '@/lib/player-image'
import { useCacheVersion } from '@/lib/cache-version'
import type { PlayerData } from '../types'

/** Headshot on a position-colored wash. Falls back through ESPN and Sleeper, then an icon. */
export function PlayerFace({
  player,
  size = 56,
  className,
  rounded = 'rounded-2xl',
}: {
  player: Pick<PlayerData, 'headshot_url' | 'espn_id' | 'playerId' | 'position'>
  size?: number
  className?: string
  rounded?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const version = useCacheVersion()
  const palette = positionPalette[player.position] ?? neutralPalette
  const sources = [
    ...new Set(
      [
        player.headshot_url,
        player.espn_id
          ? `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`
          : null,
        `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`,
      ].filter(Boolean) as string[]
    ),
  ]
  const src = sources[attempt]
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden', rounded, className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(ellipse at 60% 25%, ${palette.glow}aa, ${palette.wash} 75%)`,
      }}
    >
      {src ? (
        <Image
          src={playerImageSrc(src, version)}
          alt=""
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover object-top"
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <Users className="m-auto h-1/2 w-1/2 opacity-40" style={{ color: palette.ink }} />
      )}
    </div>
  )
}
