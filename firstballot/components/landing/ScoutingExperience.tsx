'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, Activity, Target } from 'lucide-react'
import type { ReactNode } from 'react'

type Player = { id: number; name: string; position: string; draft_year: number | null; overall_grade: number | null; college_production_score: number | null; draft_projection_score: number | null }

export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return <motion.div initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6 }} className={className}>{children}</motion.div>
}

export function ScoutingExperience({ players }: { players: Player[] }) {
  const reduced = useReducedMotion()
  const years = [2027, 2028, 2029]
  const classes = years.map((year) => {
    const cohort = players.filter((player) => player.draft_year === year)
    return { year, total: cohort.length, positions: ['QB', 'RB', 'WR', 'TE'].map((position) => ({ position, count: cohort.filter((player) => player.position === position).length })) }
  })
  const maximum = Math.max(1, ...classes.map((cohort) => cohort.total))
  const leader = players.filter((player) => player.draft_year === 2027 && player.overall_grade !== null).sort((a, b) => (b.overall_grade ?? 0) - (a.overall_grade ?? 0))[0]
  const metrics = leader ? [
    { label: 'Scouting grade', value: leader.overall_grade },
    { label: 'College production', value: leader.college_production_score },
    { label: 'Draft projection', value: leader.draft_projection_score },
  ] : []

  return <>
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_30%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(ellipse_at_0%_90%,rgba(16,185,129,0.1),transparent_45%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] bg-[linear-gradient(to_right,#93c5fd_1px,transparent_1px),linear-gradient(to_bottom,#93c5fd_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:min-h-[720px] lg:grid-cols-[1.1fr_1fr]">
        <ScrollReveal>
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> The future is already playing</p>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[clamp(3.25rem,7vw,6.5rem)] font-bold leading-[0.97] tracking-[-0.055em]">See them first.<br /><span className="bg-gradient-to-r from-blue-300 via-blue-400 to-emerald-300 bg-clip-text text-transparent">Build what’s next.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">Saturday’s breakout. Your next cornerstone. Follow college talent, shape your draft board, and build a dynasty that stays ahead.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/scouting-portal" className="group inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300">Find your next player <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/league-buddy" className="inline-flex min-h-12 items-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-semibold transition hover:border-blue-300">Connect your league</Link>
          </div>
          <a href="#class-outlook" className="mt-10 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">Step inside the scouting room <ArrowDown className="h-3 w-3" /></a>
        </ScrollReveal>
        <motion.div initial={reduced ? false : { opacity: 0, y: 36, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative">
          <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-blue-200/20 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="flex items-center gap-2 text-xs font-semibold text-blue-200"><Activity className="h-4 w-4" /> SCOUTING ROOM</span><span className="text-[10px] uppercase tracking-widest text-slate-500">2027 → 2029</span></div>
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-slate-400">Highest graded · 2027 class</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{leader?.name ?? 'Your next conviction'}</h2></div><Target className="mt-2 h-6 w-6 shrink-0 text-emerald-400" /></div>
              <div className="mt-8 space-y-5">{metrics.length ? metrics.map(({ label, value }) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-mono text-blue-200">{value === null ? 'Not graded' : value.toFixed(1)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} transition={{ duration: reduced ? 0 : 1.2, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-300" /></div></div>) : <p className="py-8 text-sm text-slate-400">Explore the college grades behind your next draft decision.</p>}</div>
              <p className="mt-6 text-[11px] text-slate-500">Model scores · 0–100 scale · latest available catalog</p>
            </div>
            <div className="grid grid-cols-3 border-t border-white/10 bg-white/[0.025]">{classes.map(({ year, total }) => <Link key={year} href={`/scouting-portal?year=${year}`} className="border-r border-white/10 px-4 py-5 last:border-0 hover:bg-blue-400/10"><p className="text-[10px] uppercase tracking-wider text-slate-500">{year} class</p><p className="mt-1 text-2xl font-semibold tabular-nums text-white">{total || '—'}</p><p className="text-[10px] text-slate-400">prospects</p></Link>)}</div>
          </div>
          <div className="ml-auto mt-4 flex w-fit items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> College talent. Dynasty context. Your conviction.</div>
        </motion.div>
      </div>
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
