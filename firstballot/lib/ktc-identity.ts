/**
 * KTC ↔ Sleeper identity, resolved once per tier publish (PR-19, audit R4-1). Every other
 * reader joins KTC through the ids this produces, never by display name.
 *
 * A KTC row matches the Sleeper player with the same normalized name and position. When
 * several Sleeper players share that name (a retired namesake, say), the team breaks the
 * tie; if that still leaves more than one, the row stays unmatched rather than guessed.
 * When no one at that position has the name (Travis Hunter: a WR to KTC, a DB to Sleeper),
 * the one same-named player on the same team is the match.
 */

/** KTC's team codes where they differ from Sleeper's. */
const KTC_TEAMS: Record<string, string> = {
  GBP: 'GB',
  JAC: 'JAX',
  KCC: 'KC',
  LVR: 'LV',
  NEP: 'NE',
  NOS: 'NO',
  SFO: 'SF',
  TBB: 'TB',
}
export const sleeperTeam = (ktcTeam: string | null | undefined) =>
  ktcTeam ? (KTC_TEAMS[ktcTeam] ?? ktcTeam) : null

export const normalizePlayerName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '')

type KtcRow = { player_name: string; position: string; team?: string | null }
type SleeperPlayer = { full_name?: string; position?: string; team?: string | null }

/** Each KTC row with the one Sleeper id it resolves to; unresolved rows are left out. */
export function matchKtcToSleeper<R extends KtcRow, P extends SleeperPlayer>(
  rows: R[],
  sleeper: Record<string, P>
): { id: string; row: R; player: P }[] {
  const byName = new Map<string, string[]>()
  const byNameAnyPosition = new Map<string, string[]>()
  for (const [id, player] of Object.entries(sleeper)) {
    if (!player.full_name) continue
    const name = normalizePlayerName(player.full_name)
    byNameAnyPosition.set(name, [...(byNameAnyPosition.get(name) ?? []), id])
    if (!['QB', 'RB', 'WR', 'TE'].includes(player.position ?? '')) continue
    const key = `${name}:${player.position}`
    byName.set(key, [...(byName.get(key) ?? []), id])
  }
  return rows.flatMap((row) => {
    const name = normalizePlayerName(row.player_name)
    const named = byName.get(`${name}:${row.position}`) ?? []
    const team = sleeperTeam(row.team)
    const onTeam = (ids: string[]) => (team ? ids.filter((id) => sleeper[id].team === team) : [])
    const ids =
      named.length === 1
        ? named
        : named.length > 1
          ? onTeam(named)
          : onTeam(byNameAnyPosition.get(name) ?? [])
    return ids.length === 1 ? [{ id: ids[0], row, player: sleeper[ids[0]] }] : []
  })
}
