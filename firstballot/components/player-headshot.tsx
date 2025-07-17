"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { TeamLogo } from "./team-logo"
import { loadEspnPlayersData, getEspnId } from "@/lib/player-utils"

interface PlayerHeadshotProps {
  playerId?: string
  playerName: string
  teamLogo?: string
  size?: number
  className?: string
  player?: any // Full player object for ESPN ID lookup
}

export function PlayerHeadshot({ playerId, playerName, teamLogo, size = 32, className = "", player }: PlayerHeadshotProps) {
  const [imageError, setImageError] = useState(false)
  const [espnPlayersData, setEspnPlayersData] = useState<any[]>([])
  const [resolvedPlayerId, setResolvedPlayerId] = useState<string | undefined>(playerId)

  // Load ESPN players data on mount
  useEffect(() => {
    loadEspnPlayersData().then(data => {
      setEspnPlayersData(data)
    })
  }, [])

  // Resolve player ID with fallback when ESPN data is loaded
  useEffect(() => {
    if (espnPlayersData.length > 0 && !resolvedPlayerId && player) {
      const espnId = getEspnId(player, espnPlayersData)
      if (espnId) {
        setResolvedPlayerId(espnId)
      }
    }
  }, [espnPlayersData, resolvedPlayerId, player])

  if (!resolvedPlayerId || imageError) {
    // Fallback to team logo if no player ID or image fails to load
    return teamLogo ? (
      <TeamLogo team={teamLogo} size={size} className={className} />
    ) : (
      <div
        className={`bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
          {playerName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={`https://a.espncdn.com/i/headshots/nfl/players/full/${resolvedPlayerId}.png`}
        alt={`${playerName} headshot`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={(e) => {
          // Silently handle 404 errors to reduce console noise
          setImageError(true)
          // Prevent the error from bubbling up to console
          e.preventDefault()
        }}
        unoptimized
        priority={false}
      />
    </div>
  )
} 