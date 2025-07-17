"use client"

import { useState } from "react"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface UserAvatarProps {
  avatarId?: string
  displayName?: string
  username?: string
  size?: number
  className?: string
}

export function UserAvatar({ avatarId, displayName, username, size = 32, className = "" }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  // Get initials from display name or username
  const getInitials = () => {
    const name = displayName || username || "User"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  // If no avatar ID or image failed to load, show initials
  if (!avatarId || imageError) {
    return (
      <Avatar className={className} style={{ width: size, height: size }}>
        <AvatarFallback className="bg-slate-700 text-slate-300 text-xs font-bold">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={className} style={{ width: size, height: size }}>
      <AvatarImage
        src={`https://sleepercdn.com/avatars/${avatarId}`}
        alt={displayName || username || "User avatar"}
        onError={() => setImageError(true)}
      />
      <AvatarFallback className="bg-slate-700 text-slate-300 text-xs font-bold">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  )
} 