// Utility functions for LeagueBuddy component
import type { PlayerData, TeamData, SleeperTransaction } from './types'
import { ktcValue, playerValue, type LeagueContext } from '@/lib/sleeper-sdk'
import { standingsOrder } from '@/lib/league-metrics/standings'

export const getTierFromRank = (rank: number): string => {
  if (!rank || rank <= 0) return 'Tier 4'
  if (rank <= 12) return 'Tier 1'
  if (rank <= 24) return 'Tier 2'
  if (rank <= 48) return 'Tier 3'
  return 'Tier 4'
}

export const calculateGradeFromPercentile = (
  score: number,
  allScores: number[]
): { letter: string; score: number } => {
  if (!allScores || allScores.length === 0) return { letter: 'F', score: 0 }

  const sortedScores = [...allScores].sort((a, b) => b - a)
  const scoreIndex = sortedScores.findIndex((s) => s <= score)
  const percentile =
    scoreIndex === -1 ? 100 : ((sortedScores.length - scoreIndex) / sortedScores.length) * 100

  let letter = 'C'
  if (percentile >= 90) letter = 'A+'
  else if (percentile >= 80) letter = 'A'
  else if (percentile >= 70) letter = 'A-'
  else if (percentile >= 60) letter = 'B+'
  else if (percentile >= 50) letter = 'B'
  else if (percentile >= 40) letter = 'B-'
  else if (percentile >= 30) letter = 'C+'
  else if (percentile >= 20) letter = 'C'
  else if (percentile >= 10) letter = 'C-'
  else letter = 'D'

  return { letter, score: Math.round(percentile) }
}

export const calculateRecentForm = (roster: any, matchups: any[]): string => {
  if (!matchups || matchups.length === 0) return 'N/A'

  const rosterMatchups = matchups.filter((m: any) => m.roster_id === roster.roster_id)
  if (rosterMatchups.length === 0) return 'N/A'

  let wins = 0
  let losses = 0
  let ties = 0

  rosterMatchups.forEach((matchup: any) => {
    const opponentMatchup = matchups.find(
      (m: any) => m.matchup_id === matchup.matchup_id && m.roster_id !== roster.roster_id
    )

    if (opponentMatchup) {
      const teamPoints = matchup.points || 0
      const opponentPoints = opponentMatchup.points || 0

      if (teamPoints > opponentPoints) wins++
      else if (teamPoints < opponentPoints) losses++
      else ties++
    }
  })

  const totalGames = wins + losses + ties
  if (totalGames === 0) return 'N/A'

  const winRate = (wins / totalGames) * 100
  if (winRate >= 70) return 'Hot'
  if (winRate >= 50) return 'Neutral'
  if (winRate >= 30) return 'Cold'
  return 'Very Cold'
}

// Helper function for rank color calculations
export const getRankColor = (rank: number): string => {
  if (rank <= 3) return 'bg-green-900/70 text-green-100 border-green-700/40'
  if (rank <= 6) return 'bg-yellow-900/70 text-yellow-100 border-yellow-700/40'
  if (rank <= 9) return 'bg-orange-900/70 text-orange-100 border-orange-700/40'
  return 'bg-red-900/70 text-red-100 border-red-700/40'
}

/** Players a position group is judged on: one QB, two of every skill position. */
const POSITION_GROUP_DEPTH: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 2 }

/** Values at a position, best first. */
function positionValues(team: TeamData, position: string, ctx: LeagueContext): number[] {
  return (team.players ?? [])
    .filter((p) => p?.position?.toUpperCase() === position)
    .map((p) => playerValue(p, ctx))
    .sort((a, b) => b - a)
}

/**
 * Ranks every team 1..N at each position group and at FLEX, by summed dynasty value —
 * so a team's QB rank reflects what its starter is actually worth, not where a consensus
 * list happens to place him. FLEX is the best skill player left over once each position
 * group's starters are accounted for, which is exactly who fills the slot.
 */
