'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { UserAvatar } from '@/components/user-avatar'
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
              size={44}
              className="shrink-0 rounded-full"
            />
          )}
          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-400">
              Week {currentWeek} · {isDynasty ? 'Dynasty' : 'Redraft'}
            </p>
            <h1 className="break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {team?.teamName ?? 'League dashboard'}
            </h1>
            {team && (
              <p className="mt-1 text-xs text-slate-400">
                {team.wins}–{team.losses}
                {team.ties ? `–${team.ties}` : ''} · {team.players.length} players
              </p>
            )}
          </div>
        </div>
        {isDynasty && (
          <div className="flex flex-wrap gap-4 text-sm font-medium text-blue-300">
            <Link href={withLeagueId('/scouting-portal', leagueId)} className="hover:text-white">
              College scouting
            </Link>
            <Link
              href={withLeagueId('/scouting-portal?tab=draftboard', leagueId)}
              className="hover:text-white"
            >
              Draft board
            </Link>
          </div>
        )}
      </header>
      <nav
        aria-label="League sections"
        className="mb-6 flex overflow-x-auto border-b border-white/10"
      >
        {LEAGUE_SECTIONS.filter(({ id }) => id !== 'builder' || desktopBuilder).map(
          ({ id, label }) => (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors first:pl-0 ${activeSection === id ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
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
