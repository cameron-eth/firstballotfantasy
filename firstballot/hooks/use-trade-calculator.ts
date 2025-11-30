import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import type { TradeResult } from '@/types/trade-calculator'

export function useTradeCalculator() {
  const [side1, setSide1] = useState<string[]>([])
  const [side2, setSide2] = useState<string[]>([])
  const [result, setResult] = useState<TradeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSide1 = useDebounce(side1, 500)
  const debouncedSide2 = useDebounce(side2, 500)

  const evaluateTrade = useCallback(async (s1: string[], s2: string[]) => {
    if (s1.length === 0 && s2.length === 0) {
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/trade-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          side1: s1,
          side2: s2,
          season: 2025,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to evaluate trade')
      }

      const tradeResult = await response.json()
      setResult(tradeResult)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate trade'
      setError(errorMessage)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedSide1.length > 0 || debouncedSide2.length > 0) {
      evaluateTrade(debouncedSide1, debouncedSide2)
    } else {
      setResult(null)
    }
  }, [debouncedSide1, debouncedSide2, evaluateTrade])

  const handleEvaluate = useCallback(() => {
    evaluateTrade(side1, side2)
  }, [side1, side2, evaluateTrade])

  return {
    side1,
    setSide1,
    side2,
    setSide2,
    result,
    loading,
    error,
    handleEvaluate,
  }
}
