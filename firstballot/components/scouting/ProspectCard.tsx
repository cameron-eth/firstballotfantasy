'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { School, Star, GripVertical, Crown, Sparkles, TrendingUp, Gem } from 'lucide-react'
import { ComparisonBadges } from './ComparisonBadges'
import type { Prospect } from './types'

interface ProspectCardProps {
  prospect: Prospect
  onSelect: (prospect: Prospect) => void
  onCompare: (prospect: Prospect) => void
  isOnBoard?: boolean
  variant?: 'full' | 'compact' | 'mini'
  isDiamondTier?: boolean
}

// Utility functions
function formatHeight(heightInches: number | null): string {
  if (!heightInches) return '-'
  const feet = Math.floor(heightInches / 12)
  const inches = Math.round(heightInches % 12)
  return `${feet}'${inches}"`
}

function getGradeTier(prospect: Prospect): string {
  if (prospect.grade_tier) return prospect.grade_tier
  if (prospect.overall_grade) {
    if (prospect.overall_grade >= 90) return 'Elite'
    if (prospect.overall_grade >= 85) return 'Blue Chip'
    if (prospect.overall_grade >= 80) return 'Starter'
    if (prospect.overall_grade >= 70) return 'Rotational'
    if (prospect.overall_grade >= 60) return 'Backup'
    return 'Depth'
  }
  return 'Ungraded'
}

function getGradeStyles(grade: string): { text: string; bg: string; glow: string } {
  const styles: Record<string, { text: string; bg: string; glow: string }> = {
    Elite: {
      text: 'text-amber-300',
      bg: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20',
      glow: 'shadow-amber-500/20',
    },
    'Blue Chip': {
      text: 'text-emerald-300',
      bg: 'bg-gradient-to-r from-emerald-500/30 to-green-500/20',
      glow: 'shadow-emerald-500/20',
    },
    Starter: {
      text: 'text-blue-300',
      bg: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/20',
      glow: 'shadow-blue-500/20',
    },
    Rotational: {
      text: 'text-cyan-300',
      bg: 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20',
      glow: '',
    },
    Backup: {
      text: 'text-slate-300',
      bg: 'bg-slate-600/30',
      glow: '',
    },
    Depth: {
      text: 'text-slate-400',
      bg: 'bg-slate-700/30',
      glow: '',
    },
    Ungraded: {
      text: 'text-gray-400',
      bg: 'bg-slate-700/30',
      glow: '',
    },
  }
  return styles[grade] || styles['Ungraded']
}

function getTier(prospect: Prospect): string {
  if (prospect.tier) return prospect.tier
  const rank = prospect.rank
  if (rank <= 5) return 'Tier 1'
  if (rank <= 12) return 'Tier 2'
  if (rank <= 18) return 'Tier 3'
  if (rank <= 25) return 'Tier 4'
  return 'Tier 5'
}

function getTierStyles(tier: string): {
  badge: string
  card: string
  glow: string
  icon: React.ReactNode | null
} {
  if (tier === 'Tier 1') {
    return {
      badge:
        'bg-gradient-to-r from-amber-500/40 to-yellow-500/30 text-amber-200 border-amber-400/50',
      card: 'ring-1 ring-amber-500/40 bg-gradient-to-br from-slate-800 via-slate-800 to-amber-950/30',
      glow: 'shadow-lg shadow-amber-500/20',
      icon: <Crown className="h-3 w-3 text-amber-400" />,
    }
  }
  if (tier === 'Tier 2') {
    return {
      badge: 'bg-gradient-to-r from-blue-500/30 to-indigo-500/20 text-blue-200 border-blue-400/40',
      card: 'ring-1 ring-blue-500/20 bg-gradient-to-br from-slate-800 to-blue-950/20',
      glow: '',
      icon: <Sparkles className="h-3 w-3 text-blue-400" />,
    }
  }
  if (tier === 'Tier 3') {
    return {
      badge:
        'bg-gradient-to-r from-emerald-500/25 to-green-500/15 text-emerald-200 border-emerald-400/30',
      card: 'ring-1 ring-emerald-500/20 bg-gradient-to-br from-slate-800 to-emerald-950/15',
      glow: '',
      icon: null,
    }
  }
  if (tier === 'Tier 4') {
    return {
      badge:
        'bg-gradient-to-r from-purple-500/20 to-violet-500/15 text-purple-200 border-purple-400/30',
      card: 'ring-1 ring-purple-500/20 bg-gradient-to-br from-slate-800 to-purple-950/15',
      glow: '',
      icon: null,
    }
  }
  return {
    badge: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
    card: 'bg-slate-800/90 border-slate-600/50',
    glow: '',
    icon: null,
  }
}

