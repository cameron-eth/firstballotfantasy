'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Header } from '@/components/header'
function Consent() {
  const { user } = useAuth(),
    params = useSearchParams(),
    authorizationId = params.get('authorization_id') ?? ''
  const [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const { data: consent, error: loadError } = useSWR(
    user && authorizationId ? ['oauth-consent', user.id, authorizationId] : null,
    async () => {
      const [auth, r] = await Promise.all([
        supabase.auth.oauth.getAuthorizationDetails(authorizationId),
        fetch('/api/account/teams'),
      ])
      const t = await r.json()
      if (auth.error) throw auth.error
      if (!r.ok) throw new Error(t.error)
      return { auth: auth.data, teams: t.teams as { id: string; name: string; active: boolean }[] }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  const name = consent?.auth && 'authorization_id' in consent.auth ? consent.auth.client.name : ''
  const teams = consent?.teams.filter((t) => t.active) ?? []
  const redirect =
    consent?.auth && 'redirect_url' in consent.auth ? consent.auth.redirect_url : null
  useEffect(() => {
    if (redirect) window.location.assign(redirect)
  }, [redirect])
  async function decide(action: string) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/account/oauth-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, authorizationId, teamIds: selected }),
      })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      window.location.assign(b.redirect_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed.')
      setBusy(false)
    }
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-5 py-12 text-slate-100">
        <h1 className="text-2xl font-semibold">Connect {name || 'your assistant'}</h1>
        <p className="mt-3 text-slate-400">
          Allow read-only access to selected teams and player statistics. This connection cannot
          send trades, change lineups or read your Sleeper token.
        </p>
        {!user ? (
          <Link className="mt-6 inline-block text-blue-300" href="/login">
            Sign in, then return here
          </Link>
        ) : (
          <>
            <fieldset className="mt-6 space-y-3">
              <legend className="mb-3 text-sm text-slate-400">Choose teams</legend>
              {teams.map((t) => (
                <label key={t.id} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, t.id]
                          : selected.filter((id) => id !== t.id)
                      )
                    }
                  />
                  {t.name}
                </label>
              ))}
            </fieldset>
            <div className="mt-6 flex gap-3">
              <button
                disabled={busy || !selected.length || !name}
                onClick={() => decide('approve')}
                className="rounded-lg bg-blue-500 px-4 py-2 disabled:opacity-40"
              >
                Allow read-only access
              </button>
              <button
                disabled={busy || !name}
                onClick={() => decide('deny')}
                className="rounded-lg border border-slate-600 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </>
        )}
        {(error || loadError) && (
          <p role="alert" className="mt-5 text-amber-300">
            {error || loadError?.message}
          </p>
        )}
      </main>
    </>
  )
}
export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  )
}
