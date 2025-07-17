"use client"

import Image from "next/image"
import { useState } from "react"

interface TeamLogoProps {
  team: string
  size?: number
  className?: string
}

const teamAbbreviations: { [key: string]: string } = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
}

export function TeamLogo({ team, size = 32, className = "" }: TeamLogoProps) {
  const [imageError, setImageError] = useState(false)
  const teamAbbr = teamAbbreviations[team] || team

  if (imageError) {
    // Fallback to team initials
    return (
      <div
        className={`bg-slate-700 rounded-full flex items-center justify-center font-mono font-bold text-gray-300 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs">{teamAbbr.slice(0, 2)}</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${teamAbbr.toLowerCase()}.png`}
        alt={`${team} logo`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={(e) => {
          setImageError(true)
          e.preventDefault()
        }}
        unoptimized
        priority={false}
      />
    </div>
  )
} 