export const MAX_DAILY_BALLOTS = 20
/** Round zero is the original daily ballot; later rounds are opt-in. */
export function parseBallotRound(raw: string | null): number | null {
  if (raw === null) return 0
  if (!/^\d+$/.test(raw)) return null
  const round = Number(raw)
  return Number.isSafeInteger(round) && round >= 0 && round < MAX_DAILY_BALLOTS ? round : null
}
