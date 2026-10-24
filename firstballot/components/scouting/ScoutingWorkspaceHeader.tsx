import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'

interface ScoutingWorkspaceHeaderProps {
  prospectCount: number
  boardCount: number
  loading: boolean
  leagueId: string
  rosterLoading: boolean
  rosterError: string | null
  onOpenBoard: () => void
}

export function ScoutingWorkspaceHeader({ prospectCount, boardCount, loading, leagueId, rosterLoading, rosterError, onOpenBoard }: ScoutingWorkspaceHeaderProps) {
  return (
    <section className="mb-4 rounded-2xl border border-blue-400/20 bg-gradient-to-r from-slate-800/90 via-slate-900 to-slate-950 px-4 py-4 md:px-6 md:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Scouting workspace</p>
          <h1 className="text-xl font-bold text-white md:text-2xl">Scout the class. Shape your board.</h1>
          <p className="mt-1 text-sm text-slate-400">
            {loading ? 'Loading prospects…' : `${prospectCount} prospect profiles`}
            <span className="mx-2 text-slate-600">·</span>{boardCount} on your board
            {leagueId && <><span className="mx-2 text-slate-600">·</span>{rosterLoading ? 'Loading team needs…' : rosterError ? 'Team needs unavailable' : 'Team needs connected'}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenBoard} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-300">Open my board <ArrowRight className="h-4 w-4" /></button>
          <Link href="/league-buddy?tab=roster" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-blue-400 hover:text-white"><Users className="h-4 w-4" /> My team</Link>
        </div>
      </div>
    </section>
  )
}