function getTierHeaderBg(tier: string): string {
  if (tier === 'Tier 1') {
    return 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20'
  }
  if (tier === 'Tier 2') {
    return 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15'
  }
  if (tier === 'Tier 3') {
    return 'bg-gradient-to-r from-emerald-500/15 via-green-500/8 to-emerald-500/15'
  }
  if (tier === 'Tier 4') {
    return 'bg-gradient-to-r from-purple-500/12 via-violet-500/8 to-purple-500/12'
  }
  return 'bg-slate-700/50'
}

function getTierTextColor(tier: string): string {
  if (tier === 'Tier 1') {
    return 'text-amber-200'
  }
  if (tier === 'Tier 2') {
    return 'text-blue-200'
  }
  if (tier === 'Tier 3') {
    return 'text-emerald-200'
  }
  if (tier === 'Tier 4') {
    return 'text-purple-200'
  }
  return 'text-slate-300'
}

function getPositionStyles(position: string): string {
  const styles: Record<string, string> = {
    QB: 'bg-gradient-to-r from-red-500/30 to-rose-500/20 text-red-200 border-red-400/40',
    RB: 'bg-gradient-to-r from-emerald-500/30 to-green-500/20 text-emerald-200 border-emerald-400/40',
    WR: 'bg-gradient-to-r from-blue-500/30 to-sky-500/20 text-blue-200 border-blue-400/40',
    TE: 'bg-gradient-to-r from-orange-500/30 to-amber-500/20 text-orange-200 border-orange-400/40',
  }
  return styles[position] || 'bg-slate-600/30 text-slate-300 border-slate-500/30'
}

function getProjectedRound(rank: number): string {
  if (rank <= 12) return '1st'
  if (rank <= 24) return '2nd'
  if (rank <= 36) return '3rd'
  return 'Late'
}

function getValue(prospect: Prospect): number {
  if (prospect.valuation) return Math.round(prospect.valuation * 100) / 100
  const rank = prospect.rank
  if (rank <= 12) return Math.round((100 - (rank - 1) * 3) * 100) / 100
  if (rank <= 36) return Math.round((64 - (rank - 13) * 1.5) * 100) / 100
  return Math.round((28 - (rank - 37) * 0.5) * 100) / 100
}

