'use client'

import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTooltip } from '@/components/ui/app-tooltip'
import { useRefreshAll } from '@/lib/use-refresh-all'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { UserAvatar } from '@/components/user-avatar'
import { Badge } from './ui/Badge'
import { LEAGUE_SECTIONS } from './navigation'
import type { LeagueSection, TeamData } from './types'

/** One dashboard surface; section components supply its content. */
export function DashboardLayout({
  children,
  activeSection,
  onSectionChange,
  team,
  currentWeek,
  isDynasty,
  meta,
  aside,
}: {
  children: ReactNode
  activeSection: LeagueSection
  onSectionChange: (section: LeagueSection) => void
  team: TeamData | null
  currentWeek: number
  isDynasty: boolean
  /** Compact secondary facts after the record, e.g. league standing and core age. */
  meta?: ReactNode
  /** Right side of the header, e.g. the draft capital summary. */
  aside?: ReactNode
}) {
  const desktopBuilder = useDesktopBuilder()
  const { refresh, refreshing } = useRefreshAll()
  return (
    <section
      aria-label="League dashboard"
      className={`mx-auto w-full min-w-0 bg-slate-900 py-6 font-sans ${activeSection === 'builder' ? 'max-w-none px-2 sm:px-3' : 'max-w-[1440px] px-4 sm:px-8'}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto sm:gap-4">
          {team && (
            <UserAvatar
              avatarId={team.ownerAvatar}
              displayName={team.ownerName}
              username={team.ownerUsername}
              size={64}
              className="size-12 shrink-0 rounded-full ring-2 ring-action/30 sm:size-16"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">
              Week {currentWeek} · {isDynasty ? 'Dynasty' : 'Redraft'}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {team?.teamName ?? 'League dashboard'}
            </h1>
            {team && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                <Badge
                  tone={
                    team.wins > team.losses ? 'good' : team.losses > team.wins ? 'bad' : 'neutral'
                  }
                >
                  {team.wins}–{team.losses}
                  {team.ties ? `–${team.ties}` : ''}
                </Badge>
                {meta}
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          {aside}
          <AppTooltip content="Refresh data: clears cached stats, values and photos">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh data"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-line/60 text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            </button>
          </AppTooltip>
        </div>
      </header>
      <nav
        aria-label="League sections"
        className="mb-5 flex gap-1 overflow-x-auto border-b border-line/60 scrollbar-hide"
      >
        {LEAGUE_SECTIONS.filter(
          ({ id }) => (id !== 'builder' || desktopBuilder) && (id !== 'picks' || isDynasty)
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            aria-current={activeSection === id ? 'page' : undefined}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 px-2.5 pb-3 pt-2 text-sm sm:px-3 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-action',
              // Active: action-blue text and a 2px indicator sitting on the nav's hairline.
              'after:absolute after:inset-x-2.5 after:-bottom-px sm:after:inset-x-3 after:h-0.5 after:rounded-full',
              activeSection === id
                ? 'text-blue-300 after:bg-action'
                : 'text-slate-400 after:bg-transparent hover:text-white'
            )}
          >
            <Icon className="hidden size-4 sm:block" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
