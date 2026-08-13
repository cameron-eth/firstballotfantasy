'use client'

import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, Target, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { UserAvatar } from '@/components/user-avatar'
import { useRouter } from 'next/navigation'
import { leagueCache } from '@/lib/league-cache'
import { LEAGUE_QUICK_LINKS, LEAGUE_SECTIONS } from './navigation'
import type { LeagueOverview, LeagueSection, TeamData } from './types'

const GRADE_COLORS: Record<string, string> = {
  S: 'text-purple-400 border-purple-400',
  'A+': 'text-green-400 border-green-400',
  A: 'text-green-400 border-green-400',
  'A-': 'text-green-500 border-green-500',
  'B+': 'text-blue-400 border-blue-400',
  B: 'text-blue-400 border-blue-400',
  'B-': 'text-blue-500 border-blue-500',
  'C+': 'text-yellow-400 border-yellow-400',
  C: 'text-yellow-400 border-yellow-400',
  'C-': 'text-yellow-500 border-yellow-500',
  'D+': 'text-orange-400 border-orange-400',
  D: 'text-orange-400 border-orange-400',
  'D-': 'text-red-400 border-red-400',
  F: 'text-red-500 border-red-500',
}

const MENU_BUTTON_BASE =
  'font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm !border'
const MENU_BUTTON_ACTIVE = '!bg-yellow-400/15 !text-yellow-400 !border-yellow-400/40 !shadow-sm'
const MENU_BUTTON_IDLE =
  '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border-transparent hover:!border-slate-600/50'
const QUICK_ACTION_CLASS =
  '!bg-gradient-to-r !from-slate-700 !to-slate-700/80 hover:!from-slate-600 hover:!to-slate-600/80 !text-yellow-400 font-mono !text-sm !border !border-slate-600/50 hover:!border-yellow-400/50 transition-all duration-200 !shadow-sm hover:!shadow-md !rounded-lg !px-4 !py-3 !font-medium'

const HOVER_MOTION = {
  whileHover: { scale: 1.015, x: 2 },
  whileTap: { scale: 0.985 },
  transition: { type: 'spring' as const, stiffness: 500, damping: 25, mass: 0.5 },
}

interface SidebarSectionProps {
  title: string
  icon: typeof Target
  children: React.ReactNode
}

function SidebarSection({ title, icon: Icon, children }: SidebarSectionProps) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup className="!bg-transparent px-3 py-2">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="!text-yellow-400 font-mono text-[10px] uppercase tracking-widest hover:!bg-slate-700/30 cursor-pointer flex items-center justify-between w-full transition-all duration-200 !px-3 !py-2.5 rounded-lg font-bold">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              {title}
            </div>
            <ChevronDown className="h-3.5 w-3.5 group-data-[state=closed]/collapsible:-rotate-90 transition-transform duration-200 ease-out" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

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
  const router = useRouter()

  const goTo = (href: string) => {
    // Preserve league context across tools that accept a leagueId.
    const leagueId = leagueCache.getLeagueId()
    router.push(leagueId ? `${href}?leagueId=${leagueId}` : href)
  }

  return (
    <Sidebar
      collapsible="none"
      className="hidden md:flex !bg-gradient-to-b !from-slate-800 !to-slate-900 !border-slate-700/50"
    >
      {/* Team Info Header */}
      <SidebarHeader className="p-5 border-b border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {selectedTeam && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30"
            >
              <div className="flex items-start space-x-3 mb-3">
                <UserAvatar
                  avatarId={selectedTeam.ownerAvatar}
                  displayName={selectedTeam.ownerName}
                  username={selectedTeam.ownerUsername}
                  size={48}
                  className="ring-2 ring-yellow-400/40 shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-yellow-400 font-mono truncate mb-1.5 leading-tight">
                    {selectedTeam.teamName}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="!bg-slate-600/50 !border-slate-500 !text-slate-300 text-[10px] font-mono px-2 py-0.5"
                    >
                      RANK #{sortedTeams.findIndex((t) => t.rosterId === selectedTeam.rosterId) + 1}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 ${GRADE_COLORS[selectedTeam.grade] ?? 'text-slate-300 border-slate-500'}`}
                    >
                      GRADE {selectedTeam.grade}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-600/30">
                <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">
                  Record
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {selectedTeam.wins}-{selectedTeam.losses}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarHeader>

      <SidebarContent className="!bg-transparent">
        <SidebarSection title="Navigation" icon={Target}>
          {LEAGUE_SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <SidebarMenuItem key={section.id}>
                <motion.div {...HOVER_MOTION}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(section.id)}
                    isActive={isActive}
                    className={`${MENU_BUTTON_BASE} ${isActive ? MENU_BUTTON_ACTIVE : MENU_BUTTON_IDLE}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{section.label}</span>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            )
          })}
        </SidebarSection>

        <SidebarSeparator className="!bg-slate-700/30 !mx-3" />

        <SidebarSection title="Quick Actions" icon={Zap}>
          {LEAGUE_QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <SidebarMenuItem key={link.key}>
                <motion.div {...HOVER_MOTION}>
                  <SidebarMenuButton onClick={() => goTo(link.href)} className={QUICK_ACTION_CLASS}>
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            )
          })}
        </SidebarSection>
      </SidebarContent>

      {/* Footer - League Info */}
      <SidebarFooter className="p-4 border-t border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
        {leagueOverview && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-600/30">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-semibold">
                League Stats
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Week:</span>
                <span className="text-yellow-400 font-mono font-bold text-sm">{currentWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Teams:</span>
                <span className="text-yellow-400 font-mono font-bold text-sm">
                  {sortedTeams.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
