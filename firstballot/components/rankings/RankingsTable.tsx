'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, User, Crown, Gem } from 'lucide-react'
import type { PlayerRanking, SortField } from '@/types/rankings'
import { getTierIcon } from './tierUtils'

interface RankingsTableProps {
  rankings: PlayerRanking[]
  sort: {
    field: SortField
    direction: string
    handleSort: (field: SortField) => void
  }
  isDiamondTier: (player: PlayerRanking) => boolean
  getRowBgColor: (player: PlayerRanking) => string
  getTierColor: (tier: string, isDiamond?: boolean) => string
  getTierDisplayName: (tier: string, isDiamond: boolean) => string
}

// Component for displaying player image with tier-based styling
function PlayerImageCell({
  player,
  size = 80,
  tierNum,
  isDiamond,
}: {
  player: PlayerRanking
  size?: number
  tierNum: number
  isDiamond: boolean
}) {
  const [imageError, setImageError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)

  const getInitials = (name?: string): string => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getImageUrl = (): string | null => {
    if (!imageError && player.headshot_url) {
      return player.headshot_url
    }
    if (imageError && !fallbackError && player.espn_id) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`
    }
    if (!player.headshot_url && player.espn_id && !fallbackError) {
      return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`
    }
    return null
  }

  const imageUrl = getImageUrl()

  // Get ring color based on tier (no glow)
  const getRingStyle = () => {
    if (isDiamond) return 'ring-2 ring-cyan-400/40'
    if (tierNum === 1) return 'ring-2 ring-amber-400/40'
    if (tierNum === 2) return 'ring-1 ring-purple-400/30'
    return 'ring-1 ring-white/10'
  }

  return (
    <div className="flex-shrink-0 relative">
      {!imageUrl || (imageError && fallbackError) ? (
        <div
          className={`flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 font-mono font-bold flex-shrink-0 ${getRingStyle()}`}
          style={{ width: size, height: size, fontSize: size * 0.3 }}
        >
          {player.player_name ? (
            getInitials(player.player_name)
          ) : (
            <User style={{ width: size * 0.4, height: size * 0.4 }} />
          )}
        </div>
      ) : (
        <img
          key={imageUrl}
          src={imageUrl || ''}
          alt={player.player_name || 'Player'}
          className={`object-cover flex-shrink-0 rounded-xl ${getRingStyle()}`}
          style={{ width: size, height: size, display: 'block' }}
          onError={() => {
            if (!imageError && player.headshot_url) {
              setImageError(true)
            } else if (imageError && !fallbackError) {
              setFallbackError(true)
            }
          }}
        />
      )}
      {/* Diamond sparkle indicator */}
      {isDiamond && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
          <Gem className="w-3 h-3 text-white" />
        </div>
      )}
      {/* Gold crown indicator */}
      {!isDiamond && tierNum === 1 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  )
}

