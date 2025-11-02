import { useState, useEffect } from 'react'

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
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
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
          console.error('API error response:', errorData)
          throw new Error(`Failed to fetch NGS stats: ${errorData.error || response.statusText}`)
        }

        const result = await response.json()
        console.log('API success response:', result)
        setData(result.data || [])
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching NGS stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [
    params.type,
    params.season,
    params.week,
    params.team,
    params.player_id,
    params.limit,
    params.sort,
    params.order,
  ])

  return { data, loading, error }
}
