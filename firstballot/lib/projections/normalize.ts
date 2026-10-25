import { scoreFromStats, type ScoringSettings } from './scoring'

export interface SleeperProjectionRow {
  player_id: string
  team?: string | null
  opponent?: string | null
  game_id?: string | null
  stats?: Record<string, number> | null
}

/** Match the SDK's has_projection rule: filler rows are not zero-point forecasts. */
export function normalizeProjection(row: SleeperProjectionRow, scoring: ScoringSettings | null) {
  if (!row.stats || !Object.hasOwn(row.stats, 'pts_ppr')) return null
  const pts = scoring ? scoreFromStats(row.stats, scoring) : Number(row.stats.pts_ppr)
  if (!Number.isFinite(pts)) return null
  return {
    pts: Math.round(pts * 100) / 100,
    gp: Number(row.stats.gp) || 0,
    opponent: row.opponent ?? null,
  }
}
