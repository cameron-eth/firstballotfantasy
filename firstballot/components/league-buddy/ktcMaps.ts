import type { KtcHistoryPoint } from './types'

export type KtcMaps = {
  history: Record<string, KtcHistoryPoint[]>
  latest: Record<string, { value_sf: number; value_1qb: number }>
}

/** KTC history is the heaviest payload, so it loads after first paint and chunks run in parallel. */
export async function fetchKtcMaps(
  names: string[],
  version: number,
  apiBase = ''
): Promise<KtcMaps> {
  const chunkSize = 50
  const chunks: string[][] = []
  for (let i = 0; i < names.length; i += chunkSize) chunks.push(names.slice(i, i + chunkSize))
  const history: KtcMaps['history'] = {}
  const latest: KtcMaps['latest'] = {}
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const resp = await fetch(
          `${apiBase}/api/ktc-values?names=${encodeURIComponent(chunk.join(','))}&_v=${version}`
        )
        if (!resp.ok) return
        const json = await resp.json()
        if (json.historyMap) Object.assign(history, json.historyMap)
        if (Array.isArray(json.data)) {
          json.data.forEach((row: { player_name: string; value_sf: number; value_1qb: number }) => {
            latest[row.player_name] = { value_sf: row.value_sf, value_1qb: row.value_1qb }
          })
        }
      } catch {
        // Non-fatal
      }
    })
  )
  return { history, latest }
}
