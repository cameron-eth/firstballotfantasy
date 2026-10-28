'use client'
import { useState, type ReactNode } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { accountTeamCache, teamWorkspaceUrl } from '@/lib/team-navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { ArrowLeftRight, CalendarRange, Map as MapIcon } from 'lucide-react'
import { TeamMapPreview } from '@/components/landing/TeamMapPreview'
const PERKS = [
  { icon: MapIcon, text: 'See your roster on the map' },
  { icon: ArrowLeftRight, text: 'Find trades that fit' },
  { icon: CalendarRange, text: 'Plan three seasons ahead' },
]

export function TeamActivation({
  leagueId,
  leagueName,
  children,
}: {
  leagueId: string
  leagueName?: string
  children: ReactNode
}) {
  const router = useRouter()
  const desktop = useDesktopBuilder()
  const { mutate: refreshCache } = useSWRConfig()
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
        setNotice(
          'Your team is connected. Upgrade to Unlimited or archive another team to activate it.'
        )
      await mutate()
      if (user) await refreshCache((key) => accountTeamCache(key, user.id))
      if (!b.needsUpgrade) router.replace(teamWorkspaceUrl(leagueId, desktop))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to activate team.')
    } finally {
      setBusy(false)
    }
  }
  if (team?.active) return <>{children}</>
  return (
    <section className="relative my-6 min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none scale-[1.03] opacity-100 blur-[5px] saturate-125"
      >
        <TeamMapPreview />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-blue-300/30 bg-slate-950/80 p-7 text-center shadow-[0_30px_90px_-20px_rgba(59,130,246,0.45)] backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            Your league, unlocked
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {!data && !error ? 'Loading your teams…' : `Activate ${leagueName ?? 'this team'}`}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Your first team is free, scouting and planning included.
          </p>
          <ul className="mt-5 grid gap-2 text-left text-sm text-slate-200">
            {PERKS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <Icon className="h-4 w-4 text-blue-300" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
          {error && (
            <p className="mt-4 text-amber-300" role="alert">
              {error.message}
            </p>
          )}
          {data && (
            <div className="mt-6 space-y-3">
              <button
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-40"
                onClick={activate}
              >
                {busy ? 'Connecting…' : 'Activate & open team'}
              </button>
              <Link
                href={`/billing?leagueId=${encodeURIComponent(leagueId)}#teams`}
                className="block text-xs text-slate-400 hover:text-white"
              >
                Manage team slots
              </Link>
            </div>
          )}
          {notice && (
            <p role="status" className="mt-4 text-sm text-blue-300">
              {notice}
            </p>
          )}
          <p className="mt-5 text-[11px] text-slate-500">Never charged automatically.</p>
        </div>
      </div>
    </section>
  )
}
