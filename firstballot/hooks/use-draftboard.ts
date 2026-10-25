import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import type { Draftboard } from '@/types/draftboard'

export function useDraftboard() {
  const { user } = useAuth()
  const [savedBoards, setSavedBoards] = useState<Draftboard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!user) { setSavedBoards([]); setLoadedUserId(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/draftboard').then(async (response) => {
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not load boards')
      return response.json()
    }).then((data) => { if (!cancelled) setSavedBoards(data.boards || []) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load boards') })
      .finally(() => { if (!cancelled) { setLoadedUserId(user.id); setLoading(false) } })
    return () => { cancelled = true }
  }, [user])
  const saveBoard = useCallback(async (year: number, prospectIds: number[]): Promise<Draftboard | null> => {
    if (!user) return null
    const existing = savedBoards.find((board) => board.draft_year === year)
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/draftboard', {
        method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing?.id, name: `${year} Draft Board`, draft_year: year, prospect_ids: prospectIds }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not save board')
      const { board } = await response.json() as { board: Draftboard }
      setSavedBoards((current) => [board, ...current.filter((item) => item.id !== board.id)])
      return board
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save board')
      return null
    } finally { setSaving(false) }
  }, [user, savedBoards])
  return { savedBoards, loading: loading || Boolean(user && loadedUserId !== user.id), saving, error, saveBoard }
}
