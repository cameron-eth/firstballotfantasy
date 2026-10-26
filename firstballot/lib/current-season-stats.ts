export interface EspnFantasyPlayer {
  id: number
  fullName: string
  defaultPositionId: number
  ownership?: { averageDraftPosition?: number | null }
  stats?: {
    seasonId: number
    statSourceId: number
    statSplitTypeId: number
    scoringPeriodId: number
    appliedTotal?: number
    stats?: Record<string, number>
  }[]
}
export interface CurrentSeasonStat {
  espnId: string
  name: string
  position: string
  season: number
  games: number
  points: number
  ppg: number
  rank: number
  adp: number | null
}
const positions: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF' }
/** ESPN default league 3 uses PPR. Never consume projected or weekly rows as season actuals. */
export function currentSeasonStats(
  players: EspnFantasyPlayer[],
  season: number
): Record<string, CurrentSeasonStat> {
  const rows: CurrentSeasonStat[] = []
  for (const p of players) {
    const s = p.stats?.find(
      (s) =>
        s.seasonId === season &&
        s.statSourceId === 0 &&
        s.statSplitTypeId === 0 &&
        s.scoringPeriodId === 0
    )
    const gp = s?.stats?.['210'],
      points = s?.appliedTotal,
      position = positions[p.defaultPositionId]
    if (
      !position ||
      !gp ||
      gp < 1 ||
      !Number.isInteger(gp) ||
      points == null ||
      !Number.isFinite(points)
    )
      continue
    rows.push({
      espnId: String(p.id),
      name: p.fullName,
      position,
      season,
      games: gp,
      points,
      ppg: points / gp,
      rank: 0,
      adp: Number.isFinite(p.ownership?.averageDraftPosition)
        ? Number(p.ownership?.averageDraftPosition)
        : null,
    })
  }
  for (const pos of Object.values(positions)) {
    const group = rows
      .filter((p) => p.position === pos)
      .sort((a, b) => b.ppg - a.ppg || a.espnId.localeCompare(b.espnId))
    group.forEach((p, i) => {
      p.rank = i > 0 && Math.abs(group[i - 1].ppg - p.ppg) < 1e-8 ? group[i - 1].rank : i + 1
    })
  }
  return Object.fromEntries(rows.map((p) => [p.espnId, p]))
}
