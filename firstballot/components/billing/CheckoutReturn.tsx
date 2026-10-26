'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { useAuth } from '@/lib/auth'
import { useLeagueContext } from '@/lib/league-context'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { accountTeamCache, teamWorkspaceUrl } from '@/lib/team-navigation'
import { CheckoutConfirmation } from './CheckoutConfirmation'
export function CheckoutReturn() {
  const params = useSearchParams()
  const { user } = useAuth()
  const { selectLeague } = useLeagueContext()
  const router = useRouter()
  const desktop = useDesktopBuilder()
  const { mutate } = useSWRConfig()
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requested = params.get('leagueId')
  useEffect(() => {
    if (!user) {
      setTarget('')
      return
    }
    const key = `firstballot:checkout-team:${user.id}`
    try {
      if (requested && /^\d+$/.test(requested)) sessionStorage.setItem(key, requested)
      setTarget(
        requested && /^\d+$/.test(requested) ? requested : (sessionStorage.getItem(key) ?? '')
      )
    } catch {
      setTarget(requested && /^\d+$/.test(requested) ? requested : '')
    }
  }, [user, requested])
  async function openTeam() {
    if (!target || !user || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', leagueId: target }),
      })
      const result = await response.json()
      if (!response.ok || result.needsUpgrade)
        throw new Error(
          result.error || 'Membership access is still updating. Try again in a moment.'
        )
      await mutate((key) => accountTeamCache(key, user.id))
      selectLeague(target)
      try {
        sessionStorage.removeItem(`firstballot:checkout-team:${user.id}`)
      } catch {}
      router.push(teamWorkspaceUrl(target, desktop))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your team.')
      setBusy(false)
    }
  }
  return (
    <CheckoutConfirmation
      session={params.get('session_id')}
      accountId={user?.id ?? null}
      onOpenTeam={target ? openTeam : undefined}
      openingTeam={busy}
      activationError={error}
    />
  )
}
