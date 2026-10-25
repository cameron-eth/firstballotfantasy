'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { UserAvatar } from '@/components/user-avatar'
import { LEAGUE_SECTIONS } from './navigation'
import { cn } from '@/lib/utils'
import type { LeagueOverview, LeagueSection, TeamData } from './types'

interface LeagueBuddySidebarProps {
  selectedTeam: TeamData | null
  sortedTeams: TeamData[]
  activeSection: LeagueSection
  setActiveSection: (section: LeagueSection) => void
  currentWeek: number
  leagueOverview: LeagueOverview | null
}

export function LeagueBuddySidebar({
  selectedTeam,
  sortedTeams,
  activeSection,
  setActiveSection,
  currentWeek,
  leagueOverview,
}: LeagueBuddySidebarProps) {
  return (
    <Sidebar collapsible="none" className="hidden border-r border-white/5 !bg-slate-950/40 md:flex">
      <SidebarHeader className="gap-3 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          League workspace
        </p>
        {selectedTeam && (
          <div className="flex items-start gap-3">
            <UserAvatar
              avatarId={selectedTeam.ownerAvatar}
              displayName={selectedTeam.ownerName}
              username={selectedTeam.ownerUsername}
              size={36}
              className="rounded-full"
            />
            <div className="min-w-0">
              <h2 className="break-words text-sm font-semibold leading-snug text-slate-100">
                {selectedTeam.teamName}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedTeam.wins}–{selectedTeam.losses} · {sortedTeams.length} teams
              </p>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-6 px-3 py-3">
        <nav aria-label="League sections" className="space-y-1">
          {LEAGUE_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                activeSection === id
                  ? 'bg-blue-400/10 text-blue-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        {leagueOverview?.isDynasty && (
          <div className="border-t border-white/5 px-3 pt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Next generation
            </p>
            {[
              { href: '/scouting-portal', label: 'College scouting' },
              { href: '/scouting-portal?tab=draftboard', label: 'Draft board' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between py-2 text-xs text-slate-400 hover:text-blue-300"
              >
                {item.label}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 px-6 py-4 text-xs text-slate-500">
        Week {currentWeek} <span className="float-right">Sleeper connected</span>
      </SidebarFooter>
    </Sidebar>
  )
}