export const calculateLeaguePositionRankings = (
  sortedTeams: TeamData[],
  ctx: LeagueContext
): Record<string, Record<string, number>> => {
  if (!sortedTeams || sortedTeams.length === 0) return {}

  const positions = Object.keys(POSITION_GROUP_DEPTH)
  const teamScores: Record<number, Record<string, number>> = {}

  for (const team of sortedTeams) {
    if (!team?.rosterId) continue
    const scores: Record<string, number> = {}

    for (const position of positions) {
      const values = positionValues(team, position, ctx)
      scores[position] = values
        .slice(0, POSITION_GROUP_DEPTH[position])
        .reduce((sum, value) => sum + value, 0)
    }

    scores.FLEX = Math.max(
      0,
      ...['RB', 'WR', 'TE'].map(
        (position) => positionValues(team, position, ctx)[POSITION_GROUP_DEPTH[position]] ?? 0
      )
    )

    teamScores[team.rosterId] = scores
  }

  // Rank each category, highest value first (1 = best position group in the league).
  // Equal groups share a rank, the same rule as Lineup strength and dynasty rank; ranking
  // ties by list position made two identical groups read as different.
  const positionRankings: Record<string, Record<string, number>> = {}

  for (const category of [...positions, 'FLEX']) {
    const entries = Object.entries(teamScores).map(([rosterId, scores]) => ({
      rosterId,
      score: scores[category] ?? 0,
    }))
    for (const entry of entries) {
      positionRankings[entry.rosterId] = {
        ...(positionRankings[entry.rosterId] ?? {}),
        [category]: entries.filter((other) => other.score > entry.score).length + 1,
      }
    }
  }

  return positionRankings
}

export interface OpponentInfo {
  opponentTeam: string
  isHome: boolean
}

/** This week's NFL opponent for a player's team; 'BYE' when the team has no game. */
export const getOpponentInfo = (
  player: PlayerData,
  nflGames: Record<string, { opponent: string; isHome: boolean }>
): OpponentInfo => {
  const gameInfo = nflGames[player.team]

  if (gameInfo?.opponent && gameInfo.opponent !== 'TBD') {
    return { opponentTeam: gameInfo.opponent, isHome: gameInfo.isHome }
  }

  return { opponentTeam: 'BYE', isHome: false }
}

export interface RosterPositions {
  QB?: number
  RB?: number
  WR?: number
  TE?: number
  FLEX?: number
  SUPER_FLEX?: number
}

/**
 * Sleeper's roster_positions is a flat slot array (e.g. ['QB','RB','RB','WR','WR','TE',
 * 'FLEX','SUPER_FLEX','BN','BN',...]), not a position->count map. Tally it into counts,
 * ignoring bench/IR/taxi slots and any position this model doesn't value (K, DEF, etc).
 */
export const countRosterPositions = (positions: string[] | undefined): RosterPositions => {
  // Empty/missing input means "unknown" — return {} so callers can fall back to sane
  // defaults instead of zeroing out every slot.
  if (!Array.isArray(positions) || positions.length === 0) return {}

  const counts: RosterPositions = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 }
  const ignored = new Set(['BN', 'IR', 'TAXI'])
  for (const slot of positions) {
    const key = slot?.toUpperCase()
    if (!key || ignored.has(key) || !(key in counts)) continue
    counts[key as keyof RosterPositions] = (counts[key as keyof RosterPositions] ?? 0) + 1
  }
  return counts
}

// Helper function to check if player should be excluded from optimized lineup
export const isPlayerAvailable = (player: PlayerData): boolean => {
  // Exclude injured players - specifically IR and Doubtful statuses
  // Also exclude if injury_start_date is set (indicates active injury)
  const injuryStatus = (player.injury_status || '').toString().toLowerCase().trim()

  // Filter out: IR, Out, Doubtful (case-insensitive)
  // Note: Questionable players are still available (they might play)
  const excludedStatuses = ['ir', 'out', 'doubtful']
  const hasExcludedStatus = injuryStatus && excludedStatuses.includes(injuryStatus)

  // Also exclude if injury_start_date is set (indicates active injury)
  const hasInjuryDate = player.injury_start_date !== null && player.injury_start_date !== undefined

  const isInjured = hasExcludedStatus || hasInjuryDate

  // Exclude players on bye week
  const isBye = player.isOnBye === true

  // Player is available if not injured and not on bye
  return !isInjured && !isBye
}

