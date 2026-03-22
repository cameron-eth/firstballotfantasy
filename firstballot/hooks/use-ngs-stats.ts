import useSWR from 'swr'

type StatType = 'passing' | 'rushing' | 'receiving'

interface NGSStatsParams {
  type: StatType
  season?: string
  week?: number
  team?: string
  player_id?: string
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export function useNGSStats(params: NGSStatsParams) {
  const queryKey = JSON.stringify(params)
  const { data, error, isLoading } = useSWR(queryKey, async () => {
    const searchParams = new URLSearchParams({
      type: params.type,
      ...(params.season && { season: params.season }),
      ...(params.week && { week: params.week.toString() }),
      ...(params.team && { team: params.team }),
      ...(params.player_id && { player_id: params.player_id }),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    })

    const response = await fetch(`/api/ngs-stats?${searchParams}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Failed to fetch NGS stats: ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
    return result.data || []
  })

  return { data: data || [], loading: isLoading, error: error as Error | null }
}
