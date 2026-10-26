'use client'
import useSWR from 'swr'
import { ArrowUpRight, Layers, ScanSearch, Waypoints } from 'lucide-react'
import { ProspectTradingCard, type CardProspect } from '@/components/landing/ProspectTradingCard'
const names = ['Jeremiah Smith', 'Malachi Toney', 'Mark Bowman']
async function loadPlayers(): Promise<CardProspect[]> {
  const response = await fetch('/api/prospects?draft_year=all')
  if (!response.ok) throw new Error('Player previews unavailable')
  return response.json()
}
export function MembershipHero() {
  const { data } = useSWR('/api/prospects?draft_year=all', loadPlayers, {
    revalidateOnFocus: false,
  })
  const players = names
    .map((name) => data?.find((p) => p.name === name && p.headshot_url))
    .filter((p): p is CardProspect => !!p)
  return (
    <section className="relative grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
          First Ballot membership
        </p>
        <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
          See the future.
          <br />
          <span className="text-amber-300">Build your dynasty.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
          Find your next cornerstone. See where they fit. Turn your convictions into a plan for
          every team you manage.
        </p>
        <a
          href="#membership"
          className="mt-7 inline-flex items-center gap-3 rounded-full bg-amber-300 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-200"
        >
          Find your edge <ArrowUpRight size={18} />
        </a>
        <p className="mt-3 text-xs text-slate-400">Start with one team, free. No card required.</p>
      </div>
      <div
        className="relative min-h-64 min-w-0 py-6"
        aria-label="College prospect player card previews"
      >
        <div aria-hidden="true" className="absolute inset-8 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-xl items-center justify-center sm:-space-x-10 px-4">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`relative ${index === 1 ? 'w-[76%] sm:w-[43%]' : 'hidden sm:block sm:w-[43%]'} shrink-0 transition-transform duration-300 motion-safe:hover:-translate-y-3 ${index === 1 ? 'z-10 -translate-y-5' : index === 0 ? '-rotate-6' : 'rotate-6'}`}
            >
              <ProspectTradingCard player={player} />
            </div>
          ))}
          {!players.length && (
            <div className="flex min-h-64 items-center gap-5 text-amber-300">
              <ScanSearch size={48} />
              <Waypoints size={56} />
              <Layers size={48} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
