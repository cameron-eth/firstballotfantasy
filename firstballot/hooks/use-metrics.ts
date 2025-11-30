import { useState, useEffect } from 'react'
import type { MetricsData } from '@/types/metrics'

interface UseMetricsReturn {
  data: MetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMetrics(): UseMetricsReturn {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetricsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/metrics')
      if (!response.ok) {
        throw new Error('Failed to fetch metrics data')
      }
      const result = await response.json()

      setData(result)
    } catch (err) {
      console.error('Error fetching metrics data:', err)
      setError('Failed to load metrics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetricsData()
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchMetricsData,
  }
}
