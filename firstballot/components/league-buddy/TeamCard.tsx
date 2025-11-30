'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import type { TeamData } from './types'
import { GRADE_COLORS } from './types'

interface TeamCardProps {
  team: TeamData
  rank: number
  isSelected: boolean
  onSelect: (team: TeamData) => void
  positionRankings?: Record<string, number>
  getContenderTier: (grade: string, rank: number) => string
  getTierColor: (tier: string) => string
  getRankColor: (rank: number) => string
  variant?: 'mobile' | 'desktop' | 'compact'
}

export function TeamCard({
  team,
  rank,
  isSelected,
  onSelect,
  positionRankings = {},
  getContenderTier,
  getTierColor,
  getRankColor,
  variant = 'mobile',
}: TeamCardProps) {
  const contenderTier = getContenderTier(team.grade || 'F', rank)
  const qbRank = positionRankings['QB'] || 12
  const rbRank = positionRankings['RB'] || 12
  const wrRank = positionRankings['WR'] || 12
  const teRank = positionRankings['TE'] || 12
  const flexRank = positionRankings['FLEX'] || 12

  if (variant === 'compact') {
    // Compact variant for league standings list
    return (
      <div
        className={`p-3 rounded-lg border transition-all ${
          isSelected
            ? 'bg-yellow-400/10 border-yellow-400/30 ring-2 ring-yellow-400/20'
            : 'bg-slate-800 border-slate-600 hover:bg-slate-750'
        }`}
        onClick={() => onSelect(team)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`text-xl font-bold ${
                rank === 1
                  ? 'text-yellow-400'
                  : rank === 2
                    ? 'text-slate-300'
                    : rank === 3
                      ? 'text-orange-400'
                      : 'text-slate-400'
              }`}
            >
              #{rank}
            </div>
            <div>
              <div className={`font-semibold ${isSelected ? 'text-yellow-400' : 'text-slate-100'}`}>
                {team.teamName}
              </div>
              <div className="text-sm text-slate-400">
                {team.wins}-{team.losses} • {team.pointsFor.toFixed(1)} PF
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                team.gradeScore >= 70
                  ? 'text-green-400'
                  : team.gradeScore >= 50
                    ? 'text-blue-400'
                    : team.gradeScore >= 30
                      ? 'text-yellow-400'
                      : 'text-red-400'
              }`}
            >
              {team.grade}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'desktop') {
    // Desktop table row variant
    return (
      <tr
        className={`border-t border-slate-600 hover:bg-slate-600/50 cursor-pointer transition-all ${
          isSelected ? 'bg-yellow-400/10 border-yellow-400' : ''
        }`}
        onClick={() => onSelect(team)}
      >
        <td className="p-3">
          <div className="flex items-center space-x-3">
            <UserAvatar
              avatarId={team.ownerAvatar}
              displayName={team.ownerName}
              username={team.ownerUsername}
              size={32}
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="font-semibold text-slate-100 truncate">{team.teamName}</div>
              <div className="text-xs text-gray-400 truncate">{team.ownerName}</div>
            </div>
          </div>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getTierColor(contenderTier)} font-mono text-xs px-3 py-1 border`}
          >
            {contenderTier}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(rank)} font-mono text-sm px-2 py-1 border`}
          >
            {rank}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(qbRank)} font-mono text-sm px-2 py-1 border`}
          >
            {qbRank}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(rbRank)} font-mono text-sm px-2 py-1 border`}
          >
            {rbRank}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(wrRank)} font-mono text-sm px-2 py-1 border`}
          >
            {wrRank}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(teRank)} font-mono text-sm px-2 py-1 border`}
          >
            {teRank}
          </Badge>
        </td>
        <td className="p-3 text-center">
          <Badge
            variant="outline"
            className={`${getRankColor(flexRank)} font-mono text-sm px-2 py-1 border`}
          >
            {flexRank}
          </Badge>
        </td>
      </tr>
    )
  }

  // Mobile card variant (default)
  return (
    <Card
      className={`bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/80 cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-yellow-400/50 border-yellow-400/50' : ''
      }`}
      onClick={() => onSelect(team)}
    >
      <CardContent className="p-4">
        {/* Team Header */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Badge
              variant="outline"
              className={`${getRankColor(rank)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}
            >
              #{rank}
            </Badge>
            <UserAvatar
              avatarId={team.ownerAvatar}
              displayName={team.ownerName}
              username={team.ownerUsername}
              size={28}
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-100 text-xs truncate">
                {team.teamName.length > 18 ? team.teamName.substring(0, 15) + '...' : team.teamName}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {team.ownerName.length > 12
                  ? team.ownerName.substring(0, 9) + '...'
                  : team.ownerName}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getTierColor(contenderTier)} font-mono text-xs px-1.5 py-0.5 border flex-shrink-0`}
          >
            {contenderTier}
          </Badge>
        </div>

        {/* Position Rankings Grid */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'QB', rank: qbRank },
            { label: 'RB', rank: rbRank },
            { label: 'WR', rank: wrRank },
            { label: 'TE', rank: teRank },
            { label: 'FLEX', rank: flexRank },
          ].map(({ label, rank: posRank }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-slate-400 font-mono mb-1">{label}</div>
              <Badge
                variant="outline"
                className={`${getRankColor(posRank)} font-mono text-xs px-1 py-0.5 border w-full justify-center`}
              >
                {posRank}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
