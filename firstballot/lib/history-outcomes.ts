export interface OutcomePlayer {
  id: string
  espnId: string | null
  name: string
  position: string
  year: number
  adp: number | null
  adpCount: number
  adpWindow: string[] | null
  seasons: Record<string, { points: number[]; games: number }>
}
export interface OutcomeSnapshot {
  season: number
  week: number
  version: string
  players: OutcomePlayer[]
}
export interface CareerOutcome {
  bars: number | null
  label: string
  reason?: string
  early: boolean
  actual: number
  expected?: number
  peers?: number
  adp: number | null
  adpCount: number
  window: string[] | null
}
export function gradeOrder(
  a: { overall_grade: number | null; name: string },
  b: { overall_grade: number | null; name: string }
) {
  return (
    (b.overall_grade ?? -Infinity) - (a.overall_grade ?? -Infinity) || a.name.localeCompare(b.name)
  )
}
/** Compare equal elapsed seasons, then the same fraction of the final regular season. */
export function careerPoints(
  p: OutcomePlayer,
  years: number,
  week: number,
  referenceSeason: number
) {
  let points = 0
  for (let offset = 0; offset <= years; offset++) {
    const year = p.year + offset
    const length = year >= 2021 ? 18 : 17
    const stop =
      offset === years ? Math.round((week / (referenceSeason >= 2021 ? 18 : 17)) * length) : length
    points += (p.seasons[String(year)]?.points ?? []).slice(0, stop).reduce((a, b) => a + b, 0)
  }
  return points
}
export function careerOutcome(player: OutcomePlayer, snapshot: OutcomeSnapshot): CareerOutcome {
  const age = snapshot.season - player.year
  const actual = careerPoints(player, age, snapshot.week, snapshot.season)
  const base = {
    actual,
    early: age < 2,
    adp: player.adp,
    adpCount: player.adpCount,
    window: player.adpWindow,
  }
  const neutral = (reason: string): CareerOutcome => ({
    ...base,
    bars: null,
    label: 'Not rated',
    reason,
  })
  if (age < 0 || snapshot.week === 0) return neutral('No completed NFL production window.')
  if (!player.adp) return neutral('No historical rookie ADP baseline.')
  if (player.adpCount < 5) return neutral('Too few rookie ADP observations.')
  const peers = snapshot.players
    .filter(
      (p) =>
        p.id !== player.id &&
        p.year < player.year &&
        p.position === player.position &&
        p.adp &&
        p.adpCount >= 5 &&
        Math.abs(Math.log(p.adp / player.adp!)) <= Math.log(2)
    )
    .map((p) => ({
      points: careerPoints(p, age, snapshot.week, snapshot.season),
      weight: Math.exp(-Math.pow(Math.log(p.adp! / player.adp!) / Math.log(2), 2)),
    }))
  if (peers.length < 8) return neutral('Fewer than eight comparable historical players.')
  const weight = peers.reduce((s, p) => s + p.weight, 0)
  const expected = peers.reduce((s, p) => s + p.points * p.weight, 0) / weight
  if (expected <= 0) return neutral('Comparable players have insufficient production.')
  // An expectation-relative scale: 100% is the cohort's weighted average.
  // Thresholds are descriptive, versioned rules, not probabilities of future success.
  const ratio = actual / expected
  const bars = ratio < 0.5 ? 1 : ratio < 0.8 ? 2 : ratio < 1.2 ? 3 : ratio < 1.5 ? 4 : 5
  const labels = ['Miss pace', 'Below expectation', 'On track', 'Hit pace', 'Strong hit pace']
  return { ...base, bars, label: labels[bars - 1], expected, peers: peers.length }
}
