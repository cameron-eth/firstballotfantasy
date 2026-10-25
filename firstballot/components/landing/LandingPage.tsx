'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, BookOpen, ClipboardList, Shield, Users } from 'lucide-react'
import { CommunityRankingPrompt } from './CommunityRankingPrompt'
import { ScoutingExperience, ScrollReveal } from './ScoutingExperience'
import { ProspectTradingCard } from './ProspectTradingCard'

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
  updated_at?: string | null
  headshot_url?: string | null
  source_url?: string
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

const watchlistOrder = ['Jesse Legree', 'Chris Henry Jr.', 'Legend Bey', 'Mark Bowman']

export function LandingPage() {
  const { data, error, isLoading } = useSWR('/api/prospects?draft_year=all', loadProspects, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  const prospects = data?.prospects ?? []
  const currentYear = new Date().getFullYear()
  const watchlist = watchlistOrder
    .map((name) => prospects.find((player) => player.draft_year === 2029 && player.name === name))
    .filter((player): player is Prospect => Boolean(player))
  const upcoming = prospects
    .filter((player) => (player.draft_year ?? 0) >= Math.max(2027, currentYear + 1) && player.draft_year !== 2029 && player.overall_grade != null)
    .sort((a, b) => (a.draft_year ?? 0) - (b.draft_year ?? 0) || (a.overall_rank ?? 999) - (b.overall_rank ?? 999))
    .slice(0, 6)


  return (
    <main className="min-h-screen bg-[#090f1a] text-slate-100 pb-24 md:pb-12">
      <ScoutingExperience players={prospects} />

      <ScrollReveal><CommunityRankingPrompt /></ScrollReveal>

      <ScrollReveal>{watchlist.length > 0 && <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8" aria-labelledby="watchlist-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">2029 class watchlist</p><h2 id="watchlist-heading" className="mt-2 text-3xl font-bold">Meet the next wave</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Verified 2026 freshmen with projected 2029 draft eligibility. Track their college careers and put your own convictions on the board.</p></div>
          <Link href="/scouting-portal?year=2029" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Scout the 2029 class <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {watchlist.map((player) => <Link href="/scouting-portal?year=2029" key={player.id} aria-label={`Scout ${player.name}`} className="block rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300" style={{ perspective: 1000 }}><ProspectTradingCard player={player} /></Link>)}
        </div>
      </section>}</ScrollReveal>

      <ScrollReveal><section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
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
      </section></ScrollReveal>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">College projection</p><h2 className="mt-2 text-3xl font-bold">Upcoming prospects</h2></div>
          <Link href="/scouting-portal" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Explore all prospects <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">Prospect data could not be loaded. Please reload the page to try again.</p>}
        {isLoading && <p className="rounded-xl border border-white/10 p-5 text-slate-400">Loading prospect profiles…</p>}
        {!isLoading && !error && upcoming.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-slate-400">No upcoming class profiles are available yet.</p>}
        {upcoming.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((player) => <ScrollReveal key={player.id}><Link href={`/scouting-portal?year=${player.draft_year}`} aria-label={`Scout ${player.name}`} className="block rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300" style={{ perspective: 1000 }}><ProspectTradingCard player={player} /></Link></ScrollReveal>)}
        </div>}
        <p className="mt-4 text-xs text-slate-500">Grades and projections are model estimates based on the latest available catalog. Class eligibility is projected; ungraded players remain on the watchlist.</p>
      </section>
    </main>
  )
}
