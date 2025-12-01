'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target } from 'lucide-react'
import type { TeamData } from './types'
import { calculatePlayoffOdds } from './utils/playoffOdds'

interface ScheduleMap {
  [week: number]: {
    [rosterId: number]: number // opponent rosterId
  }
}

interface PlayoffOddsSectionProps {
  teams: TeamData[]
  currentWeek: number
  totalWeeks?: number
  playoffSpots?: number
  schedule?: ScheduleMap
}

interface PlayoffPath {
  status: 'clinched' | 'controls' | 'needs' | 'longshot' | 'eliminated'
  message: string
  details?: string[]
}

// Helper to get short team name (first word or truncate)
function getShortName(teamName: string): string {
  // Remove emojis and get first meaningful word
  const cleaned = teamName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
  const words = cleaned.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return teamName.slice(0, 10)
  // If first word is short, combine with second
  if (words[0].length <= 3 && words.length > 1) {
    return `${words[0]} ${words[1]}`.slice(0, 15)
  }
  return words[0].slice(0, 12)
}

interface PlayoffScenario {
  teamMustWin: number // How many games team must win
  teamsNeedToLose: { teamName: string; losses: number }[] // Which teams need to lose
  pfNeeded?: number // If tied, PF gap to close
  keyMatchups: string[] // Direct matchups that matter
  probability: 'likely' | 'possible' | 'unlikely' | 'miracle'
}

function calculateExactPath(
  team: {
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    rank: number
    playoffProbability: number
  },
  allTeams: {
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    rank: number
    playoffProbability: number
  }[],
  spots: number,
  currentWeek: number,
  totalWeeks: number,
  schedule?: ScheduleMap,
  teamsData?: TeamData[]
): PlayoffScenario | null {
  const remainingWeeks = totalWeeks - currentWeek
  const gamesPerWeek =
    allTeams.length > 0 ? (allTeams[0].wins + allTeams[0].losses > currentWeek * 1.5 ? 2 : 1) : 1
  const remainingGames = remainingWeeks * gamesPerWeek

  if (team.rank <= spots) return null // Already in position

  // Find all teams we need to pass
  const teamsToPass = allTeams.filter((t) => t.rank <= spots && t.rank >= spots - 2)
  const cutoffTeam = allTeams.find((t) => t.rank === spots)

  if (!cutoffTeam) return null

  const winGap = cutoffTeam.wins - team.wins
  const pfGap = cutoffTeam.pointsFor - team.pointsFor

  // Calculate minimum requirements
  const teamsNeedToLose: { teamName: string; losses: number }[] = []
  const keyMatchups: string[] = []

  // We need to either match or exceed cutoff team's wins
  // Best case: we win all remaining, they lose enough
  const teamMaxWins = team.wins + remainingGames
  const cutoffMinWins = cutoffTeam.wins // If they lose all remaining

  // For each team in playoff position that we could potentially pass
  teamsToPass.forEach((t) => {
    const theirWins = t.wins
    const gapToThem = theirWins - team.wins

    if (gapToThem > 0) {
      // We need them to lose at least (gap - our remaining wins potential that exceeds gap)
      // Minimum losses needed = gap - (remainingGames - gap) = 2*gap - remainingGames
      // But simplified: if we win all, they need to lose at least (theirWins - teamMaxWins) losses
      // Actually: to tie them, they need (theirWins + theirRemaining - teamMaxWins) to be <= 0
      // theirRemaining = remainingGames (same for all)
      // So: theirWins - team.wins - remainingGames + theirRemaining = theirWins - team.wins
      // If we win all and they lose all: teamMaxWins vs theirWins
      // If teamMaxWins >= theirWins, we can pass them if they lose (theirWins - team.wins) games
      const lossesNeeded = Math.max(0, theirWins - team.wins - remainingGames + gapToThem)
      const minLossesNeeded = gapToThem // Minimum losses if we win all

      if (minLossesNeeded > 0 && minLossesNeeded <= remainingGames) {
        teamsNeedToLose.push({
          teamName: t.teamName,
          losses: minLossesNeeded,
        })
      }
    }
  })

  // Find key matchups from schedule
  if (schedule && teamsData) {
    for (let week = currentWeek; week <= totalWeeks; week++) {
      const weekSchedule = schedule[week]
      if (weekSchedule) {
        const teamData = teamsData.find((t) => t.teamName === team.teamName)
        if (teamData) {
          const opponentId = weekSchedule[teamData.rosterId]
          const opponent = teamsData.find((t) => t.rosterId === opponentId)
          if (opponent) {
            const opponentOdds = allTeams.find((t) => t.teamName === opponent.teamName)
            if (opponentOdds && opponentOdds.rank <= spots) {
              keyMatchups.push(`Beat ${getShortName(opponent.teamName)} Wk${week}`)
            }
          }
        }

        // Also check if teams we need to lose play each other
        teamsNeedToLose.forEach((tl) => {
          const tlData = teamsData.find((t) => t.teamName === tl.teamName)
          if (tlData) {
            const tlOpponentId = weekSchedule[tlData.rosterId]
            const tlOpponent = teamsData.find((t) => t.rosterId === tlOpponentId)
            if (tlOpponent) {
              const tlOpponentOdds = allTeams.find((t) => t.teamName === tlOpponent.teamName)
              // If two teams we need to lose play each other, one MUST lose
              if (
                tlOpponentOdds &&
                teamsNeedToLose.some((x) => x.teamName === tlOpponent.teamName)
              ) {
                const matchupNote = `${getShortName(tl.teamName)} vs ${getShortName(tlOpponent.teamName)} Wk${week}`
                if (
                  !keyMatchups.includes(matchupNote) &&
                  !keyMatchups.includes(
                    `${getShortName(tlOpponent.teamName)} vs ${getShortName(tl.teamName)} Wk${week}`
                  )
                ) {
                  keyMatchups.push(`Watch: ${matchupNote}`)
                }
              }
            }
          }
        })
      }
    }
  }

  // Determine probability tier
  let probability: 'likely' | 'possible' | 'unlikely' | 'miracle' = 'possible'
  const totalLossesNeeded = teamsNeedToLose.reduce((sum, t) => sum + t.losses, 0)

  if (winGap === 0) {
    probability = pfGap <= 50 ? 'likely' : 'possible'
  } else if (winGap <= 1 && totalLossesNeeded <= 1) {
    probability = 'possible'
  } else if (winGap <= 2 && totalLossesNeeded <= remainingGames) {
    probability = 'unlikely'
  } else {
    probability = 'miracle'
  }

  return {
    teamMustWin: remainingGames, // Must win all remaining
    teamsNeedToLose: teamsNeedToLose.slice(0, 3), // Top 3 most important
    pfNeeded: winGap === 0 && pfGap > 0 ? pfGap : undefined,
    keyMatchups: keyMatchups.slice(0, 3),
    probability,
  }
}

