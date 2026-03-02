'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Player, getPlayerImageUrl, getTierColor } from '@/lib/players'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  player: Player
  index: number
}

export function PlayerCard({ player, index }: PlayerCardProps) {
  const [imageError, setImageError] = useState(false)
  const tierColor = getTierColor(player.tier)
  const imageUrl = getPlayerImageUrl(player)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors duration-300"
    >
      {/* Tier Badge */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={cn(
            'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border',
            tierColor.bg,
            tierColor.text,
            tierColor.border
          )}
        >
          {player.tier}
        </span>
      </div>

      {/* Player Image */}
      <div className="relative h-48 bg-secondary/30 flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-[1]" />
        {!imageError && imageUrl ? (
          <Image
            src={imageUrl}
            alt={player.name}
            width={200}
            height={200}
            className="object-contain object-bottom scale-110 group-hover:scale-115 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-muted-foreground/20">
              {player.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(index * 0.03, 0.5) + 0.2 }}
          className="absolute bottom-2 left-3 z-10"
        >
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded border',
              player.isCollege
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border'
            )}
          >
            {player.year} {player.isCollege ? 'PROSPECT' : 'CLASS'}
          </span>
        </motion.div>
      </div>

      {/* Player Info */}
      <div className="p-4">
        <h3 className="font-mono text-lg font-bold text-foreground tracking-tight mb-0.5 truncate">
          {player.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {player.school}
          {player.height && ` • ${player.height}`}
          {player.weight && player.weight > 0 && ` • ${player.weight} lbs`}
        </p>

        {/* Grade + 40 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-primary">
                {player.grade.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">Grade</span>
            </div>
          </div>
          {player.fortyTime && (
            <div className="text-right">
              <span className="text-lg font-mono font-semibold text-foreground">
                {player.fortyTime.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">40-YD</span>
            </div>
          )}
        </div>

        {/* Stats Bars */}
        <div className="space-y-2">
          <StatBar
            label="PROD"
            value={player.production}
            delay={Math.min(index * 0.03, 0.5) + 0.3}
          />
          <StatBar label="PHYS" value={player.physical} delay={Math.min(index * 0.03, 0.5) + 0.4} />
        </div>
      </div>
    </motion.div>
  )
}

function StatBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      <span className="text-xs font-mono text-foreground w-6 text-right">{Math.round(value)}</span>
    </div>
  )
}
