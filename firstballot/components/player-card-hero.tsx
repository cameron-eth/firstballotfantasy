'use client'

import { useState } from 'react'
import { TrendingUp, Target } from 'lucide-react'

interface PlayerCardHeroProps {
  playerName?: string
  position?: string
  team?: string
  stats?: {
    label: string
    value: string
  }[]
  imageUrl?: string
}

export default function PlayerCardHero({
  playerName = 'Malik Nabers',
  position = 'WR',
  team = 'NYG',
  stats = [
    { label: 'REC', value: '109' },
    { label: 'YDS', value: '1,204' },
    { label: 'TD', value: '7' },
  ],
  imageUrl = '/2486779-malik-nabers.webp',
}: PlayerCardHeroProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative border border-border rounded-lg overflow-hidden transition-all duration-500 hover:border-foreground/50 max-w-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden bg-muted/10">
        <img
          src={imageUrl}
          alt={`${playerName} - ${position}`}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover object-top transition-transform duration-700 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Top Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="px-3 py-1 text-xs font-mono bg-background/80 backdrop-blur-sm border border-border rounded-full">
            {position}
          </div>
          <div className="px-3 py-1 text-xs font-mono bg-background/80 backdrop-blur-sm border border-border rounded-full">
            {team}
          </div>
        </div>

        {/* Trending Badge */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-foreground text-background rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span>Trending</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Player Info */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-light">{playerName}</h3>
            <Target className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div className="text-xs text-muted-foreground font-mono">ROOKIE SEASON / 2024</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/50">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-xl font-light">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-mono">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Projection Bar */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">PROJECTION</span>
            <span className="text-foreground">WR1 UPSIDE</span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-1000"
              style={{
                width: isHovered ? '85%' : '0%',
                transitionDelay: isHovered ? '200ms' : '0ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
