'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { useRefreshAll } from '@/lib/use-refresh-all'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from './ui/Badge'
import { LEAGUE_SECTIONS, withLeagueId } from './navigation'
import type { LeagueSection, TeamData } from './types'

/** One dashboard surface; section components supply its content. */
export function DashboardLayout({
  children,
  activeSection,
  onSectionChange,
  team,
  currentWeek,
  isDynasty,
  leagueId,
}: {
  children: ReactNode
  activeSection: LeagueSection
  onSectionChange: (section: LeagueSection) => void
  team: TeamData | null
  currentWeek: number
  isDynasty: boolean
  leagueId: string
}) {
  const desktopBuilder = useDesktopBuilder()
  const { refresh, refreshing } = useRefreshAll()
  return (
    <section
      aria-label="League dashboard"
      className={`mx-auto w-full min-w-0 bg-slate-900 py-6 font-sans ${activeSection === 'builder' ? 'max-w-none px-2 sm:px-3' : 'max-w-[1440px] px-4 sm:px-8'}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div className="flex min-w-0 basis-full items-center gap-3 sm:basis-auto sm:flex-1">
          {team && (
            <UserAvatar
              avatarId={team.ownerAvatar}
              displayName={team.ownerName}
              username={team.ownerUsername}
              size={64}
              className="shrink-0 rounded-full ring-2 ring-blue-300/40"
            />
          )}
          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-400">
              Week {currentWeek} · {isDynasty ? 'Dynasty' : 'Redraft'}
            </p>
            <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {team?.teamName ?? 'League dashboard'}
            </h1>
            {team && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Badge
                  tone={
                    team.wins > team.losses ? 'good' : team.losses > team.wins ? 'bad' : 'neutral'
                  }
                >
                  {team.wins}–{team.losses}
                  {team.ties ? `–${team.ties}` : ''}
                </Badge>
                <span>{team.players.length} players</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-blue-300">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            title="Clear cached stats, values and photos, then reload everything"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
          {isDynasty && (
            <>
              <Link href={withLeagueId('/scouting-portal', leagueId)} className="hover:text-white">
                College scouting
              </Link>
              <Link
                href={withLeagueId('/scouting-portal?tab=draftboard', leagueId)}
                className="hover:text-white"
              >
                Draft board
              </Link>
            </>
          )}
        </div>
      </header>
      <nav
        aria-label="League sections"
        className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1"
      >
        {LEAGUE_SECTIONS.filter(({ id }) => id !== 'builder' || desktopBuilder).map(
          ({ id, label }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === id ? 'bg-blue-400/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          )
        )}
      </nav>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
