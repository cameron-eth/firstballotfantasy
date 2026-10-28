'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { type ReactNode } from 'react'
import type { CardProspect } from './ProspectTradingCard'
import { TeamMapPreview } from './TeamMapPreview'
import { upcomingDraftClasses } from '@/lib/draft-years'

type Player = CardProspect

export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return <motion.div initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6 }} className={className}>{children}</motion.div>
}

export function ScoutingExperience({ players }: { players: Player[] }) {
  const reduced = useReducedMotion()
  const years = upcomingDraftClasses(3)
  const classes = years.map((year) => {
    const cohort = players.filter((player) => player.draft_year === year)
    return { year, total: cohort.length, positions: ['QB', 'RB', 'WR', 'TE'].map((position) => ({ position, count: cohort.filter((player) => player.position === position).length })) }
  })
  const maximum = Math.max(1, ...classes.map((cohort) => cohort.total))
  return <>
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_30%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(ellipse_at_0%_90%,rgba(16,185,129,0.1),transparent_45%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] bg-[linear-gradient(to_right,#93c5fd_1px,transparent_1px),linear-gradient(to_bottom,#93c5fd_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-7 sm:px-8 sm:pb-14 sm:pt-10">
        <div>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> College scouting meets dynasty strategy</p>
              <h1 className="font-[family-name:var(--font-space-grotesk)] text-[clamp(2.7rem,5vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.055em]">See the player.<br /><span className="text-blue-300">Plan the team.</span></h1>
            </div>
            <div className="lg:pb-1">
              <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">Scout college prospects, shape your own rookie boards, and see how today’s roster and tomorrow’s picks fit together.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/scouting-portal" className="group inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300">Explore prospects <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/league-buddy" className="inline-flex min-h-12 items-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-semibold transition hover:border-blue-300">Connect a league</Link>
              </div>
            </div>
          </div>
        </div>
        <div>
          <figure className="mt-8">
            <TeamMapPreview />
            <figcaption className="mt-3 text-xs text-slate-500">
              Illustrative roster. Connect a league to plan yours in Team Builder on desktop.
            </figcaption>
          </figure>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/league-buddy?tab=builder" className="hidden min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 lg:inline-flex">Open Team Builder <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/scouting-portal" className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 lg:hidden">Start scouting <ArrowRight className="h-4 w-4" /></Link>
          <span className="text-xs text-slate-400">One connected team is free</span>
        </div>
      </div>
    </section>
    <section id="team-map" aria-labelledby="team-map-title" className="scroll-mt-24 border-b border-white/10 bg-slate-950/50 px-5 py-16 sm:px-8 sm:py-24">
      <ScrollReveal className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Meet your Team Builder</p>
            <h2 id="team-map-title" className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Your roster. Your picks.<br /><span className="text-blue-300">Your next three seasons.</span></h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">See who starts, who’s next, and what it takes to get there. Put future rookies into your plan and explore the trades that could make room.</p>
          </div>
          <div className="shrink-0">
            <Link href="/league-buddy?tab=builder" className="hidden min-h-12 items-center justify-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 lg:inline-flex">Build my team map <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/scouting-portal" className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 lg:hidden">Start with your prospect board <ArrowRight className="h-4 w-4" /></Link>
            <p className="mt-3 text-xs text-slate-400">One team free · Team Builder on desktop</p>
          </div>
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            ['01', 'Start with your real roster', 'Connect Sleeper to lay out your starters and backups by league lineup slot.'],
            ['02', 'Place a rookie in the right year', 'Switch to a future class and add a player from your board to see where they could join your roster.'],
            ['03', 'Work out the cost', 'Compare your draft capital with a prospect’s projected range. If the pick does not fit, review trade ideas before taking action.'],
          ].map(([number, title, description]) => <li key={number} className="border-t border-white/10 pt-4"><span className="text-xs font-semibold text-blue-300">{number}</span><h3 className="mt-2 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p></li>)}
        </ol>
      </ScrollReveal>
    </section>
    <section id="class-outlook" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
      <ScrollReveal className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Look beyond this season</p><h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Three classes.<br />A longer view.</h2><p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">Explore the talent pipeline by position. Build a separate board for each class and find the players who fit the team you want to become.</p><Link href="/scouting-portal?tab=draftboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">Build your future board <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">The college talent pipeline</h3><span className="text-xs text-slate-500">Profiles in the catalog</span></div>
          <div className="space-y-7">{classes.map(({ year, total, positions }) => <div key={year}><div className="mb-3 flex justify-between text-sm"><span className="font-semibold">{year}</span><span className="tabular-nums text-slate-400">{total} prospects</span></div><div className="flex h-8 overflow-hidden rounded-md bg-slate-800" role="img" aria-label={`${year}: ${positions.map((entry) => `${entry.count} ${entry.position}`).join(', ')}`}>{positions.map(({ position, count }, index) => <motion.div key={position} initial={{ width: 0 }} whileInView={{ width: `${count / maximum * 100}%` }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.9, delay: index * 0.1 }} className={['bg-blue-400', 'bg-emerald-400', 'bg-indigo-400', 'bg-amber-300'][index]} title={`${position}: ${count}`} />)}</div><p className="mt-2 text-[11px] text-slate-500">{positions.map(({ position, count }) => `${position} ${count}`).join('  ·  ')}</p></div>)}</div>
          <div className="mt-7 flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">{['QB', 'RB', 'WR', 'TE'].map((position, index) => <span key={position} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-sm ${['bg-blue-400', 'bg-emerald-400', 'bg-indigo-400', 'bg-amber-300'][index]}`} />{position}</span>)}</div>
        </div>
      </ScrollReveal>
    </section>
  </>
}
