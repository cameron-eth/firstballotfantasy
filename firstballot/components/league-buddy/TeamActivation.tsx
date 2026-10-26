'use client'
import { useState, type ReactNode } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
export function TeamActivation({ leagueId, children }: { leagueId: string; children: ReactNode }) {
  const { user } = useAuth(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const { data, error, mutate } = useSWR(
    user ? ['active-teams', user.id, leagueId] : null,
    async () => {
      const r = await fetch('/api/account/teams')
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      return b
    }
  )
  const team = data?.teams.find((t: { league_id: string }) => t.league_id === leagueId)
  async function activate() {
    setBusy(true)
    setNotice('')
    try {
      const r = await fetch('/api/account/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          team ? { action: 'activate', teamId: team.id } : { action: 'connect', leagueId }
        ),
      })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      if (b.needsUpgrade)
        setNotice('Your team is connected. Add a slot or archive another team to activate it.')
      await mutate()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to activate team.')
    } finally {
      setBusy(false)
    }
  }
  if (team?.active) return <>{children}</>
  return (
    <section className="my-8 rounded-2xl border border-slate-700 bg-slate-900 p-7">
      <h2 className="text-xl font-semibold text-white">
        {!data && !error ? 'Loading your teams…' : 'Make this your next team'}
      </h2>
      <p className="mt-3 text-sm text-slate-400">
        Your first active team is free, including scouting and planning. Connecting a team never
        charges you automatically.
      </p>
      {error && (
        <p className="mt-3 text-amber-300" role="alert">
          {error.message}
        </p>
      )}
      {data && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={busy}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={activate}
          >
            {busy ? 'Connecting…' : 'Activate this team'}
          </button>
          <Link
            href="/billing"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
          >
            Manage team slots
          </Link>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-blue-300">
          {notice}
        </p>
      )}
    </section>
  )
}
