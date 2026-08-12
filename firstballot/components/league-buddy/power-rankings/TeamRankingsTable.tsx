'use client'

import type { TeamPowerRanking } from '@/lib/sleeper-sdk'
import type { TeamData } from '../types'

interface TeamRankingsTableProps {
  rankings: TeamPowerRanking[]
  teamsById: Map<number, TeamData>
  selectedRosterId: number | null
  onTeamSelect: (team: TeamData) => void
}

/** Power-ranking leaderboard: every roster scored 0–100 against the league's best. */
export function TeamRankingsTable({
  rankings,
  teamsById,
  selectedRosterId,
  onTeamSelect,
}: TeamRankingsTableProps) {
  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-700/60">
            <th className="text-left px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-300 w-12">
              Rk
            </th>
            <th className="text-left px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-300">
              Team
            </th>
            <th className="text-right px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-300 w-16">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((entry) => {
            const team = teamsById.get(entry.rosterId)
            if (!team) return null
            const isSelected = entry.rosterId === selectedRosterId

            return (
              <tr
                key={entry.rosterId}
                onClick={() => onTeamSelect(team)}
                className={`cursor-pointer border-t border-slate-700/60 transition-colors ${
                  isSelected ? 'bg-yellow-400/15' : 'hover:bg-slate-700/40'
                }`}
              >
                <td
                  className={`px-3 py-2.5 font-mono text-sm ${
                    isSelected ? 'text-yellow-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {entry.rank}.
                </td>
                <td
                  className={`px-3 py-2.5 text-sm truncate max-w-[180px] ${
                    isSelected ? 'text-yellow-400 font-bold' : 'text-slate-200'
                  }`}
                  title={team.teamName}
                >
                  {team.teamName}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${
                    isSelected ? 'text-yellow-400' : 'text-slate-200'
                  }`}
                >
                  {entry.score}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
