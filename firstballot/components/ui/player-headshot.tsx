'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface PlayerHeadshotProps {
  /** Direct headshot URL from database */
  headshotUrl?: string | null
  /** ESPN athlete ID for fallback */
  espnId?: string | number | null
  /** Player name for initials fallback */
  playerName?: string
  /** Size in pixels */
  size?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Player headshot component with multiple fallbacks:
 * 1. Database headshot_url (preferred)
 * 2. ESPN CDN using athlete ID
 * 3. Player initials
 * 4. Generic user icon
 */
export function PlayerHeadshot({
  headshotUrl,
  espnId,
  playerName,
  size = 40,
  className = '',
}: PlayerHeadshotProps) {
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

  // Show initials/icon fallback
  if (!imageUrl || (imageError && fallbackError)) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-slate-700 text-slate-300 font-mono font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {playerName ? (
          getInitials(playerName)
        ) : (
          <User style={{ width: size * 0.5, height: size * 0.5 }} />
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-slate-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageUrl}
        alt={playerName || 'Player'}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => {
          if (!imageError) {
            setImageError(true)
          } else {
            setFallbackError(true)
          }
        }}
        unoptimized // ESPN CDN images don't need optimization
      />
    </div>
  )
}
