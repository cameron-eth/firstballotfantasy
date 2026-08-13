// Utility functions for LeagueBuddy component
import type { PlayerData, PositionStrengths, TeamData, SleeperTransaction } from './types'
import type { LeaguePlacements } from './competitiveState'
import { CORE_POSITIONS, playerValue, type ValuationContext } from '@/lib/sleeper-sdk'

/** This app is dynasty-superflex first, so QB scarcity is priced into every valuation. */
const VALUATION_CTX: ValuationContext = { superflex: true }

/** Top N assets that define a roster's value profile. */
const CORE_DEPTH = 12

/** Top of the value scale a single position group is measured against. */
const POSITION_VALUE_CEILING = 9999

export const getTierFromRank = (rank: number): string => {
  if (!rank || rank <= 0) return 'Tier 4'
  if (rank <= 12) return 'Tier 1'
  if (rank <= 24) return 'Tier 2'
  if (rank <= 48) return 'Tier 3'
  return 'Tier 4'
}

/** Core assets that define a roster's value, best first. */
const coreAssets = (players: PlayerData[], depth = CORE_DEPTH): PlayerData[] =>
  players
    .filter((p) => (CORE_POSITIONS as readonly string[]).includes(p.position?.toUpperCase() ?? ''))
    .sort((a, b) => playerValue(b, VALUATION_CTX) - playerValue(a, VALUATION_CTX))
    .slice(0, depth)

/**
 * A roster's raw strength on the SDK's dynasty value scale: the summed value of its top
 * core assets, divided by 100 so the number reads like a score rather than a KTC total.
 * Feeds the percentile grade, so only the relative ordering matters.
 */
