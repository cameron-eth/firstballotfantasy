'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { School, Star, GripVertical, Crown, Sparkles, TrendingUp, Gem } from 'lucide-react'
import { ComparisonBadges } from './ComparisonBadges'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import type { Prospect } from './types'

interface ProspectCardProps {
  prospect: Prospect
  onSelect: (prospect: Prospect) => void
  onCompare: (prospect: Prospect) => void
  isOnBoard?: boolean
  variant?: 'full' | 'compact' | 'mini' | 'dossier'
  isDiamondTier?: boolean
  positionNeed?: number
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
  isOnBoard = false,
  variant = 'full',
  isDiamondTier = false,
  positionNeed = 0,
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

  // Meaningful Data: Calculate "Market Opportunity"
  // Logic: If grade is high but rank is relatively lower, it's a "Steal"
  const marketOpportunity = useMemo(() => {
    if (!prospect.overall_grade) return 0
    const expectedRank = 100 - (prospect.overall_grade - 50) * 2 // Very rough heuristic
    return Math.max(0, expectedRank - prospect.rank)
  }, [prospect.overall_grade, prospect.rank])

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

  if (variant === 'dossier') {
    // Format physical attributes
    const heightDisplay = prospect.height
      ? `${Math.floor(prospect.height / 12)}'${Math.round(prospect.height % 12)}"`
      : null
    const weightDisplay = prospect.weight ? `${prospect.weight} lbs` : null

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${tierStyles.card} ${tierStyles.glow} ${
          !tierStyles.card
            ? 'bg-[#0a0f1a] border-white/[0.06] hover:border-blue-500/30 shadow-2xl'
            : ''
        }`}
        onClick={() => onSelect(prospect)}
      >
        {/* Top Accent Bar */}
        <div
          className={`h-1 w-full ${isDiamondTier ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400' : tier === 'Tier 1' ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500' : 'bg-gradient-to-r from-blue-500/50 via-blue-400/30 to-blue-500/50'}`}
        />

        <div className="p-4 relative z-10 h-full flex flex-col min-h-[240px]">
          {/* Header: Headshot + Info */}
          <div className="flex gap-4 mb-4">
            {/* Headshot */}
            <div className="relative flex-shrink-0">
              <PlayerHeadshot
                headshotUrl={prospect.headshot_url}
                espnId={prospect.espn_id}
                playerName={prospect.name}
                size={80}
                className="rounded-xl border border-white/10 shadow-xl group-hover:border-blue-500/40 transition-all"
              />
              {/* Jersey Number Badge */}
              {prospect.jersey && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-slate-950 border border-white/10 flex items-center justify-center">
                  <span className="text-[9px] font-black text-white font-mono">
                    #{prospect.jersey}
                  </span>
                </div>
              )}
            </div>

            {/* Name & School */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant="outline"
                  className={`${getPositionStyles(prospect.position)} text-[8px] px-1.5 py-0 border-none font-black uppercase tracking-tight bg-white/5 rounded`}
                >
                  {prospect.position}
                </Badge>
                <span className={`text-[9px] font-black font-mono ${tierTextColor}`}>
                  #{prospect.rank}
                </span>
              </div>

              <h4 className="text-lg font-black text-white font-mono uppercase leading-tight tracking-tight truncate group-hover:text-blue-400 transition-colors">
                {prospect.name}
              </h4>

              <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[10px] font-mono font-bold uppercase tracking-wide">
                <School className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{prospect.school || 'TBD'}</span>
              </div>
            </div>
          </div>

          {/* Physical Attributes Row */}
          <div className="flex items-center gap-3 mb-4 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.03]">
            {heightDisplay && (
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-600 font-mono uppercase tracking-wider">
                  HT
                </span>
                <span className="text-xs font-black text-white font-mono">{heightDisplay}</span>
              </div>
            )}
            {weightDisplay && (
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-600 font-mono uppercase tracking-wider">
                  WT
                </span>
                <span className="text-xs font-black text-white font-mono">{weightDisplay}</span>
              </div>
            )}
            {!heightDisplay && !weightDisplay && (
              <span className="text-[10px] text-slate-600 font-mono">Measurables TBD</span>
            )}
            <div className="flex-1" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-600 font-mono uppercase tracking-wider">
                Value
              </span>
              <span className="text-xs font-black text-blue-400 font-mono">
                {getValue(prospect)}
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer: Grade Bar */}
          <div className="pt-3 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${gradeStyles.bg.includes('amber') ? 'bg-amber-400' : gradeStyles.bg.includes('emerald') ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse`}
                />
                <span className="text-[10px] font-black text-white font-mono uppercase">
                  {gradeTier}
                </span>
              </div>
              <span className={`text-xs font-black font-mono ${gradeStyles.text}`}>
                {prospect.overall_grade?.toFixed(0) || '--'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full ${gradeStyles.bg} transition-all duration-1000 ease-out`}
                style={{ width: `${prospect.overall_grade || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subtle Position Watermark */}
        <div className="absolute bottom-2 right-3 font-mono text-[60px] font-black text-white/[0.015] select-none pointer-events-none uppercase leading-none">
          {prospect.position}
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <Card
      className={`overflow-hidden border transition-all cursor-pointer group hover:scale-[1.01] ${tierStyles.card} ${tierStyles.glow} ${
        !tierStyles.card ? 'bg-slate-800/90 border-slate-600/50 hover:border-slate-500' : ''
      } !bg-transparent backdrop-blur-md`}
      style={{ background: 'transparent' }}
      onClick={() => onSelect(prospect)}
    >
      <CardContent
        className="p-0 overflow-hidden !bg-transparent"
        style={{ background: 'transparent' }}
      >
        {/* Modern Header: Tier-specific backdrop and better badge grouping */}
        <div
          className={`px-4 pt-4 pb-3 ${tierBgColor} border-b ${tierStyles.glow ? 'border-current/20' : 'border-slate-600/30'} relative overflow-hidden`}
        >
          {/* Subtle background icon */}
          <div className="absolute -top-2 -right-2 opacity-5 scale-150 rotate-12">
            {tierStyles.icon || <TrendingUp className="h-20 w-20" />}
          </div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`${tierStyles.badge} text-[9px] px-2 py-0.5 border font-black uppercase tracking-widest flex items-center gap-1`}
              >
                {tierStyles.icon}
                {tierDisplayName}
              </Badge>
              <Badge
                variant="outline"
                className={`${getPositionStyles(prospect.position)} text-[10px] px-2 border font-bold`}
              >
                {prospect.position}
              </Badge>
              {/* Roster Alignment Analysis */}
              {positionNeed >= 3 && (
                <Badge
                  variant="outline"
                  className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px] font-black uppercase tracking-tighter animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  Critical Need
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 bg-slate-950/40 rounded-full px-2 py-0.5 border border-white/5">
              <span className={`${tierTextColor} font-mono font-black text-xs`}>
                #{prospect.rank}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <h3 className="text-xl font-black text-white leading-tight font-mono tracking-tight group-hover:translate-x-1 transition-transform">
              {prospect.name}
            </h3>
            <div className="flex items-center text-gray-400 text-[10px] mt-1 uppercase tracking-tighter font-mono">
              <School className="h-3 w-3 mr-1 text-gray-500" />
              <span>{prospect.school || 'TBD'}</span>
              <span className="mx-1.5 opacity-30">•</span>
              <span>{getProjectedRound(prospect.rank)} ROUND</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 relative z-10">
          {/* Market Analysis: surfacing meaningful value gaps */}
          {marketOpportunity > 10 && (
            <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
                  Market Steal
                </span>
              </div>
              <span className="text-[9px] font-mono text-blue-400">
                +{marketOpportunity.toFixed(0)} Index Delta
              </span>
            </div>
          )}

          {/* Enhanced Grade Visualizer */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col justify-center">
              <div className="text-[9px] text-gray-500 uppercase font-mono tracking-widest mb-1">
                Dynasty Value
              </div>
              <div className="flex items-end gap-1">
                <div className={`text-2xl font-black ${tierTextColor} leading-none font-mono`}>
                  {getValue(prospect)}
                </div>
                <div className="text-[10px] text-gray-600 font-mono mb-0.5">PTS</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <div className="text-[9px] text-gray-500 uppercase font-mono tracking-widest">
                  {gradeTier}
                </div>
                <div className={`text-xs font-black ${gradeStyles.text} font-mono`}>
                  {prospect.overall_grade?.toFixed(1) || '-'}
                </div>
              </div>
              {/* Visual Grade Bar */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${gradeStyles.bg} opacity-80`}
                  style={{ width: `${prospect.overall_grade || 50}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 opacity-40">
                <span className="text-[7px] text-gray-500 font-mono">50</span>
                <span className="text-[7px] text-gray-500 font-mono">100</span>
              </div>
            </div>
          </div>

          {/* Physical Attributes with Better UI */}
          {(prospect.height || prospect.weight) && (
            <div className="flex items-center gap-4 mb-4 px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                <span className="text-[10px] text-gray-400 font-mono">
                  {formatHeight(prospect.height)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                <span className="text-[10px] text-gray-400 font-mono">{prospect.weight} LBS</span>
              </div>
            </div>
          )}

          {/* Comparisons: More Visual Style */}
          {prospect.nfl_comparisons && (
            <div className="mb-5">
              <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1 font-mono">
                <TrendingUp className="h-2.5 w-2.5 opacity-50" />
                Historical Comps
              </div>
              <div className="bg-slate-900/40 rounded-lg p-2 border border-white/5">
                <ComparisonBadges comparisons={prospect.nfl_comparisons} size="sm" />
              </div>
            </div>
          )}

          {/* Actions: High-end button styles */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`flex-[2] ${tierStyles.badge} border shadow-lg transition-all active:scale-95 font-black text-[10px] h-8 uppercase tracking-widest`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(prospect)
              }}
            >
              <Gem className="h-3 w-3 mr-1" />
              Analyze
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-slate-700 text-gray-400 bg-slate-800/50 hover:border-blue-400/50 hover:text-blue-300 transition-all h-8 text-[10px] uppercase font-mono tracking-tighter"
              onClick={(e) => {
                e.stopPropagation()
                onCompare(prospect)
              }}
            >
              Compare
            </Button>
          </div>

          {/* Status Indicator */}
          {isOnBoard && (
            <div className="mt-3 flex items-center justify-center gap-2 py-1 bg-blue-500/5 rounded-full border border-blue-500/10">
              <Sparkles className="h-2.5 w-2.5 text-blue-400 animate-pulse" />
              <span className="text-blue-300 text-[9px] font-black uppercase tracking-widest">
                On Draft Board
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