export function ProspectCard({
  prospect,
  onSelect,
  onCompare,
  isOnBoard,
  variant = 'full',
  isDiamondTier = false,
}: ProspectCardProps) {
  const tier = getTier(prospect)
  const tierStyles = isDiamondTier
    ? {
        badge:
          'bg-cyan-500/30 text-cyan-100 border-cyan-400/50 font-bold shadow-lg shadow-cyan-400/30',
        card: 'ring-1 ring-cyan-500/40 bg-gradient-to-br from-slate-800 via-slate-800 to-cyan-950/30',
        glow: 'shadow-lg shadow-cyan-400/20',
        icon: <Gem className="h-3 w-3 text-cyan-300" />,
      }
    : getTierStyles(tier)
  const gradeTier = getGradeTier(prospect)
  const gradeStyles = getGradeStyles(gradeTier)

  const tierDisplayName = isDiamondTier ? 'Diamond Tier' : tier
  const tierTextColor = isDiamondTier ? 'text-cyan-100' : getTierTextColor(tier)
  const tierBgColor = isDiamondTier
    ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-cyan-500/20'
    : getTierHeaderBg(tier)

  if (variant === 'mini') {
    return (
      <div
        className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${
          isDiamondTier
            ? 'bg-gradient-to-br from-slate-800 to-cyan-950/30 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
            : tier === 'Tier 1'
              ? 'bg-gradient-to-br from-slate-800 to-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-500/10'
              : 'bg-slate-800/80 border-slate-600/50 hover:border-slate-500'
        }`}
        onClick={() => onSelect(prospect)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`${getPositionStyles(prospect.position)} text-[10px] px-1.5 border`}
            >
              {prospect.position}
            </Badge>
            {tierStyles.icon}
          </div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierStyles.badge} border`}>
            #{prospect.rank}
          </div>
        </div>
        <div className="font-semibold text-white text-sm">{prospect.name}</div>
        <div className="text-gray-400 text-xs">{prospect.school}</div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={`group rounded-lg border transition-all cursor-pointer hover:scale-[1.01] overflow-hidden ${tierStyles.card} ${tierStyles.glow} ${
          !tierStyles.card
            ? 'bg-slate-800/80 border-slate-600/50 hover:border-slate-500'
            : 'border-transparent'
        }`}
        onClick={() => onSelect(prospect)}
      >
        {/* Header section */}
        <div
          className={`px-2 pt-2 pb-1.5 ${tierBgColor} border-b ${tierStyles.glow ? 'border-current/20' : 'border-slate-600/30'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 flex-wrap">
              <Badge
                variant="outline"
                className={`${getPositionStyles(prospect.position)} text-[9px] px-1 py-0 border`}
              >
                {prospect.position}
              </Badge>
              <Badge
                variant="outline"
                className={`${tierStyles.badge} text-[9px] px-1 py-0 border flex items-center gap-0.5`}
              >
                {tierStyles.icon && <span className="text-[8px]">{tierStyles.icon}</span>}
                {tierDisplayName}
              </Badge>
            </div>
          </div>

          {/* Name header with rank and value in top right */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div
                className={`${tierTextColor} font-semibold text-xs leading-tight flex items-center gap-1 mb-0.5 truncate`}
              >
                {prospect.name}
                {isDiamondTier ? (
                  <Gem className="h-2.5 w-2.5 text-cyan-300 flex-shrink-0" />
                ) : (
                  tier === 'Tier 1' && (
                    <Crown className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                  )
                )}
                {prospect.overall_grade && (
                  <span
                    className={`${tierTextColor} font-semibold text-[10px] opacity-90 ml-0.5 flex-shrink-0`}
                  >
                    {prospect.overall_grade.toFixed(1)}
                  </span>
                )}
              </div>
              {/* School */}
              <div className="text-gray-400 text-[10px] flex items-center gap-0.5 truncate">
                <School className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{prospect.school || 'TBD'}</span>
              </div>
            </div>
            {/* Rank and Value in top right */}
            <div className="text-right ml-2 flex-shrink-0">
              <div className={`${tierTextColor} font-semibold text-[10px] opacity-80 mb-0.5`}>
                #{prospect.rank}
              </div>
              <div className={`${tierTextColor} font-bold text-xs`}>{getValue(prospect)}</div>
              <div className="text-gray-500 text-[9px]">value</div>
            </div>
          </div>
        </div>

        <div className="px-2 pt-1.5 pb-2">
          {/* All Comparisons */}
          {prospect.nfl_comparisons && (
            <div className="mt-1">
              <ComparisonBadges comparisons={prospect.nfl_comparisons} size="sm" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <Card
      className={`overflow-hidden border transition-all cursor-pointer group hover:scale-[1.01] ${tierStyles.card} ${tierStyles.glow} ${
        !tierStyles.card ? 'bg-slate-800/90 border-slate-600/50 hover:border-slate-500' : ''
      } !bg-transparent`}
      style={{ background: 'transparent' }}
      onClick={() => onSelect(prospect)}
    >
      <CardContent
        className="p-0 overflow-hidden !bg-transparent"
        style={{ background: 'transparent' }}
      >
        {/* Header section with name and rank */}
        <div
          className={`px-3 pt-3 pb-2 ${tierBgColor} border-b ${tierStyles.glow ? 'border-current/20' : 'border-slate-600/30'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Grade Tier Badge */}
              <Badge
                variant="outline"
                className={`${gradeStyles.bg} ${gradeStyles.text} border-current/30 text-[10px] font-semibold flex items-center gap-0.5 shadow-sm ${gradeStyles.glow}`}
              >
                {gradeTier === 'Elite' && <Sparkles className="h-2.5 w-2.5" />}
                {gradeTier}
              </Badge>
              {/* Position Badge */}
              <Badge
                variant="outline"
                className={`${getPositionStyles(prospect.position)} text-[10px] border`}
              >
                {prospect.position}
              </Badge>
              {/* Projected Round */}
              <Badge
                variant="outline"
                className="bg-slate-700/50 text-slate-300 border-slate-500/40 text-[10px]"
              >
                {getProjectedRound(prospect.rank)}
              </Badge>
              {/* Tier Badge */}
              <Badge
                variant="outline"
                className={`${tierStyles.badge} text-[10px] border font-semibold flex items-center gap-0.5`}
              >
                {tierStyles.icon && <span className="text-[9px]">{tierStyles.icon}</span>}
                {tierDisplayName}
              </Badge>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-gray-400" />
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-gray-400 hover:text-amber-400"
              >
                <Star className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>

          {/* Name header with rank in top right */}
          <div className="flex items-center justify-between">
            <h3
              className={`${tierTextColor} font-bold text-sm leading-tight flex items-center gap-1.5`}
            >
              {prospect.name}
              {isDiamondTier ? (
                <Gem className="h-3 w-3 text-cyan-300" />
              ) : (
                tier === 'Tier 1' && <Crown className="h-3 w-3 text-amber-400" />
              )}
            </h3>
            <span className={`${tierTextColor} font-semibold text-xs opacity-80`}>
              #{prospect.rank}
            </span>
          </div>

          {/* School */}
          <div className="flex items-center text-gray-400 text-[10px] mt-1">
            <School className="h-2.5 w-2.5 mr-0.5" />
            <span>{prospect.school || 'TBD'}</span>
          </div>
        </div>

        <div className="px-3 pt-2 pb-3">
          {/* Stats section - PRO style gradient box matching header */}
          <div
            className={`rounded-lg p-2 mb-2 border ${tierBgColor} ${tierStyles.glow ? 'border-current/20' : 'border-slate-600/30'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <div className={`text-base font-bold ${tierTextColor}`}>{getValue(prospect)}</div>
                <div className="text-gray-500 text-[9px]">Dynasty Value</div>
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${tierTextColor}`}>
                  {prospect.overall_grade?.toFixed(1) || '-'}
                </div>
                <div className="text-gray-500 text-[9px]">{gradeTier}</div>
              </div>
            </div>

            {/* Physical attributes */}
            {(prospect.height || prospect.weight) && (
              <div className="flex justify-center gap-3 text-[9px] text-gray-400 border-t border-white/10 pt-1.5 mt-1.5">
                {prospect.height && <span>{formatHeight(prospect.height)}</span>}
                {prospect.weight && <span>{prospect.weight} lbs</span>}
              </div>
            )}
          </div>

          {/* NFL Comparisons - Show All */}
          {prospect.nfl_comparisons && (
            <div className="mb-2">
              <div className="text-gray-500 text-[9px] uppercase tracking-wide mb-1 flex items-center gap-0.5">
                <TrendingUp className="h-2.5 w-2.5" />
                Comparisons
              </div>
              <ComparisonBadges comparisons={prospect.nfl_comparisons} size="sm" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className={`${tierStyles.badge} hover:opacity-90 transition-all flex-1 border font-semibold text-[10px] h-7`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(prospect)
              }}
            >
              {tierStyles.icon && <span className="text-[9px]">{tierStyles.icon}</span>}
              <span className="ml-0.5">{tierDisplayName}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-gray-300 bg-slate-700/50 hover:border-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all text-[10px] h-7"
              onClick={(e) => {
                e.stopPropagation()
                onCompare(prospect)
              }}
            >
              Compare
            </Button>
          </div>

          {/* On board indicator */}
          {isOnBoard && (
            <div className="text-center mt-1.5">
              <span className="text-blue-400 text-[10px] flex items-center justify-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> On Your Board
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export for Draft Board list item - Compact style
export function DraftBoardItem({
  prospect,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDiamondTier = false,
}: {
  prospect: Prospect
  index: number
  onRemove: () => void
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, index: number) => void
  isDiamondTier?: boolean
}) {
  const tier = getTier(prospect)
  const tierStyles = getTierStyles(tier)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver?.(e)
      }}
      onDrop={(e) => onDrop?.(e, index)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${tierStyles.card} ${tierStyles.glow} ${
        !tierStyles.card ? 'bg-slate-800/80 border-slate-600/50 hover:border-slate-500' : ''
      }`}
    >
      {/* Board position */}
      <div
        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          tier === 'Tier 1'
            ? 'bg-amber-500/30 text-amber-300'
            : tier === 'Tier 2'
              ? 'bg-blue-500/30 text-blue-300'
              : 'bg-slate-700 text-slate-400'
        }`}
      >
        {index + 1}
      </div>

      {/* Position badge */}
      <Badge
        variant="outline"
        className={`${getPositionStyles(prospect.position)} text-[10px] px-1.5 py-0.5 flex-shrink-0`}
      >
        {prospect.position}
      </Badge>

      {/* Name and school */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`${getTierTextColor(tier)} font-semibold text-sm truncate`}>
            {prospect.name}
          </span>
          {tier === 'Tier 1' && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
          {isDiamondTier && <Gem className="h-3 w-3 text-cyan-400 flex-shrink-0" />}
        </div>
        <div className="text-gray-500 text-[10px] truncate">{prospect.school || 'TBD'}</div>
      </div>

      {/* Rank & Value */}
      <div className="text-right flex-shrink-0">
        <div className={`${getTierTextColor(tier)} font-bold text-sm`}>#{prospect.rank}</div>
        <div className="text-gray-500 text-[10px]">{getValue(prospect)}</div>
      </div>

      {/* Drag handle and remove */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <GripVertical className="h-4 w-4 text-gray-600" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="w-5 h-5 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all flex items-center justify-center text-xs"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// Export for Add Prospects list in Draft Board - Compact style
export function AddProspectItem({
  prospect,
  isOnBoard,
  onClick,
  isDiamondTier = false,
}: {
  prospect: Prospect
  isOnBoard: boolean
  onClick: () => void
  isDiamondTier?: boolean
}) {
  const tier = getTier(prospect)
  const tierStyles = getTierStyles(tier)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOnBoard) {
      onClick()
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${
        isOnBoard
          ? 'bg-slate-700/30 border-blue-500/30 opacity-50 cursor-not-allowed'
          : `cursor-pointer hover:border-amber-400/50 ${tierStyles.card} ${tierStyles.glow} ${
              !tierStyles.card ? 'bg-slate-800/80 border-slate-600/50' : ''
            }`
      }`}
      onClick={handleClick}
    >
      {/* Position */}
      <Badge
        variant="outline"
        className={`${getPositionStyles(prospect.position)} text-[9px] px-1 py-0 flex-shrink-0`}
      >
        {prospect.position}
      </Badge>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`${getTierTextColor(tier)} font-semibold text-xs truncate`}>
            {prospect.name}
          </span>
          {tier === 'Tier 1' && <Crown className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
          {isDiamondTier && <Gem className="h-2.5 w-2.5 text-cyan-400 flex-shrink-0" />}
        </div>
        <div className="text-gray-500 text-[9px] truncate">{prospect.school}</div>
      </div>

      {/* Rank */}
      <div
        className={`${tierStyles.badge} text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0`}
      >
        #{prospect.rank}
      </div>

      {/* On board indicator */}
      {isOnBoard && <Sparkles className="h-3 w-3 text-blue-400 flex-shrink-0" />}
    </div>
  )
}
