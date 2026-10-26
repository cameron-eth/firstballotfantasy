import { ArrowRight, CalendarDays, CircleDollarSign } from 'lucide-react'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'

const lineup = [
  { slot: 'QB1', position: 'QB', name: 'Jayden Daniels', team: 'WAS', ppg: '22.4', ktc: '7,412', color: 'blue' },
  { slot: 'RB1', position: 'RB', name: 'James Cook III', team: 'BUF', ppg: '16.8', ktc: '5,986', color: 'green' },
  { slot: 'RB2', position: 'RB', name: 'Kenneth Walker III', team: 'KC', ppg: '14.2', ktc: '5,221', color: 'green' },
  { slot: 'WR1', position: 'WR', name: 'CeeDee Lamb', team: 'DAL', ppg: '19.7', ktc: '8,701', color: 'amber' },
  { slot: 'WR2', position: 'WR', name: 'Chris Olave', team: 'NO', ppg: '16.1', ktc: '5,804', color: 'amber' },
  { slot: 'WR3', position: 'WR', name: 'Parker Washington', team: 'JAX', ppg: '11.4', ktc: '2,132', color: 'amber' },
  { slot: 'TE1', position: 'TE', name: 'Colston Loveland', team: 'CHI', ppg: '9.3', ktc: '4,102', color: 'purple' },
]

const accents: Record<string, string> = {
  blue: 'border-blue-400/30 text-blue-200',
  green: 'border-emerald-400/30 text-emerald-200',
  amber: 'border-amber-300/30 text-amber-200',
  purple: 'border-violet-400/30 text-violet-200',
}

export function TeamMapPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-300/25 bg-[#080e1c] p-4 shadow-[0_24px_100px_-30px_rgba(59,130,246,0.36)] ring-1 ring-white/5 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">Team Builder · example view</p>
          <p className="mt-1 text-sm font-semibold text-white">Shape a roster across seasons</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-slate-950/70 p-1 text-[10px] text-slate-400">
          <span className="rounded-md bg-blue-400/15 px-2.5 py-1.5 text-blue-200">Now</span>
          <span className="px-2.5 py-1.5">2027</span>
          <span className="px-2.5 py-1.5">2028</span>
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {lineup.map((player) => (
          <div key={player.slot} className="min-w-0">
            <div className={`mb-2 flex items-center justify-between rounded-lg border bg-slate-900/90 px-2.5 py-2 ${accents[player.color]}`}>
              <span className="text-xs font-bold">{player.slot}</span>
              <span className="text-[10px] opacity-70">{player.position}</span>
            </div>
            <PlayerTradingCard
              name={player.name}
              position={player.position}
              team={player.team}
              label={`${player.ppg} FPPG`}
              imageHeight="h-24 sm:h-28"
              compact
            >
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="inline-flex items-center gap-1 text-slate-400"><CircleDollarSign className="h-3 w-3" /> KTC</span>
                <span className="font-semibold tabular-nums text-white">{player.ktc}</span>
              </div>
            </PlayerTradingCard>
          </div>
        ))}
      </div>
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-blue-300" /> Add future rookies to see where they fit</span>
        <span className="inline-flex items-center gap-1 text-blue-200">Compare picks & trade ideas <ArrowRight className="h-3 w-3" /></span>
      </div>
    </div>
  )
}
