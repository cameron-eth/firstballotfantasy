import type { TeamData } from '../types'

interface PlayoffOddsResult {
  teamName: string
  wins: number
  losses: number
  pointsFor: number
  playoffProbability: number
  rank: number
}

interface ScheduleMap {
  [week: number]: {
    [rosterId: number]: number // opponent rosterId
  }
}

/**
 * Calculate playoff odds for all teams using Monte Carlo simulation
 * @param teams - Array of team data
 * @param currentWeek - Current week of the season
 * @param totalWeeks - Total weeks in regular season (typically 14)
 * @param playoffSpots - Number of teams that make playoffs (defaults to half the league)
 * @param schedule - Map of remaining schedule: { week: { rosterId: opponentRosterId } }
 * @param simulations - Number of Monte Carlo simulations to run (default 10000)
 */
export function calculatePlayoffOdds(
  teams: TeamData[],
  currentWeek: number,
  totalWeeks: number = 14,
  playoffSpots?: number,
  schedule?: ScheduleMap,
  simulations: number = 10000
): PlayoffOddsResult[] {
  if (teams.length === 0 || currentWeek >= totalWeeks) {
    return teams.map((team, index) => ({
      teamName: team.teamName,
      wins: team.wins,
      losses: team.losses,
      pointsFor: team.pointsFor,
      playoffProbability: index < (playoffSpots || Math.ceil(teams.length / 2)) ? 100 : 0,
      rank: index + 1,
    }))
  }

  const spots = playoffSpots || Math.ceil(teams.length / 2)
  const remainingWeeks = totalWeeks - currentWeek

  // Calculate average points per game and standard deviation for each team
  const teamStats = teams.map((team) => {
    const gamesPlayed = team.wins + team.losses
    const avgPointsPerGame =
      gamesPlayed > 0 ? team.pointsFor / gamesPlayed : team.pointsFor / currentWeek

    // Estimate standard deviation based on typical fantasy football variance
    // Higher scoring teams tend to have more variance (boom/bust potential)
    // Use a coefficient of variation approach: stdDev ≈ avg * 0.35 for typical teams
    // But adjust based on team's current performance
    const baseStdDev = avgPointsPerGame * 0.35
    // Teams with higher averages tend to have more variance (more boom weeks)
    const adjustedStdDev = Math.max(baseStdDev, avgPointsPerGame * 0.25)

    return {
      avg: avgPointsPerGame,
      stdDev: adjustedStdDev,
    }
  })

  // Initialize playoff counts
  const playoffCounts = new Array(teams.length).fill(0)

  // Run Monte Carlo simulations
  for (let sim = 0; sim < simulations; sim++) {
    // Simulate remaining games for each team
    const simulatedRecords = teams.map((team, index) => {
      let simulatedWins = team.wins
      let simulatedLosses = team.losses
      let simulatedPF = team.pointsFor

      const teamStatsData = teamStats[index]
      const teamRosterId = team.rosterId

      // Simulate each remaining week
      for (let weekOffset = 0; weekOffset < remainingWeeks; weekOffset++) {
        const weekNumber = currentWeek + weekOffset + 1

        // Use actual schedule if available, otherwise fall back to random
        let opponentRosterId: number | undefined
        let opponentIndex: number | undefined

        if (schedule && schedule[weekNumber] && schedule[weekNumber][teamRosterId]) {
          // Use actual schedule
          opponentRosterId = schedule[weekNumber][teamRosterId]
          opponentIndex = teams.findIndex((t) => t.rosterId === opponentRosterId)
        }

        // Fallback to random opponent if schedule not available
        if (opponentIndex === undefined || opponentIndex === -1) {
          opponentIndex = Math.floor(Math.random() * teams.length)
          while (opponentIndex === index) {
            opponentIndex = Math.floor(Math.random() * teams.length)
          }
        }

        const opponentStats = teamStats[opponentIndex]

        // Simulate scores with extreme outcomes accounted for
        // Use normal distribution approximation with fat tails for extreme outcomes
        const randomFactor = Math.random()

        // 5% chance of extreme boom week (top 2.5% outcome)
        // 5% chance of extreme bust week (bottom 2.5% outcome)
        // 90% chance of normal variance
        let teamScoreMultiplier: number
        let opponentScoreMultiplier: number

        if (randomFactor < 0.05) {
          // Extreme bust week - bottom 2.5% (≈ -2 standard deviations)
          teamScoreMultiplier = 0.5 + Math.random() * 0.2 // 50-70% of average
        } else if (randomFactor > 0.95) {
          // Extreme boom week - top 2.5% (≈ +2 standard deviations)
          teamScoreMultiplier = 1.5 + Math.random() * 0.5 // 150-200% of average
        } else {
          // Normal variance - use normal distribution approximation
          // Box-Muller transform for normal distribution
          const u1 = Math.random()
          const u2 = Math.random()
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
          teamScoreMultiplier = 1 + z * 0.3 // Scale to reasonable variance
        }

        // Same for opponent
        const opponentRandom = Math.random()
        if (opponentRandom < 0.05) {
          opponentScoreMultiplier = 0.5 + Math.random() * 0.2
        } else if (opponentRandom > 0.95) {
          opponentScoreMultiplier = 1.5 + Math.random() * 0.5
        } else {
          const u1 = Math.random()
          const u2 = Math.random()
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
          opponentScoreMultiplier = 1 + z * 0.3
        }

        // Calculate scores with variance
        const teamScore = Math.max(0, teamStatsData.avg * teamScoreMultiplier)
        const opponentScore = Math.max(0, opponentStats.avg * opponentScoreMultiplier)

        if (teamScore > opponentScore) {
          simulatedWins++
          simulatedPF += teamScore
        } else {
          simulatedLosses++
          simulatedPF += teamScore // Still add team's score to PF
        }
      }

      return {
        teamName: team.teamName,
        wins: simulatedWins,
        losses: simulatedLosses,
        pointsFor: simulatedPF,
        rosterId: team.rosterId,
      }
    })

    // Sort by wins, then points for (tiebreaker)
    simulatedRecords.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })

    // Count teams that made playoffs
    simulatedRecords.slice(0, spots).forEach((record) => {
      const teamIndex = teams.findIndex((t) => t.rosterId === record.rosterId)
      if (teamIndex >= 0) {
        playoffCounts[teamIndex]++
      }
    })
  }

  // Calculate probabilities and sort by current rank
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })

  return sortedTeams.map((team, index) => {
    const teamIndex = teams.findIndex((t) => t.rosterId === team.rosterId)
    const probability = (playoffCounts[teamIndex] / simulations) * 100

    return {
      teamName: team.teamName,
      wins: team.wins,
      losses: team.losses,
      pointsFor: team.pointsFor,
      playoffProbability: probability,
      rank: index + 1,
    }
  })
}
