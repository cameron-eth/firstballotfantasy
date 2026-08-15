// Shared formatting and lookup helpers for the trade market views.
import { GRADE_COLORS } from '@/lib/trade-utils'

export function inWeekRange(week: number, weekRange: string): boolean {
  if (weekRange === 'all') return true
  const [start, end] = weekRange.split('-').map((x) => Number(x))
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true
  return week >= start && week <= end
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveHeadshot(
  playerName: string,
  playerId: string | null | undefined,
  allPlayers: Record<string, any>,
  dynastyRankings: Record<string, any>
): string | null {
  const ranking =
    dynastyRankings[playerName] || dynastyRankings[normalizeName(playerName)]
  if (ranking?.headshot_url) return ranking.headshot_url
  if (ranking?.espn_id)
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${ranking.espn_id}.png`
  const raw = playerId ? allPlayers[playerId] : null
  if (raw?.espn_id)
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${raw.espn_id}.png`
  return null
}

export function gradeColor(grade: string) {
  return GRADE_COLORS[grade as keyof typeof GRADE_COLORS] ?? 'bg-secondary text-muted-foreground border-border'
}

/** Map a 0–100 velocity score to a tempo label + color. */
export function tradeTempo(score: number): { label: string; color: string; bar: string } {
  if (score >= 80) return { label: 'Wheeler-Dealer', color: 'text-fuchsia-400', bar: 'bg-fuchsia-400' }
  if (score >= 55) return { label: 'Active', color: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 30) return { label: 'Steady', color: 'text-blue-400', bar: 'bg-blue-400' }
  if (score >= 12) return { label: 'Occasional', color: 'text-yellow-400', bar: 'bg-yellow-400' }
  return { label: 'Dormant', color: 'text-muted-foreground', bar: 'bg-muted-foreground/50' }
}

export function formatGap(days: number): string {
  if (!days || !isFinite(days)) return '—'
  if (days < 1) return `${Math.round(days * 24)}h`
  if (days < 14) return `${days.toFixed(1)}d`
  if (days < 60) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}