export function RankingsTable({
  rankings,
  sort,
  isDiamondTier,
  getRowBgColor,
  getTierColor,
  getTierDisplayName,
}: RankingsTableProps) {
  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">No players found matching your filters.</div>
    )
  }

  return (
    <div className="overflow-x-auto pt-4 max-h-[800px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <table className="w-full border-separate border-spacing-y-3 px-1">
        <thead>
          <tr className="text-left">
            <th className="pb-4 pl-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              <button
                onClick={() => sort.handleSort('rank')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                Rank <ArrowUpDown className="h-2 w-2" />
              </button>
            </th>
            <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Player
            </th>
            <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 text-center">
              Pos
            </th>
            <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 hidden md:table-cell">
              Team
            </th>
            <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 hidden lg:table-cell">
              Metrics Breakdown
            </th>
            <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 text-right">
              <button
                onClick={() => sort.handleSort('total_score')}
                className="flex items-center justify-end gap-1 hover:text-white transition-colors ml-auto"
              >
                Value <ArrowUpDown className="h-2 w-2" />
              </button>
            </th>
            <th className="pb-4 pr-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 text-right">
              Tier
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((player) => {
            const isDiamond = isDiamondTier(player)
            const extractTierNumber = (tier: string): number => {
              const match = tier.match(/Tier (\d+)/)
              return match ? parseInt(match[1]) : 5
            }
            const tierNum = extractTierNumber(player.tier)

            const getTierStyles = () => {
              if (isDiamond)
                return {
                  accent: 'text-cyan-400',
                  bar: 'bg-cyan-500',
                  border: 'border-cyan-500/20',
                  bg: 'bg-slate-800/50',
                  hoverBg: 'group-hover:bg-slate-800/70',
                  rankBg: 'bg-cyan-500/15',
                }
              switch (tierNum) {
                case 1:
                  return {
                    accent: 'text-amber-400',
                    bar: 'bg-amber-500',
                    border: 'border-amber-500/15',
                    bg: 'bg-slate-800/50',
                    hoverBg: 'group-hover:bg-slate-800/70',
                    rankBg: 'bg-amber-500/15',
                  }
                case 2:
                  return {
                    accent: 'text-purple-400',
                    bar: 'bg-purple-500',
                    border: 'border-purple-500/12',
                    bg: 'bg-slate-800/40',
                    hoverBg: 'group-hover:bg-slate-800/60',
                    rankBg: 'bg-purple-500/10',
                  }
                case 3:
                  return {
                    accent: 'text-blue-400',
                    bar: 'bg-blue-500',
                    border: 'border-blue-500/10',
                    bg: 'bg-slate-800/35',
                    hoverBg: 'group-hover:bg-slate-800/55',
                    rankBg: 'bg-blue-500/8',
                  }
                default:
                  return {
                    accent: 'text-slate-400',
                    bar: 'bg-slate-600',
                    border: 'border-white/5',
                    bg: 'bg-slate-800/30',
                    hoverBg: 'group-hover:bg-slate-800/50',
                    rankBg: 'bg-slate-700/20',
                  }
              }
            }
            const styles = getTierStyles()

            const getRowClass = () => {
              return 'group relative transition-all duration-200 hover:translate-x-0.5'
            }

            return (
              <tr key={player.rank} className={getRowClass()}>
                {/* Rank */}
                <td
                  className={`py-4 pl-4 rounded-l-2xl ${styles.bg} ${styles.hoverBg} border-y border-l ${styles.border} transition-all duration-300`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${styles.rankBg}`}
                  >
                    <span className={`text-sm font-black font-mono ${styles.accent}`}>
                      #{player.rank}
                    </span>
                  </div>
                </td>

                {/* Player */}
                <td
                  className={`py-4 ${styles.bg} ${styles.hoverBg} border-y ${styles.border} transition-all duration-300`}
                >
                  <div className="flex items-center gap-3">
                    <PlayerImageCell
                      player={player}
                      size={52}
                      tierNum={tierNum}
                      isDiamond={isDiamond}
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm font-bold truncate font-mono tracking-tight ${isDiamond ? 'text-cyan-50' : tierNum === 1 ? 'text-amber-50' : 'text-white'}`}
                      >
                        {player.player_name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                        Age {player.age} <span className="opacity-30">•</span> {player.team}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Position */}
                <td
                  className={`py-4 ${styles.bg} ${styles.hoverBg} border-y ${styles.border} transition-all duration-300 text-center`}
                >
                  <span
                    className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-lg ${styles.bar} text-slate-900`}
                  >
                    {player.position}
                  </span>
                </td>

                {/* Team (Mobile hidden) */}
                <td
                  className={`py-4 ${styles.bg} ${styles.hoverBg} border-y ${styles.border} transition-all duration-300 hidden md:table-cell`}
                >
                  <span className="text-xs text-slate-400 font-mono">{player.team}</span>
                </td>

                {/* Metrics Breakdown (Desktop only) */}
                <td
                  className={`py-4 ${styles.bg} ${styles.hoverBg} border-y ${styles.border} transition-all duration-300 hidden lg:table-cell min-w-[200px]`}
                >
                  <div className="flex items-center gap-4">
                    {[
                      { label: 'F', val: player.recent_form_score || 75 },
                      { label: 'V', val: player.volume_score || 82 },
                      { label: 'E', val: player.epa_efficiency_score || 68 },
                      { label: 'D', val: player.draft_capital_score || 90 },
                    ].map((stat) => (
                      <div key={stat.label} className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[8px] text-slate-500 font-mono">{stat.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${styles.bar} ${isDiamond || tierNum <= 2 ? 'opacity-70' : 'opacity-40'}`}
                            style={{ width: `${stat.val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

                {/* Total Score */}
                <td
                  className={`py-4 ${styles.bg} ${styles.hoverBg} border-y ${styles.border} transition-all duration-300 text-right`}
                >
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-lg font-black font-mono leading-none ${isDiamond ? 'text-cyan-100' : tierNum === 1 ? 'text-amber-100' : 'text-white'}`}
                    >
                      {player.total_score.toLocaleString()}
                    </span>
                    <span className={`text-[9px] font-mono ${styles.accent} font-bold mt-1`}>
                      TOP {Math.round((player.rank / 300) * 100)}%
                    </span>
                  </div>
                </td>

                {/* Tier */}
                <td
                  className={`py-4 pr-4 rounded-r-2xl ${styles.bg} ${styles.hoverBg} border-y border-r ${styles.border} transition-all duration-300 text-right`}
                >
                  <Badge
                    variant="outline"
                    className={`${getTierColor(player.tier, isDiamond)} text-[10px] h-6 border-current/30`}
                  >
                    {getTierIcon(player.tier, isDiamond)}
                    <span className="hidden sm:inline ml-1 font-semibold">
                      {getTierDisplayName(player.tier, isDiamond)}
                    </span>
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
