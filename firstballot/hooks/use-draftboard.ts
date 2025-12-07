import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import type { Draftboard } from '@/types/draftboard'

interface UseDraftboardReturn {
  savedBoard: Draftboard | null
  loading: boolean
  saving: boolean
  error: string | null
  loadBoard: () => Promise<Draftboard | null>
  saveBoard: (prospectIds: number[]) => Promise<Draftboard | null>
}

export function useDraftboard(): UseDraftboardReturn {
  const { user } = useAuth()
  const [savedBoard, setSavedBoard] = useState<Draftboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Load the user's single board
  const loadBoard = useCallback(async (): Promise<Draftboard | null> => {
    if (!user) return null

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/draftboard')

      if (!response.ok) {
        throw new Error('Failed to fetch board')
      }

      const data = await response.json()
      const boards = data.boards || []

      // Get the first (and only) board if it exists
      const board = boards.length > 0 ? boards[0] : null
      setSavedBoard(board)
      return board
    } catch (err) {
      console.error('Error loading board:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board')
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  // Save (create or update) the single board
  const saveBoard = useCallback(
    async (prospectIds: number[]): Promise<Draftboard | null> => {
      if (!user) return null

      setSaving(true)
      setError(null)

      try {
        const isUpdate = !!savedBoard
        const response = await fetch('/api/draftboard', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: savedBoard?.id,
            name: 'My Draft Board',
            draft_year: 2026,
            prospect_ids: prospectIds,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save board')
        }

        const data = await response.json()
        setSavedBoard(data.board)
        return data.board
      } catch (err) {
        console.error('Error saving board:', err)
        setError(err instanceof Error ? err.message : 'Failed to save board')
        return null
      } finally {
        setSaving(false)
      }
    },
    [user, savedBoard]
  )

  // Load board on mount when user is available
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadBoard()
    }
  }, [user, loadBoard])

  return {
    savedBoard,
    loading,
    saving,
    error,
    loadBoard,
    saveBoard,
  }
}