function calculatePlayoffPath(
  team: {
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    rank: number
    playoffProbability: number
  },
  allTeams: {
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    rank: number
    playoffProbability: number
  }[],
  spots: number,
  currentWeek: number,
  totalWeeks: number,
  schedule?: ScheduleMap,
  teamsData?: TeamData[]
): PlayoffPath {
  const remainingWeeks = totalWeeks - currentWeek
  const gamesPerWeek =
    allTeams.length > 0 ? (allTeams[0].wins + allTeams[0].losses > currentWeek * 1.5 ? 2 : 1) : 1
  const remainingGames = remainingWeeks * gamesPerWeek

  // Already clinched
  if (team.playoffProbability >= 99.9) {
    return { status: 'clinched', message: '✓ Clinched' }
  }

  // Mathematically eliminated - check if even winning all can't catch last playoff spot
  const cutoffTeam = allTeams.find((t) => t.rank === spots)
  if (cutoffTeam) {
    const maxPossibleWins = team.wins + remainingGames
    const cutoffMinWins = cutoffTeam.wins // If they win 0 more
    // If we can't even tie them on wins even if we win all and they win 0, we're eliminated
    if (maxPossibleWins < cutoffMinWins) {
      return { status: 'eliminated', message: '✗ Eliminated' }
    }
  }

  // Check for true elimination (0%)
  if (team.playoffProbability < 0.1) {
    return { status: 'eliminated', message: '✗ Eliminated' }
  }

  const firstOutTeam = allTeams.find((t) => t.rank === spots + 1)

  // Teams IN playoff position
  if (team.rank <= spots) {
    const details: string[] = []

    if (team.playoffProbability >= 90) {
      // Check key matchups against chasers
      if (schedule && teamsData) {
        for (let week = currentWeek; week <= totalWeeks; week++) {
          const weekSchedule = schedule[week]
          if (weekSchedule) {
            const teamData = teamsData.find((t) => t.teamName === team.teamName)
            if (teamData) {
              const opponentId = weekSchedule[teamData.rosterId]
              const opponent = teamsData.find((t) => t.rosterId === opponentId)
              if (opponent) {
                const opponentOdds = allTeams.find((t) => t.teamName === opponent.teamName)
                if (
                  opponentOdds &&
                  opponentOdds.rank > spots &&
                  opponentOdds.playoffProbability > 5
                ) {
                  details.push(`vs ${getShortName(opponent.teamName)} Wk${week}`)
                }
              }
            }
          }
        }
      }

      return {
        status: 'controls',
        message: 'Controls destiny',
        details: details.length > 0 ? details.slice(0, 2) : undefined,
      }
    }

    // In but not safe
    if (firstOutTeam) {
      const winLead = team.wins - firstOutTeam.wins
      const pfLead = team.pointsFor - firstOutTeam.pointsFor
      const chaserName = getShortName(firstOutTeam.teamName)

      if (winLead === 0) {
        details.push(`Tied with ${chaserName}`)
        if (pfLead > 0) {
          details.push(`+${pfLead.toFixed(0)} PF edge`)
        } else {
          details.push(`${Math.abs(pfLead).toFixed(0)} PF behind`)
        }
      } else if (winLead === 1) {
        details.push(`1 win on ${chaserName}`)
      } else if (winLead === 2) {
        details.push(`2 wins on ${chaserName}`)
      }

      // Check direct matchups
      if (schedule && teamsData) {
        for (let week = currentWeek; week <= totalWeeks; week++) {
          const weekSchedule = schedule[week]
          if (weekSchedule) {
            const teamData = teamsData.find((t) => t.teamName === team.teamName)
            if (teamData) {
              const opponentId = weekSchedule[teamData.rosterId]
              const opponent = teamsData.find((t) => t.rosterId === opponentId)
              if (opponent && opponent.teamName === firstOutTeam.teamName) {
                details.push(`KEY: vs ${chaserName} Wk${week}`)
              }
            }
          }
        }
      }
    }

    return {
      status: 'needs',
      message: details.length > 0 ? 'Hold position' : 'Win to clinch',
      details: details.length > 0 ? details.slice(0, 3) : undefined,
    }
  }

  // Teams OUTSIDE playoffs - calculate exact path
  const scenario = calculateExactPath(
    team,
    allTeams,
    spots,
    currentWeek,
    totalWeeks,
    schedule,
    teamsData
  )
  const details: string[] = []

  if (scenario) {
    // Must win requirement
    if (scenario.teamMustWin > 0) {
      details.push(`Must win ${scenario.teamMustWin} remaining`)
    }

    // Teams that need to lose
    scenario.teamsNeedToLose.forEach((tl) => {
      details.push(`${getShortName(tl.teamName)} must lose ${tl.losses}`)
    })

    // PF gap if relevant - show specific points needed
    if (scenario.pfNeeded && scenario.pfNeeded > 0) {
      const targetName = cutoffTeam ? getShortName(cutoffTeam.teamName) : 'cutoff'
      details.push(`Need ${scenario.pfNeeded.toFixed(0)} more PF vs ${targetName}`)
    }

    // Also show current PF comparison even when not tied
    if (cutoffTeam && (!scenario.pfNeeded || scenario.pfNeeded === 0)) {
      const pfDiff = team.pointsFor - cutoffTeam.pointsFor
      const targetName = getShortName(cutoffTeam.teamName)
      if (pfDiff > 0) {
        details.push(`+${pfDiff.toFixed(0)} PF on ${targetName}`)
      } else if (pfDiff < 0) {
        details.push(`${Math.abs(pfDiff).toFixed(0)} PF behind ${targetName}`)
      }
    }

    // Key matchups
    scenario.keyMatchups.forEach((km) => {
      if (!details.includes(km)) {
        details.push(km)
      }
    })

    const statusMap = {
      likely: 'needs' as const,
      possible: 'needs' as const,
      unlikely: 'longshot' as const,
      miracle: 'longshot' as const,
    }

    const messageMap = {
      likely: 'In the hunt',
      possible: 'Needs help',
      unlikely: 'Long shot',
      miracle: 'Miracle needed',
    }

    return {
      status: statusMap[scenario.probability],
      message: messageMap[scenario.probability],
      details: details.slice(0, 5),
    }
  }

  // Fallback - show PF gap too
  if (cutoffTeam) {
    const winGap = cutoffTeam.wins - team.wins
    const pfGap = cutoffTeam.pointsFor - team.pointsFor
    const targetName = getShortName(cutoffTeam.teamName)

    details.push(`${winGap} wins behind ${targetName}`)
    if (winGap <= remainingGames) {
      details.push(`${targetName} must lose ${winGap}`)
    }
    // Always show PF comparison for tiebreaker context
    if (pfGap > 0) {
      details.push(`${pfGap.toFixed(0)} PF behind ${targetName}`)
    } else if (pfGap < 0) {
      details.push(`+${Math.abs(pfGap).toFixed(0)} PF on ${targetName}`)
    }
  }

  return {
    status: team.playoffProbability >= 10 ? 'needs' : 'longshot',
    message: team.playoffProbability >= 10 ? 'Needs help' : 'Long shot',
    details: details.length > 0 ? details.slice(0, 5) : ['Win out'],
  }
}

