/**
 * Start/sit: what the lineup you've set is projected to score, against the best
 * lineup available to you this week.
 *
 * This reuses the same matcher that powers Max PF — the question is identical
 * ("seat the highest-scoring legal lineup"), only the input changes from realized
 * points to projections. Nothing here re-implements the assignment.
 */
import { optimalLineup, parseScoringSlots } from '../draft-order/maxPointsFor'

export interface StartSitPlayer {
  playerId: string
  name: string
  position: string
  projected: number
}

export interface StartSitSwap {
  /** Null when someone should simply be benched with no one to replace them. */
  start: StartSitPlayer | null
  /** Null when the move fills an empty slot rather than replacing anyone. */
  sit: StartSitPlayer | null
  /** Projected points this move adds. */
  gain: number
}

export interface StartSitResult {
  /** Projected total for the lineup currently set. */
  startersProjected: number
  /** Projected total for the best legal lineup. */
  optimalProjected: number
  /** optimal − current. Zero when the lineup is already optimal. */
  pointsLeft: number
  swaps: StartSitSwap[]
  /** True when no lineup has been set yet, so there is nothing to compare against. */
  noLineupSet: boolean
}

interface RosterPlayer {
  playerId: string
  playerName: string
  position: string
}

/**
 * Pair the players entering the lineup with those leaving it.
 *
 * Both lineups are legal and use the same slots, so the swap is a set difference —
 * which player nominally replaces which is a presentation choice, not a constraint.
 * Pairing the biggest gain against the weakest incumbent reads the way a manager
 * thinks about it, and because it is a pairing of the same two sets, the individual
 * gains still sum to the true total.
 *
 * The two sets need not be the same size. An empty slot (Sleeper writes '0') means
 * someone should start with nobody coming out; those moves must still be shown, and
 * still count toward the total, so unpaired players on either side get their own row.
 */
function pairSwaps(incoming: StartSitPlayer[], outgoing: StartSitPlayer[]): StartSitSwap[] {
  const starts = [...incoming].sort((a, b) => b.projected - a.projected)
  const sits = [...outgoing].sort((a, b) => a.projected - b.projected)
  const swaps: StartSitSwap[] = []
  for (let i = 0; i < Math.max(starts.length, sits.length); i++) {
    const start = starts[i] ?? null
    const sit = sits[i] ?? null
    swaps.push({
      start,
      sit,
      gain: (start?.projected ?? 0) - (sit?.projected ?? 0),
    })
  }
  return swaps
}

export function computeStartSit(
  players: RosterPlayer[],
  currentStarters: string[] | undefined,
  weekProjections: Record<string, number>,
  rosterPositions: string[] | undefined
): StartSitResult {
  const slots = parseScoringSlots(rosterPositions)
  const byId = new Map(players.map((p) => [p.playerId, p]))
  const positionOf = (playerId: string) => byId.get(playerId)?.position

  const projectionsForRoster: Record<string, number> = {}
  for (const player of players) {
    projectionsForRoster[player.playerId] = weekProjections[player.playerId] ?? 0
  }

  const best = optimalLineup(projectionsForRoster, slots, positionOf)
  const optimalIds = new Set(best.seated.map((s) => s.playerId))

  const starters = (currentStarters ?? []).filter((id) => id && id !== '0')
  const noLineupSet = starters.length === 0

  const describe = (playerId: string): StartSitPlayer => {
    const player = byId.get(playerId)
    return {
      playerId,
      name: player?.playerName ?? 'Unknown',
      position: player?.position ?? '—',
      projected: projectionsForRoster[playerId] ?? 0,
    }
  }

  const startersProjected = starters.reduce((sum, id) => sum + (projectionsForRoster[id] ?? 0), 0)
  const starterSet = new Set(starters)

  const incoming = best.seated
    .filter((s) => !starterSet.has(s.playerId))
    .map((s) => describe(s.playerId))
  const outgoing = starters.filter((id) => !optimalIds.has(id)).map(describe)

  return {
    startersProjected,
    optimalProjected: best.total,
    // A set lineup can only ever match or trail the optimum, but float noise and a
    // stale starter that is no longer rostered can both push this slightly negative.
    pointsLeft: Math.max(0, best.total - startersProjected),
    swaps: noLineupSet ? [] : pairSwaps(incoming, outgoing),
    noLineupSet,
  }
}
