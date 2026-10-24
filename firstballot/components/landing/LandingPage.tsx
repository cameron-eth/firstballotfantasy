'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, BookOpen, ClipboardList, RefreshCw, Shield, Users } from 'lucide-react'

type Prospect = {
  id: number
  name: string
  position: string
  school: string
  draft_year: number | null
  overall_grade: number | null
  overall_rank?: number
  grade_tier: string | null
  draft_projection_score: number | null
  college_production_score: number | null
}

type ProspectSnapshot = { prospects: Prospect[]; fetchedAt: string }

async function loadProspects(): Promise<ProspectSnapshot> {
  const response = await fetch('/api/prospects?draft_year=all')
  if (!response.ok) throw new Error('Prospects are unavailable right now')
  return { prospects: await response.json(), fetchedAt: new Date().toISOString() }
}

const paths = [
  { href: '/scouting-portal', title: 'Scout prospects', detail: 'Explore college production, player grades, comps and draft projections.', icon: BookOpen, action: 'Open scouting' },
  { href: '/scouting-portal?tab=draftboard', title: 'Build your board', detail: 'Rank the next classes and save your own draft order.', icon: ClipboardList, action: 'Open draft board' },
  { href: '/league-buddy?tab=roster', title: 'Manage your team', detail: 'See roster strengths, positional needs and lineup decisions.', icon: Shield, action: 'View my team' },
  { href: '/league-buddy', title: 'Run your league', detail: 'Track standings, matchups, activity and playoff outlook.', icon: Users, action: 'View league' },
]

export function LandingPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/prospects?draft_year=all', loadProspects, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  const prospects = data?.prospects ?? []
  const currentYear = new Date().getFullYear()
  const upcoming = prospects
    .filter((player) => (player.draft_year ?? 0) >= currentYear && player.overall_grade != null)
    .sort((a, b) => (a.draft_year ?? 0) - (b.draft_year ?? 0) || (a.overall_rank ?? 999) - (b.overall_rank ?? 999))
    .slice(0, 6)
  const years = [...new Set(prospects.map((player) => player.draft_year).filter((year): year is number => year !== null && year >= currentYear))].sort()

  return (
    <main className="min-h-screen bg-[#090f1a] text-slate-100 pb-24 md:pb-12">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_75%_10%,rgba(37,99,235,0.19),transparent_55%)]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> College scouting & dynasty management
          </div>
          <h1 className="max-w-4xl font-[family-name:var(--font-space-grotesk)] text-5xl font-bold tracking-tight sm:text-7xl">
            Know the next class.<br /><span className="text-blue-400">Build the next winner.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Grade college prospects, compare draft classes, and turn scouting into better decisions for your team and league.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/scouting-portal" className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-5 py-3 font-semibold text-slate-950 hover:bg-blue-300">
              Start scouting <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/league-buddy" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 font-semibold text-slate-100 hover:border-blue-400">
              Open my league
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>{prospects.length ? `${prospects.length} prospect profiles` : 'Prospect data'}</span>
            <span aria-hidden="true">·</span>
            <span>{years.length ? `Upcoming classes: ${years.join(', ')}` : 'Upcoming class data pending'}</span>
            <span aria-hidden="true">·</span>
            <span>{data ? `Checked ${new Date(data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Checking data'}</span>
            <button onClick={() => void mutate()} disabled={isValidating} className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 disabled:opacity-50" aria-label="Refresh prospect data">
              <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Your workflow</p>
          <h2 className="mt-2 text-3xl font-bold">From the scouting room to your roster</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paths.map(({ href, title, detail, icon: Icon, action }, index) => (
            <Link key={href} href={href} className="group flex min-h-60 flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-blue-400/50 hover:bg-slate-800/80">
              <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-blue-400" /><span className="font-mono text-xs text-slate-500">0{index + 1}</span></div>
              <h3 className="mt-8 text-xl font-bold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{detail}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-300 group-hover:gap-2">{action} <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">College projection</p><h2 className="mt-2 text-3xl font-bold">Upcoming prospects</h2></div>
          <Link href="/scouting-portal" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Explore all prospects <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">Prospect data could not be loaded. Try Refresh.</p>}
        {isLoading && <p className="rounded-xl border border-white/10 p-5 text-slate-400">Loading prospect profiles…</p>}
        {!isLoading && !error && upcoming.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-slate-400">No upcoming class profiles are available yet.</p>}
        {upcoming.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((player) => <Link href="/scouting-portal" key={player.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-5 hover:border-blue-400/50">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400"><span>{player.draft_year} class · {player.position}</span><span>#{player.overall_rank ?? '—'}</span></div>
            <h3 className="mt-4 text-xl font-bold">{player.name}</h3><p className="mt-1 text-sm text-slate-400">{player.school}</p>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-400">Scouting grade</span><strong className="text-blue-300">{player.overall_grade?.toFixed(1) ?? '—'}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">College production</span><strong>{player.college_production_score?.toFixed(1) ?? '—'}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Draft projection</span><strong>{player.draft_projection_score?.toFixed(1) ?? '—'}</strong></div>
            </div>
          </Link>)}
        </div>}
        <p className="mt-4 text-xs text-slate-500">Grades and projections are model estimates. “Checked” shows when this page requested the database snapshot, not when the underlying source was updated.</p>
      </section>
    </main>
  )
}
