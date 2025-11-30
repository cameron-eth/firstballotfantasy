import { useState, useEffect } from 'react'
import type { TeamBuilderData } from '@/types/team-builder'

export function useTeamBuilder() {
  const [data, setData] = useState<TeamBuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamBuilderData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/team-archetypes')
      if (!response.ok) {
        throw new Error('Failed to fetch team builder data')
      }
      const result = await response.json()

      setData(result)
    } catch (err) {
      console.error('Error fetching team builder data:', err)
      setError('Failed to load team builder data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamBuilderData()
  }, [])

  const getProbabilityColor = (probability: string) => {
    const num = parseInt(probability.replace('%', ''))
    if (num >= 60) return 'bg-green-500'
    if (num >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'high':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return {
    data,
    loading,
    error,
    refetch: fetchTeamBuilderData,
    getProbabilityColor,
    getRiskColor,
  }
}