const AUDIT_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

// ---------------------------------------------------------------------------
// Valuation: P/E-ratio-style price (KTC) vs earnings (production) scoring
// ---------------------------------------------------------------------------

function medianOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface PositionalMedians {
  medianKtc: number
  medianFfpg: number
}

/** League-wide KTC value and fantasy PPG medians per position, for normalizing P/E ratios. */
export const calculatePositionalMedians = (
  players: PlayerData[],
  ctx: LeagueContext
): Record<string, PositionalMedians> => {
  const result: Record<string, PositionalMedians> = {}
  for (const pos of AUDIT_POSITIONS) {
    const atPos = players.filter((p) => p.position === pos)
    const ktcValues = atPos
      .map((p) => ktcValue(p, ctx))
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const ffpgValues = atPos
      .map((p) => p.fantasy_ppg)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    result[pos] = { medianKtc: medianOf(ktcValues), medianFfpg: medianOf(ffpgValues) }
  }
  return result
}

/**
 * Price/earnings ratio: (KTC value ÷ positional median KTC) ÷ (fantasy_ppg ÷ positional
 * median fantasy_ppg). < 0.7 = undervalued (production exceeds price), > 1.5 = overvalued
 * (paying for name value over output), ~1.0 = fair. Returns null when there's no production
 * sample yet (rookies, injured all season) — those are speculative, not mispriced.
 */
export const calculatePERatio = (
  player: PlayerData,
  medians: Record<string, PositionalMedians>,
  ctx: LeagueContext
): number | null => {
  const posMedians = medians[player.position]
  if (!posMedians || posMedians.medianKtc <= 0 || posMedians.medianFfpg <= 0) return null
  const price = ktcValue(player, ctx)
  if (!price || !player.fantasy_ppg || player.fantasy_ppg <= 0) return null

  const priceMultiple = price / posMedians.medianKtc
  const earningsMultiple = player.fantasy_ppg / posMedians.medianFfpg
  if (earningsMultiple <= 0) return null

  return priceMultiple / earningsMultiple
}

// ---------------------------------------------------------------------------
// League activity feed: resolves raw transactions into named adds/drops
// ---------------------------------------------------------------------------

export interface ActivityFeedItem {
  id: string
  type: 'trade' | 'waiver' | 'free_agent'
  timestamp: number
  adds: { playerName: string; teamName: string }[]
  drops: { playerName: string; teamName: string }[]
}

/** Resolves raw Sleeper transactions (player IDs, roster IDs) into a display-ready feed. */
export const buildActivityFeed = (
  transactions: SleeperTransaction[],
  teams: TeamData[],
  allPlayers: Record<string, any>
): ActivityFeedItem[] => {
  const teamNameFor = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId)?.teamName ?? 'Unknown Team'

  const playerNameFor = (playerId: string) => {
    const p = allPlayers[playerId]
    if (!p) return playerId
    return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || playerId
  }

  return transactions.map((tx) => ({
    id: tx.transaction_id,
    type: tx.type,
    timestamp: tx.created,
    adds: Object.entries(tx.adds ?? {}).map(([playerId, rosterId]) => ({
      playerName: playerNameFor(playerId),
      teamName: teamNameFor(rosterId),
    })),
    drops: Object.entries(tx.drops ?? {}).map(([playerId, rosterId]) => ({
      playerName: playerNameFor(playerId),
      teamName: teamNameFor(rosterId),
    })),
  }))
}

/** League table order: win percentage (ties count half), then points for. */
export function recordOrder(teams: TeamData[]): TeamData[] {
  return standingsOrder(teams)
}