export function PlayoffOddsSection({
  teams,
  currentWeek,
  totalWeeks = 14,
  playoffSpots,
  schedule,
}: PlayoffOddsSectionProps) {
  const spots = playoffSpots || Math.ceil(teams.length / 2)

  const playoffOdds = useMemo(() => {
    if (teams.length === 0) return []
    return calculatePlayoffOdds(teams, currentWeek, totalWeeks, playoffSpots, schedule)
  }, [teams, currentWeek, totalWeeks, playoffSpots, schedule])

  // Calculate playoff paths (only for week 12+)
  const showPlayoffPath = currentWeek >= 12
  const playoffPaths = useMemo(() => {
    if (!showPlayoffPath || playoffOdds.length === 0) return {}

    const paths: { [teamName: string]: PlayoffPath } = {}
    playoffOdds.forEach((team) => {
      paths[team.teamName] = calculatePlayoffPath(
        team,
        playoffOdds,
        spots,
        currentWeek,
        totalWeeks,
        schedule,
        teams
      )
    })
    return paths
  }, [playoffOdds, spots, currentWeek, totalWeeks, schedule, teams, showPlayoffPath])

  const getProbabilityColor = (probability: number) => {
    if (probability >= 90) return 'text-green-400'
    if (probability >= 70) return 'text-yellow-400'
    if (probability >= 40) return 'text-orange-400'
    if (probability >= 10) return 'text-red-400'
    return 'text-gray-400'
  }

  const getProbabilityBg = (probability: number) => {
    if (probability >= 90) return 'bg-green-500/20 border-green-500/30'
    if (probability >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
    if (probability >= 40) return 'bg-orange-500/20 border-orange-500/30'
    if (probability >= 10) return 'bg-red-500/20 border-red-500/30'
    return 'bg-gray-500/20 border-gray-500/30'
  }

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl font-bold">Playoff Odds</CardTitle>
                <p className="text-slate-400 text-xs mt-1">
                  Probabilities based on 10,000 simulations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <Target className="h-4 w-4" />
              <span className="font-mono">
                Week {currentWeek}/{totalWeeks}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800/50">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    Team
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    Record
                  </th>
                  <th className="text-right py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    PF
                  </th>
                  <th className="text-right py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    Odds
                  </th>
                  {showPlayoffPath && (
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      Path to Playoffs
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-slate-900/30">
                {playoffOdds.map((team, index) => {
                  const path = playoffPaths[team.teamName]
                  const pathColor =
                    path?.status === 'clinched'
                      ? 'text-green-400'
                      : path?.status === 'controls'
                        ? 'text-blue-400'
                        : path?.status === 'eliminated'
                          ? 'text-slate-500'
                          : path?.status === 'longshot'
                            ? 'text-red-400'
                            : 'text-yellow-400'

                  return (
                    <tr
                      key={team.teamName}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                        index < spots ? 'bg-green-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-mono w-6">#{team.rank}</span>
                          <span className="text-white font-semibold text-sm">{team.teamName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 font-mono text-sm">
                          {team.wins}-{team.losses}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-slate-400 font-mono text-sm">
                          {team.pointsFor.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold text-sm ${getProbabilityColor(
                            team.playoffProbability
                          )}`}
                        >
                          {team.playoffProbability >= 99.99
                            ? '100%'
                            : team.playoffProbability < 0.01
                              ? '0%'
                              : `${team.playoffProbability.toFixed(1)}%`}
                        </span>
                      </td>
                      {showPlayoffPath && path && (
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`font-medium text-xs ${pathColor}`}>
                              {path.message}
                            </span>
                            {path.details && path.details.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {path.details.slice(0, 2).map((detail, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50"
                                  >
                                    {detail}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Spots
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {playoffSpots || Math.ceil(teams.length / 2)}
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Locks
              </div>
              <div className="text-xl font-bold text-green-400 font-mono">
                {playoffOdds.filter((t) => t.playoffProbability >= 99).length}
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Bubble
              </div>
              <div className="text-xl font-bold text-yellow-400 font-mono">
                {
                  playoffOdds.filter((t) => t.playoffProbability >= 10 && t.playoffProbability < 99)
                    .length
                }
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Out
              </div>
              <div className="text-xl font-bold text-slate-500 font-mono">
                {playoffOdds.filter((t) => t.playoffProbability < 1).length}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="hidden" />
    </Card>
  )
}