export const calculateRawScore = (players: PlayerData[]): number => {
  if (!players || players.length === 0) return 0
  const total = coreAssets(players).reduce((sum, p) => sum + playerValue(p, VALUATION_CTX), 0)
  return Math.round(total / 100)
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

/**
 * 0–100 strength per position: the average dynasty value of the players who would
 * actually start there, measured against an elite asset. A team whose top two RBs are
 * both consensus RB1s scores near 100; a team starting waiver bodies scores near 0.
 */
export const calculatePositionStrengths = (players: PlayerData[]): PositionStrengths => {
  // How many players carry the position in a dynasty superflex lineup.
  const starterSlots: Record<string, number> = { QB: 2, RB: 4, WR: 4, TE: 2 }

  function positionScore(pos: string): number {
    const posPlayers = players
      .filter((p) => p.position?.toUpperCase() === pos)
      .map((p) => playerValue(p, VALUATION_CTX))
      .sort((a, b) => b - a)
      .slice(0, starterSlots[pos] ?? 3)

    if (posPlayers.length === 0) return 0

    const avg = posPlayers.reduce((sum, value) => sum + value, 0) / posPlayers.length
    return Math.min(100, Math.round((avg / POSITION_VALUE_CEILING) * 100))
  }

  return {
    QB: positionScore('QB'),
    RB: positionScore('RB'),
    WR: positionScore('WR'),
    TE: positionScore('TE'),
    FLEX: 0,
    SFLX: 0,
  }
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
function positionValues(team: TeamData, position: string): number[] {
  return (team.players ?? [])
    .filter((p) => p?.position?.toUpperCase() === position)
    .map((p) => playerValue(p, VALUATION_CTX))
    .sort((a, b) => b - a)
}

/**
 * Ranks every team 1..N at each position group and at FLEX, by summed dynasty value —
 * so a team's QB rank reflects what its starter is actually worth, not where a consensus
 * list happens to place him. FLEX is the best skill player left over once each position
 * group's starters are accounted for, which is exactly who fills the slot.
 */
export const calculateLeaguePositionRankings = (
  sortedTeams: TeamData[]
): Record<string, Record<string, number>> => {
  if (!sortedTeams || sortedTeams.length === 0) return {}

  const positions = Object.keys(POSITION_GROUP_DEPTH)
  const teamScores: Record<number, Record<string, number>> = {}

  for (const team of sortedTeams) {
    if (!team?.rosterId) continue
    const scores: Record<string, number> = {}

    for (const position of positions) {
      const values = positionValues(team, position)
      scores[position] = values
        .slice(0, POSITION_GROUP_DEPTH[position])
        .reduce((sum, value) => sum + value, 0)
    }

    scores.FLEX = Math.max(
      0,
      ...['RB', 'WR', 'TE'].map(
        (position) => positionValues(team, position)[POSITION_GROUP_DEPTH[position]] ?? 0
      )
    )

    teamScores[team.rosterId] = scores
  }

  // Rank each category, highest value first (1 = best position group in the league).
  const positionRankings: Record<string, Record<string, number>> = {}

  for (const category of [...positions, 'FLEX']) {
    const ordered = Object.entries(teamScores)
      .map(([rosterId, scores]) => ({ rosterId, score: scores[category] ?? 0 }))
      .sort((a, b) => b.score - a.score)

    ordered.forEach((entry, index) => {
      positionRankings[entry.rosterId] = {
        ...(positionRankings[entry.rosterId] ?? {}),
        [category]: index + 1,
      }
    })
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

// ---------------------------------------------------------------------------
// Audit: stat-management diagnostics (position depth, injury exposure, activity)
// ---------------------------------------------------------------------------

const AUDIT_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])

export interface PositionDepthGap {
  position: string
  startersNeeded: number
  rosteredCount: number
  availableCount: number
  healthScore: number // 0-100+; 100 = exactly enough available starters, no bench buffer
  severity: 'critical' | 'thin' | 'healthy'
}

/**
 * How many rostered/available players a team has at each position relative to how many
 * that roster shape actually needs to start (direct slots + a fair share of FLEX/SUPER_FLEX).
 */
export const calculatePositionDepthGaps = (
  players: PlayerData[],
  rosterPositions: RosterPositions
): PositionDepthGap[] => {
  const flexShare = Math.ceil((rosterPositions.FLEX ?? 0) / FLEX_ELIGIBLE.size)
  const superFlexShare = Math.ceil((rosterPositions.SUPER_FLEX ?? 0) / (AUDIT_POSITIONS.length))

  return AUDIT_POSITIONS.map((position) => {
    const directSlots = rosterPositions[position as keyof RosterPositions] ?? 0
    const startersNeeded =
      directSlots + (FLEX_ELIGIBLE.has(position) ? flexShare : 0) + superFlexShare

    const atPosition = players.filter((p) => p.position === position)
    const rosteredCount = atPosition.length
    const availableCount = atPosition.filter(isPlayerAvailable).length

    const healthScore =
      startersNeeded > 0 ? Math.round((availableCount / startersNeeded) * 100) : 100

    let severity: PositionDepthGap['severity'] = 'healthy'
    if (availableCount < startersNeeded) severity = 'critical'
    else if (availableCount <= startersNeeded) severity = 'thin'

    return { position, startersNeeded, rosteredCount, availableCount, healthScore, severity }
  })
}

export interface InjuryExposure {
  injuredCount: number
  injuredStarterCount: number
  players: PlayerData[]
  riskLevel: 'low' | 'moderate' | 'high'
}

const INJURY_STATUSES = new Set(['questionable', 'doubtful', 'out', 'ir'])

function isInjuryFlagged(player: PlayerData): boolean {
  const status = (player.injury_status || '').toLowerCase().trim()
  return INJURY_STATUSES.has(status) || Boolean(player.injury_start_date)
}

/** Surfaces every rostered player carrying an injury designation, weighted by starter impact. */
export const calculateInjuryExposure = (
  players: PlayerData[],
  currentStarters: string[]
): InjuryExposure => {
  const injuredPlayers = players.filter(isInjuryFlagged)
  const starterSet = new Set(currentStarters)
  const injuredStarterCount = injuredPlayers.filter((p) => starterSet.has(p.playerId)).length

  let riskLevel: InjuryExposure['riskLevel'] = 'low'
  if (injuredStarterCount >= 2) riskLevel = 'high'
  else if (injuredStarterCount === 1) riskLevel = 'moderate'

  return {
    injuredCount: injuredPlayers.length,
    injuredStarterCount,
    players: injuredPlayers,
    riskLevel,
  }
}

export interface TransactionActivitySummary {
  totalMoves: number
  waiverClaims: number
  trades: number
  freeAgentAdds: number
  last4WeeksMoves: number
  activityLevel: 'inactive' | 'moderate' | 'active' | 'hyperactive'
}

/** Summarizes a team's roster-management activity from their completed transactions. */
export const calculateTransactionActivity = (
  transactions: SleeperTransaction[] | undefined,
  currentWeek: number
): TransactionActivitySummary => {
  const tx = transactions ?? []
  const waiverClaims = tx.filter((t) => t.type === 'waiver').length
  const trades = tx.filter((t) => t.type === 'trade').length
  const freeAgentAdds = tx.filter((t) => t.type === 'free_agent').length
  const last4WeeksMoves = tx.filter((t) => t.leg > currentWeek - 4 && t.leg <= currentWeek).length

  let activityLevel: TransactionActivitySummary['activityLevel'] = 'inactive'
  if (last4WeeksMoves >= 6) activityLevel = 'hyperactive'
  else if (last4WeeksMoves >= 3) activityLevel = 'active'
  else if (last4WeeksMoves >= 1) activityLevel = 'moderate'

  return {
    totalMoves: tx.length,
    waiverClaims,
    trades,
    freeAgentAdds,
    last4WeeksMoves,
    activityLevel,
  }
}

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
  players: PlayerData[]
): Record<string, PositionalMedians> => {
  const result: Record<string, PositionalMedians> = {}
  for (const pos of AUDIT_POSITIONS) {
    const atPos = players.filter((p) => p.position === pos)
    const ktcValues = atPos
      .map((p) => p.ktcValueSf)
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
  medians: Record<string, PositionalMedians>
): number | null => {
  const posMedians = medians[player.position]
  if (!posMedians || posMedians.medianKtc <= 0 || posMedians.medianFfpg <= 0) return null
  if (!player.ktcValueSf || !player.fantasy_ppg || player.fantasy_ppg <= 0) return null

  const priceMultiple = player.ktcValueSf / posMedians.medianKtc
  const earningsMultiple = player.fantasy_ppg / posMedians.medianFfpg
  if (earningsMultiple <= 0) return null

  return priceMultiple / earningsMultiple
}

// ---------------------------------------------------------------------------
// Production vs. value: is this team's on-field output backed by its roster talent?
// ---------------------------------------------------------------------------

export interface ProductionVsValue {
  productionRank: number // 1 = most points scored league-wide
  valueRank: number // 1 = highest roster value (nowScore) league-wide
  gap: number // productionRank - valueRank; positive = production trailing value
  signal: 'underperforming' | 'overperforming' | 'aligned'
}

/**
 * Compares a team's points-scored rank against its roster-value rank. A team can rank well
 * on value (talented roster, per KTC) but rank poorly on production (points scored) —
 * talent that isn't translating to the scoreboard — or the reverse (punching above its
 * roster's weight). This is a different failure mode than the win/loss-based Pretender
 * overlay in competitiveState.ts, which only looks at record vs. roster value.
 */
export const calculateProductionVsValue = (
  rosterId: number,
  teams: TeamData[],
  placements: LeaguePlacements
): ProductionVsValue | null => {
  if (teams.length === 0) return null

  const byPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor)
  const productionRank = byPoints.findIndex((t) => t.rosterId === rosterId) + 1

  const byValue = [...teams].sort(
    (a, b) =>
      (placements.placements[b.rosterId]?.nowScore ?? 0) -
      (placements.placements[a.rosterId]?.nowScore ?? 0)
  )
  const valueRank = byValue.findIndex((t) => t.rosterId === rosterId) + 1

  if (productionRank === 0 || valueRank === 0) return null

  const gap = productionRank - valueRank
  const gapThreshold = Math.max(2, Math.ceil(teams.length / 4))

  let signal: ProductionVsValue['signal'] = 'aligned'
  if (gap >= gapThreshold) signal = 'underperforming'
  else if (gap <= -gapThreshold) signal = 'overperforming'

  return { productionRank, valueRank, gap, signal }
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

// ---------------------------------------------------------------------------
// Risk factor: composite of aged/declining production and injury exposure
// ---------------------------------------------------------------------------

export interface RiskFactor {
  score: number // 0-100, higher = riskier
  ageRiskScore: number // 0-100 — share of roster past its position's typical peak window
  injuryRiskScore: number // 0-100 — current injury exposure blended with season durability
  label: 'low' | 'moderate' | 'high'
}

const PEAK_AGE_END: Record<string, number> = { QB: 34, RB: 27, WR: 30, TE: 31 }

/**
 * Blends two independent risk signals into one team-level score: how much of the roster
 * is past its position's typical productive age window (age risk), and how much on-field
 * availability is already compromised — current injured starters plus games already missed
 * relative to what should have been played by now (injury risk).
 */
export const calculateRiskFactor = (team: TeamData, currentWeek: number): RiskFactor => {
  const relevant = team.players.filter((p) =>
    (AUDIT_POSITIONS as readonly string[]).includes(p.position)
  )

  const aged = relevant.filter((p) => p.age)
  const pastPeakCount = aged.filter((p) => p.age > (PEAK_AGE_END[p.position] ?? 30)).length
  const ageRiskScore = aged.length > 0 ? Math.round((pastPeakCount / aged.length) * 100) : 0

  const injuryExposure = calculateInjuryExposure(team.players, team.starters)
  const currentInjuryRisk =
    team.starters.length > 0
      ? (injuryExposure.injuredStarterCount / team.starters.length) * 100
      : 0

  const expectedGames = Math.max(1, currentWeek - 1)
  const trackable = relevant.filter((p) => typeof p.games_played === 'number')
  const missedTimeCount = trackable.filter(
    (p) => (p.games_played as number) < expectedGames * 0.7
  ).length
  const durabilityRisk = trackable.length > 0 ? (missedTimeCount / trackable.length) * 100 : 0

  const injuryRiskScore = Math.round(currentInjuryRisk * 0.6 + durabilityRisk * 0.4)
  const score = Math.round(ageRiskScore * 0.5 + injuryRiskScore * 0.5)
  const label: RiskFactor['label'] = score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low'

  return { score, ageRiskScore, injuryRiskScore, label }
}
