import type { Candidate } from './rating'

/** The slice of the published tier snapshot (TIER_KEY) the ballot pool reads. */
export type TierPool = {
  players: { sf: Record<string, { rank: number }> }
  identity: Record<string, { name: string; position: string; team?: string; espnId?: string }>
}

const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE'])
export const NFL_POOL_SIZE = 200

/**
 * The NFL half of the community ballot pool (D7, G4): the top 200 QB/RB/WR/TE in the
 * published superflex dynasty ranking, keyed by Sleeper id. It replaces dynasty_player_tiers,
 * which nothing had written since 2026-02-22.
 */
export function nflCandidates(tiers: TierPool): Candidate[] {
  return Object.entries(tiers.players.sf)
    .flatMap(([id, player]) => {
      const who = tiers.identity[id]
      return who && POSITIONS.has(who.position) ? [{ id, rank: player.rank, who }] : []
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, NFL_POOL_SIZE)
    .map(({ id, who }) => ({
      key: `nfl:${id}`,
      name: who.name,
      position: who.position,
      team: who.team || 'NFL',
      image: who.espnId
        ? `https://a.espncdn.com/i/headshots/nfl/players/full/${who.espnId}.png`
        : null,
      kind: 'nfl' as const,
    }))
}
