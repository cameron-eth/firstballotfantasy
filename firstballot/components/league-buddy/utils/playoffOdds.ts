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
  // Only return hardcoded values if season is completely over (no remaining weeks)
  if (teams.length === 0 || currentWeek > totalWeeks) {
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

  // Detect games per week by looking at max games played vs weeks
  // If teams have ~2x games as weeks, it's a 2-game-per-week league (H2H + Median)
  const maxGamesPlayed = Math.max(...teams.map((t) => t.wins + t.losses))
  const minGamesPlayed = Math.min(...teams.map((t) => t.wins + t.losses))
  const gamesPerWeek = maxGamesPlayed > currentWeek * 1.5 ? 2 : 1

  // Calculate total expected games for the season
  const totalExpectedGames = totalWeeks * gamesPerWeek

  // Check if current week is in progress (teams have different game counts)
  const weekInProgress = maxGamesPlayed !== minGamesPlayed

  // Calculate remaining weeks to simulate
  // If week is in progress, include current week for teams that haven't played
  const startingWeek = weekInProgress ? currentWeek : currentWeek + 1
  const remainingWeeks = totalWeeks - startingWeek + 1

  // If no remaining games possible, use final standings
  if (remainingWeeks <= 0 && !weekInProgress) {
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
    return sortedTeams.map((team, index) => ({
      teamName: team.teamName,
      wins: team.wins,
      losses: team.losses,
      pointsFor: team.pointsFor,
      playoffProbability: index < spots ? 100 : 0,
      rank: index + 1,
    }))
  }

  // Calculate each team's remaining games individually
  const teamRemainingGames = teams.map((team) => {
    const gamesPlayed = team.wins + team.losses
    return Math.max(0, totalExpectedGames - gamesPlayed)
  })

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

  // Check if any team has remaining games
  const anyRemainingGames = teamRemainingGames.some((g) => g > 0)
  if (!anyRemainingGames) {
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
    return sortedTeams.map((team, index) => ({
      teamName: team.teamName,
      wins: team.wins,
      losses: team.losses,
      pointsFor: team.pointsFor,
      playoffProbability: index < spots ? 100 : 0,
      rank: index + 1,
    }))
  }

  // Run Monte Carlo simulations
  for (let sim = 0; sim < simulations; sim++) {
    // For H2H + Median format, we need to simulate all teams' scores for each week first
    // Then calculate median and determine wins/losses

    // Pre-calculate all team scores for all remaining weeks
    const weeklyScores: number[][] = [] // [weekIndex][teamIndex] = score

    for (let weekOffset = 0; weekOffset < remainingWeeks; weekOffset++) {
      const weekScores: number[] = []

      for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
        const teamStatsData = teamStats[teamIndex]

        // Simulate score with extreme outcomes accounted for
        const randomFactor = Math.random()
        let scoreMultiplier: number

        if (randomFactor < 0.05) {
          // Extreme bust week (5% chance)
          scoreMultiplier = 0.5 + Math.random() * 0.2 // 50-70% of average
        } else if (randomFactor > 0.95) {
          // Extreme boom week (5% chance)
          scoreMultiplier = 1.5 + Math.random() * 0.5 // 150-200% of average
        } else {
          // Normal variance - Box-Muller transform
          const u1 = Math.random()
          const u2 = Math.random()
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
          scoreMultiplier = 1 + z * 0.3
        }

        weekScores.push(Math.max(0, teamStatsData.avg * scoreMultiplier))
      }

      weeklyScores.push(weekScores)
    }

    // Now simulate each team's record
    const simulatedRecords = teams.map((team, index) => {
      let simulatedWins = team.wins
      let simulatedLosses = team.losses
      let simulatedPF = team.pointsFor

      const teamRosterId = team.rosterId

      // Simulate each remaining week
      for (let weekOffset = 0; weekOffset < remainingWeeks; weekOffset++) {
        const weekNumber = startingWeek + weekOffset
        const teamScore = weeklyScores[weekOffset][index]
        simulatedPF += teamScore

        // Game 1: H2H vs scheduled opponent
        let opponentIndex: number | undefined

        if (schedule && schedule[weekNumber] && schedule[weekNumber][teamRosterId]) {
          const opponentRosterId = schedule[weekNumber][teamRosterId]
          opponentIndex = teams.findIndex((t) => t.rosterId === opponentRosterId)
        }

        // Fallback to random opponent if no schedule
        if (opponentIndex === undefined || opponentIndex === -1) {
          opponentIndex = Math.floor(Math.random() * teams.length)
          while (opponentIndex === index) {
            opponentIndex = Math.floor(Math.random() * teams.length)
          }
        }

        const opponentScore = weeklyScores[weekOffset][opponentIndex]

        // H2H result
        if (teamScore > opponentScore) {
          simulatedWins++
        } else {
          simulatedLosses++
        }

        // Game 2 (if 2-game format): vs League Median
        if (gamesPerWeek === 2) {
          // Calculate median score for this week
          const sortedScores = [...weeklyScores[weekOffset]].sort((a, b) => a - b)
          const midIndex = Math.floor(sortedScores.length / 2)
          const medianScore =
            sortedScores.length % 2 === 0
              ? (sortedScores[midIndex - 1] + sortedScores[midIndex]) / 2
              : sortedScores[midIndex]

          // Win if above median, lose if below
          if (teamScore > medianScore) {
            simulatedWins++
          } else {
            simulatedLosses++
          }
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
