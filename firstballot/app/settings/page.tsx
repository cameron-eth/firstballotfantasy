'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, KeyRound, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth'
import { useLeagueContext } from '@/lib/league-context'

type Connection = { saved: boolean; expired?: boolean; expiresAt?: string }
export default function SettingsPage() {
  const { user, loading } = useAuth()
  const { leagues, selectedLeagueId } = useLeagueContext()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [token, setToken] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [league, setLeague] = useState('')
  const leagueId = league || selectedLeagueId || leagues[0]?.league_id
  const button =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40'
  async function request(action: string, extra: object = {}) {
    const response = await fetch('/api/sleeper/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, leagueId, ...extra }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to update connection.')
    return result
  }
  useEffect(() => {
    setToken('')
    setEditing(false)
    setConnection(null)
    setNotice('')
    setError('')
    if (!user) return
    let active = true
    request('status')
      .then((value) => {
        if (active) setConnection(value)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
    // Status is account-scoped and does not require a selected league.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  async function act(action: 'connect' | 'restore' | 'disconnect') {
    setBusy(action)
    setNotice('')
    setError('')
    try {
      const result = await request(action, action === 'connect' ? { token: token.trim() } : {})
      if (action === 'restore' && !result.connected)
        throw new Error('No saved connection. Add a token below.')
      if (action !== 'restore') setConnection(await request('status'))
      setToken('')
      setEditing(false)
      setNotice(
        action === 'disconnect'
          ? 'Saved access revoked.'
          : action === 'connect'
            ? 'Connection saved. You’re ready to manage your team.'
            : 'Connection works. Sleeper verified access to this league.'
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection request failed.')
    } finally {
      setBusy('')
    }
  }
  const checking = loading || (!!user && !connection && !error)
  const needsToken = !checking && (editing || !connection?.saved || connection.expired)
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Your account</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage the services connected to First Ballot.
        </p>
        <section
          aria-label="Sleeper connection"
          className="mt-7 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900"
        >
          <div className="flex items-start gap-3 border-b border-white/5 p-5 sm:p-6">
            <div className="rounded-xl bg-blue-400/10 p-3 text-blue-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-white">Sleeper</h2>
              <p className="mt-1 text-sm text-slate-400">
                Trades, lineups and private trade interest.
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${connection?.saved && !connection.expired ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}
            >
              {loading || (user && !connection && !error)
                ? 'Checking…'
                : connection?.expired
                  ? 'Expired'
                  : connection?.saved
                    ? 'Saved'
                    : 'Not connected'}
            </span>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            {!user && !loading && (
              <p className="text-sm text-slate-300">
                <Link className="text-blue-300 underline" href="/login">
                  Sign in
                </Link>{' '}
                to save your connection.
              </p>
            )}
            {connection?.saved && !connection.expired && (
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p>
                  Your token is saved. You won’t be asked to enter it again on each visit.
                  {connection.expiresAt && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Expires {new Date(connection.expiresAt).toLocaleDateString()}.
                    </span>
                  )}
                </p>
              </div>
            )}
            {connection?.expired && (
              <p className="text-sm text-amber-300">
                Your saved token expired. Add a new token to reconnect.
              </p>
            )}
            {user && (
              <label className="block text-xs font-medium text-slate-400">
                League for verification
                <select
                  value={leagueId ?? ''}
                  onChange={(e) => setLeague(e.target.value)}
                  disabled={!!busy}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
                >
                  <option value="">Choose a league</option>
                  {leagues.map((l) => (
                    <option key={l.league_id} value={l.league_id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {needsToken && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200" htmlFor="sleeper-token">
                  {connection?.saved ? 'New authorization token' : 'Authorization token'}
                </label>
                <input
                  id="sleeper-token"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={token}
                  disabled={!user || !!busy}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your Sleeper token"
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-4 text-sm text-white placeholder:text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer text-blue-300">
                    Where do I find my token?
                  </summary>
                  <p className="mt-2 max-w-xl leading-relaxed">
                    Open Sleeper on the web. In browser DevTools, open Network, select a GraphQL
                    request, and copy its authorization header.
                  </p>
                </details>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`${button} border-blue-400 bg-blue-400 text-slate-950 hover:bg-blue-300`}
                    disabled={!user || !leagueId || !token.trim() || !!busy}
                    onClick={() => act('connect')}
                  >
                    {busy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save
                    connection
                  </button>
                  {editing && (
                    <button
                      className={button}
                      disabled={!!busy}
                      onClick={() => {
                        setEditing(false)
                        setToken('')
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
            {(connection?.saved || (!!user && !!error)) && (
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={!!busy || !leagueId || !connection?.saved || connection?.expired}
                  onClick={() => act('restore')}
                >
                  {busy === 'restore' ? 'Testing…' : 'Test connection'}
                </button>
                {connection?.saved && !needsToken && (
                  <button className={button} disabled={!!busy} onClick={() => setEditing(true)}>
                    Replace token
                  </button>
                )}
                <button
                  className={`${button} text-rose-300`}
                  disabled={!!busy}
                  onClick={() => act('disconnect')}
                >
                  {busy === 'disconnect' ? 'Revoking…' : 'Revoke saved access'}
                </button>
              </div>
            )}
            {notice && (
              <p role="status" className="text-sm text-emerald-300">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-rose-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <div className="flex items-start gap-2 border-t border-white/5 bg-slate-800/30 px-5 py-4 text-xs leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Encrypted and saved to your account. Revoking removes First Ballot’s saved access; it
              does not invalidate the token at Sleeper.
            </p>
          </div>
        </section>
        <Link href="/league-buddy?tab=roster" className="mt-6 inline-block text-sm text-blue-300">
          Back to my team →
        </Link>
      </main>
    </>
  )
}
