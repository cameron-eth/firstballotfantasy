'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { useLeagueContext } from '@/lib/league-context'
import { DailyRankingDialog, type DailyBallot } from './DailyRankingDialog'
export function CommunityRankingPrompt() {
  const { user, loading } = useAuth()
  const { selectedLeagueId, isLoading } = useLeagueContext()
  const pathname = usePathname()
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [openScope, setOpenScope] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingWinner, setPendingWinner] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [seen, setSeen] = useState('')
  const eligible =
    !!user &&
    !loading &&
    !isLoading &&
    !['/login', '/billing', '/settings', '/community-rankings'].some((p) => pathname.startsWith(p))
  const endpoint = `/api/community-rankings${selectedLeagueId ? `?leagueId=${selectedLeagueId}` : ''}`
  const { data, mutate } = useSWR(
    eligible ? [endpoint, user.id, day] : null,
    async ([url]: [string, string, string]): Promise<DailyBallot> => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Daily ballot unavailable')
      return response.json()
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  const key = `community-ballot:seen:${user?.id ?? 'guest'}`
  useEffect(() => {
    const refresh = () => setDay(new Date().toISOString().slice(0, 10))
    const timer = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  useEffect(() => {
    if (!eligible || !data || data.day !== day || data.voted || seen === `${key}:${day}`) return
    try {
      if (localStorage.getItem(key) === day) return
      localStorage.setItem(key, day)
    } catch {}
    setSeen(`${key}:${day}`)
    setOpenScope(`${key}:${day}`)
    setPendingWinner(null)
    setMessage('')
  }, [eligible, data, day, key, seen])
  async function vote(winner: string) {
    if (!data || saving) return
    setPendingWinner(winner)
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: data.day, pair: data.choices.map((p) => p.key), winner }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 409) {
          const restored = await mutate()
          if (restored?.voted) return
        }
        throw new Error(result.error || 'Could not save your pick')
      }
      await mutate(result, false)
    } catch (e) {
      try {
        const restored = await mutate()
        if (restored?.voted) return
      } catch {
        /* Keep the selected card available for a safe retry. */
      }
      setMessage('Could not confirm your pick. Please retry; you will not be counted twice.')
    } finally {
      setSaving(false)
    }
  }
  if (!eligible || !data) return null
  return (
    <DailyRankingDialog
      key={`${user?.id}:${data.day}`}
      open={openScope === `${key}:${day}`}
      onClose={() => setOpenScope('')}
      data={data}
      saving={saving}
      pendingWinner={pendingWinner}
      error={message}
      onVote={vote}
    />
  )
}
