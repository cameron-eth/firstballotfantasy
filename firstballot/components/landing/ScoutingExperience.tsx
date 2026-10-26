'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ProspectTradingCard, type CardProspect } from './ProspectTradingCard'

type Player = CardProspect

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
  const [active, setActive] = useState(0)
  const featured = ['Jeremiah Smith', 'Arch Manning', 'Cam Coleman']
    .map(name => players.find(player => player.name === name && player.draft_year === 2027))
    .filter((player): player is Player => Boolean(player?.headshot_url))
  const selected = featured[active] ?? featured[0]

  return <>
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_30%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(ellipse_at_0%_90%,rgba(16,185,129,0.1),transparent_45%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] bg-[linear-gradient(to_right,#93c5fd_1px,transparent_1px),linear-gradient(to_bottom,#93c5fd_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[760px] lg:grid-cols-[0.95fr_1.05fr]">
        <ScrollReveal>
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> The future is already playing</p>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[clamp(3.5rem,6.4vw,6.2rem)] font-bold leading-[0.97] tracking-[-0.055em]">Your next<br />dynasty starts<br /><span className="text-blue-300">on Saturday.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">Saturday’s breakout. Your next cornerstone. Follow college talent, shape your draft board, and build a dynasty that stays ahead.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/scouting-portal" className="group inline-flex min-h-12 items-center gap-3 rounded-lg bg-blue-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300">Find your next player <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/league-buddy" className="inline-flex min-h-12 items-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-semibold transition hover:border-blue-300">Connect your league</Link>
          </div>
          <a href="#team-map" className="mt-10 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">See your team on the map <ArrowDown className="h-3 w-3" /></a>
        </ScrollReveal>
        <div className="relative min-w-0">
          <div className="relative mx-auto h-[440px] max-w-[560px] sm:h-[540px]" style={{ perspective: 1200 }}>
            <div aria-hidden="true" className="absolute inset-8 rounded-full bg-red-500/10 blur-[80px]" />
            {featured.length > 1 && <div aria-hidden="true" className="pointer-events-none absolute left-0 top-12 hidden w-[56%] -rotate-[12deg] opacity-60 sm:block"><ProspectTradingCard player={featured[(active + 1) % featured.length]} /></div>}
            {featured.length > 2 && <div aria-hidden="true" className="pointer-events-none absolute right-0 top-14 hidden w-[56%] rotate-[12deg] opacity-60 sm:block"><ProspectTradingCard player={featured[(active + 2) % featured.length]} /></div>}
            <div className="absolute left-1/2 top-3 z-10 w-[min(86%,330px)] -translate-x-1/2 sm:top-0 sm:w-[72%] sm:max-w-[390px]">
              <AnimatePresence mode="wait" initial={false}>{selected ? <motion.div key={selected.id} initial={reduced ? false : { opacity: 0, y: 20, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -12 }} transition={{ duration: 0.3 }}><Link href="/scouting-portal?year=2027" aria-label={`Scout ${selected.name}`} className="block rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"><ProspectTradingCard player={selected} priority /></Link></motion.div> : <div className="aspect-[3/4] rounded-[20px] border border-white/10 bg-white/5 p-8 text-slate-400">Loading the next generation…</div>}</AnimatePresence>
            </div>
          </div>
          <div className="relative z-20 flex flex-wrap justify-center gap-2" aria-label="Featured prospects">{featured.map((player, index) => <button key={player.id} onClick={() => setActive(index)} aria-pressed={active === index} className={`rounded-full border px-3 py-2 text-xs transition ${active === index ? 'border-white/40 bg-white/10 text-white' : 'border-transparent text-slate-500 hover:text-white'}`}><span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${active === index ? 'bg-emerald-300' : 'bg-slate-600'}`} />{player.name}</button>)}</div>
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-slate-500">Real players. Your next cornerstone.</p>
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
        <figure className="mt-10 overflow-hidden rounded-2xl border border-blue-300/20 bg-[#0b1224] shadow-[0_24px_100px_-30px_rgba(59,130,246,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3 text-xs text-slate-400"><span className="font-semibold text-white">A plan you can see.</span><span>Actual Team Builder capture</span></div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Team map preview; scroll horizontally to explore the lineup"><Image src="/images/product/team-map-lineup.png" alt="Team Builder map showing nine starting lineup slots, position-colored player cards, fantasy points per game, KTC values and trade-target actions." width={968} height={235} sizes="(max-width: 1200px) 100vw, 1152px" className="h-auto w-full min-w-[760px] sm:min-w-0" /></div>
          <figcaption className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-slate-400">Example roster snapshot. Player values and stats shown are from the capture; your connected team uses available current data.</figcaption>
        </figure>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            ['01', 'Start with your team', 'Connect Sleeper and see your lineup, depth and draft capital together.'],
            ['02', 'Explore the next chapter', 'Move through future seasons and place prospects into your roster plan.'],
            ['03', 'Find your next move', 'Explore trade ideas and the picks you would need. Review every offer before sending.'],
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
