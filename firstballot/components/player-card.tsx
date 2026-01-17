'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'

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
  const position = player.position || player.tier?.split(' ')[0] || ''
  const [imageError, setImageError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)

  // Get initials from player name
  const getInitials = (name?: string): string => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Determine which URL to use
  const getImageUrl = (): string | null => {
    // If primary image failed, try ESPN fallback
    if (imageError && !fallbackError && player.espnId) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`
    }

    // Use database URL if available
    if (player.headshotUrl && !imageError) {
      return player.headshotUrl
    }

    // Try ESPN fallback if no database URL
    if (!player.headshotUrl && player.espnId && !fallbackError) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`
    }

    return null
  }

  const imageUrl = getImageUrl()

  return (
    <Card className="bg-slate-800/95 border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Left: Headshot - Rectangular image with rounded corners */}
          <div className="flex-shrink-0">
            {!imageUrl || (imageError && fallbackError) ? (
              <div
                className="flex items-center justify-center rounded-lg bg-slate-700 text-slate-300 font-mono font-bold"
                style={{ width: 64, height: 64, fontSize: 20 }}
              >
                {player.name ? (
                  getInitials(player.name)
                ) : (
                  <User style={{ width: 32, height: 32 }} />
                )}
              </div>
            ) : (
              <div
                className="relative overflow-hidden rounded-lg bg-slate-700"
                style={{ width: 64, height: 64 }}
              >
                <img
                  key={imageUrl}
                  src={imageUrl || ''}
                  alt={player.name || 'Player'}
                  className="w-full h-full object-cover"
                  onError={() => {
                    if (!imageError && player.headshotUrl) {
                      setImageError(true)
                    } else if (imageError && !fallbackError) {
                      setFallbackError(true)
                    }
                  }}
                  style={{ display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* Right: Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-xl font-bold text-white">{player.name}</h3>
              {position && (
                <div className="px-2 py-0.5 rounded-full bg-slate-600/80 text-white text-xs font-medium">
                  {position}
                </div>
              )}
            </div>
            {player.team && <p className="text-sm text-slate-400">{player.team}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
