'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown } from 'lucide-react'
import type { PlayerRanking, SortField } from '@/types/rankings'
import { getTierIcon } from './tierUtils'
import { PlayerHeadshot } from '@/components/ui/player-headshot'

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
    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
      <table className="w-full border-collapse bg-transparent">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
              <button
                onClick={() => sort.handleSort('rank')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                Rank
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
              <button
                onClick={() => sort.handleSort('player_name')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                Player
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
              Position
            </th>
            {/* Hidden on mobile */}
            <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
              Team
            </th>
            <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
              <button
                onClick={() => sort.handleSort('age')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                Age
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
              <button
                onClick={() => sort.handleSort('total_score')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                Total Score
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </th>
            <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
              Tier
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((player) => {
            const isDiamond = isDiamondTier(player)
            const rowBg = getRowBgColor(player)
            return (
              <tr
                key={player.rank}
                className={`border-b border-slate-700/50 hover:bg-slate-700/40 transition-all ${rowBg}`}
              >
                <td className="py-3 px-2 sm:px-4 text-white font-mono font-semibold text-sm">
                  #{player.rank}
                </td>
                <td className="py-3 px-2 sm:px-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${
                        player.position === 'QB' ? 'from-pink-600/30 to-purple-900/50' :
                        player.position === 'RB' ? 'from-teal-600/30 to-emerald-900/50' :
                        player.position === 'WR' ? 'from-blue-600/30 to-indigo-900/50' :
                        'from-purple-600/30 to-violet-900/50'
                      }`} />
                      <PlayerHeadshot
                        headshotUrl={player.headshot_url}
                        espnId={player.espn_id}
                        playerName={player.player_name}
                        size={40}
                        className="relative z-10"
                      />
                    </div>
                    <span className="text-white font-semibold text-sm">{player.player_name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 sm:px-4">
                  <Badge
                    variant="outline"
                    className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs"
                  >
                    {player.position}
                  </Badge>
                </td>
                {/* Hidden on mobile */}
                <td className="hidden md:table-cell py-3 px-4 text-gray-400 text-sm">
                  {player.team}
                </td>
                <td className="hidden md:table-cell py-3 px-4 text-gray-300 text-sm">
                  {player.age}
                </td>
                <td className="hidden md:table-cell py-3 px-4 text-white font-mono text-sm">
                  {player.total_score.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="hidden md:table-cell py-3 px-4">
                  <Badge variant="outline" className={getTierColor(player.tier, isDiamond)}>
                    {getTierIcon(player.tier, isDiamond)}
                    {getTierDisplayName(player.tier, isDiamond)}
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
