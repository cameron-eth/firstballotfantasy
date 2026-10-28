'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, BookOpen, ClipboardList, Shield, Users } from 'lucide-react'
import { ScoutingExperience, ScrollReveal } from './ScoutingExperience'
import { ProspectTradingCard } from './ProspectTradingCard'
import { nextDraftClass, upcomingDraftClasses } from '@/lib/draft-years'

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

async function loadProspects(): Promise<Prospect[]> {
  const response = await fetch('/api/prospects?draft_year=all')
  if (!response.ok) throw new Error('Prospects are unavailable right now')
  return response.json()
}

const paths = [
  { href: '/scouting-portal', title: 'Scout the player', detail: 'Compare college production, scouting grades, player profiles and pro projections across upcoming classes.', icon: BookOpen, action: 'Explore prospects', signal: 'COLLEGE → PRO' },
  { href: '/community-rankings', title: 'Add your voice', detail: 'Choose between two players in a quick daily matchup. Each vote helps shape the shared dynasty rankings.', icon: Users, action: 'See community rankings', signal: 'ONE PICK A DAY' },
  { href: '/scouting-portal?tab=draftboard', title: 'Make your own board', detail: 'Keep a separate draft board for each class and rank prospects in the order you believe in.', icon: ClipboardList, action: 'Build a draft board', signal: upcomingDraftClasses(3).join(' · ') },
  { href: '/league-buddy', title: 'Read your league', detail: 'See weekly lineup projections, standings, playoff odds and the MaxPF race for draft position.', icon: Shield, action: 'Open league view', signal: 'ROSTER → SEASON' },
]

const watchlistOrder = ['Jesse Legree', 'Chris Henry Jr.', 'Legend Bey', 'Mark Bowman']

export function LandingPage() {
  const { data, error, isLoading } = useSWR('/api/prospects?draft_year=all', loadProspects, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  const prospects = data ?? []
  const watchlist = watchlistOrder
    .map((name) => prospects.find((player) => player.draft_year === 2029 && player.name === name))
    .filter((player): player is Prospect => Boolean(player))
  const upcoming = prospects
    .filter((player) => (player.draft_year ?? 0) >= nextDraftClass() && player.draft_year !== 2029 && player.overall_grade != null)
    .sort((a, b) => (a.draft_year ?? 0) - (b.draft_year ?? 0) || (a.overall_rank ?? 999) - (b.overall_rank ?? 999))
    .slice(0, 6)


  return (
    <main className="min-h-screen bg-[#090f1a] text-slate-100 pb-24 md:pb-12">
      <ScoutingExperience players={prospects} />


      <ScrollReveal>{watchlist.length > 0 && <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8" aria-labelledby="watchlist-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">2029 class watchlist</p><h2 id="watchlist-heading" className="mt-2 text-3xl font-bold">Meet the next wave</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Verified 2026 freshmen with projected 2029 draft eligibility. Track their college careers and put your own convictions on the board.</p></div>
          <Link href="/scouting-portal?year=2029" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Scout the 2029 class <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {watchlist.map((player) => <Link href="/scouting-portal?year=2029" key={player.id} aria-label={`Scout ${player.name}`} className="block rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300" style={{ perspective: 1000 }}><ProspectTradingCard player={player} /></Link>)}
        </div>
      </section>}</ScrollReveal>

      <ScrollReveal><section id="feature-breakdown" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14 sm:px-8 sm:py-16">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Four connected tools</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">A clearer path from prospect to plan</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">Start with the player you like. Build your class rankings, fit them into a team timeline, then use your league’s real roster and picks to decide what comes next.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paths.map(({ href, title, detail, icon: Icon, action, signal }, index) => (
            <Link key={href} href={href} className="group flex min-h-56 flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-400/50 hover:bg-slate-800/80">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/10"><Icon className="h-5 w-5 text-blue-300" /></span><span className="font-mono text-xs text-slate-500">0{index + 1}</span></div>
              <p className="mt-5 font-mono text-[10px] font-semibold tracking-[0.16em] text-blue-300/80">{signal}</p>
              <h3 className="mt-2 text-lg font-bold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{detail}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-300 transition-all group-hover:gap-2">{action} <ArrowRight className="h-4 w-4" /></span>
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
