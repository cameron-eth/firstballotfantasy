import type { KtcHistoryPoint } from './types'

/** KTC values and history keyed by Sleeper player id (PR-19: never by display name). */
export type KtcMaps = {
  history: Record<string, KtcHistoryPoint[]>
  latest: Record<string, { value_sf: number; value_1qb: number }>
}

/** KTC history is the heaviest payload, so it loads after first paint and chunks run in parallel. */
export async function fetchKtcMaps(
  sleeperIds: string[],
  version: number,
  apiBase = ''
): Promise<KtcMaps> {
  const chunkSize = 50
  const chunks: string[][] = []
  for (let i = 0; i < sleeperIds.length; i += chunkSize)
    chunks.push(sleeperIds.slice(i, i + chunkSize))
  const history: KtcMaps['history'] = {}
  const latest: KtcMaps['latest'] = {}
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const resp = await fetch(
          `${apiBase}/api/ktc-values?sleeperIds=${chunk.join(',')}&_v=${version}`
        )
        if (!resp.ok) return
        const json = await resp.json()
        if (json.history) Object.assign(history, json.history)
        if (json.latest) Object.assign(latest, json.latest)
      } catch {
        // Non-fatal
      }
    })
  )
  return { history, latest }
}
