'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'

interface PlayerMatchupCardProps {
  playerName: string
  position: string
  matchup: string // e.g., "Minnesota Vikings @ Dallas Cowboys"
  headshotUrl?: string | null
  espnId?: string | number | null
  className?: string
}

export function PlayerMatchupCard({
  playerName,
  position,
  matchup,
  headshotUrl,
  espnId,
  className = '',
}: PlayerMatchupCardProps) {
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
    if (imageError && !fallbackError && espnId) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
    }

    // Use database URL if available
    if (headshotUrl && !imageError) {
      return headshotUrl
    }

    // Try ESPN fallback if no database URL
    if (!headshotUrl && espnId && !fallbackError) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
    }

    return null
  }

  const imageUrl = getImageUrl()

  return (
    <Card
      className={`bg-slate-800/95 border-slate-700 rounded-lg hover:border-slate-600 transition-colors ${className}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Left: Headshot - Larger rectangular image */}
          <div className="flex-shrink-0">
            {!imageUrl || (imageError && fallbackError) ? (
              <div
                className="flex items-center justify-center rounded-lg bg-slate-700 text-slate-300 font-mono font-bold"
                style={{ width: 64, height: 64, fontSize: 20 }}
              >
                {playerName ? getInitials(playerName) : <User style={{ width: 48, height: 48 }} />}
              </div>
            ) : (
              <div
                className="relative overflow-hidden rounded-lg bg-slate-700 flex-shrink-0"
                style={{ width: 64, height: 64 }}
              >
                <img
                  key={imageUrl}
                  src={imageUrl || ''}
                  alt={playerName || 'Player'}
                  className="w-full h-full object-cover"
                  onError={() => {
                    if (!imageError && headshotUrl) {
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
              <h3 className="text-xl font-bold text-white">{playerName}</h3>
              <div className="px-2 py-0.5 rounded-full bg-slate-600/80 text-white text-xs font-medium">
                {position}
              </div>
            </div>
            <p className="text-sm text-slate-400">{matchup}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
