'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, Trophy, Zap, Calendar, Target, Eye, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  SidebarProvider,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { UserAvatar } from '@/components/user-avatar'
import { useRouter } from 'next/navigation'
import { leagueCache } from '@/lib/league-cache'

const GRADE_COLORS = {
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

interface LeagueBuddySidebarProps {
  selectedTeam: any
  sortedTeams: any[]
  leagues: any[]
  leagueId: string
  onLeagueChange?: (leagueId: string) => void
  activeSection: 'overview' | 'roster' | 'league'
  setActiveSection: (section: 'overview' | 'roster' | 'league') => void
  currentWeek: number
  leagueOverview: any
}

export function LeagueBuddySidebar({
  selectedTeam,
  sortedTeams,
  leagues,
  leagueId,
  onLeagueChange,
  activeSection,
  setActiveSection,
  currentWeek,
  leagueOverview,
}: LeagueBuddySidebarProps) {
  const router = useRouter()

  const handleTradeMarketClick = () => {
    // Preserve league context when navigating to trade market
    const currentLeagueId = leagueCache.getLeagueId()
    if (currentLeagueId) {
      router.push(`/trade-market?leagueId=${currentLeagueId}`)
    } else {
      router.push('/trade-market')
    }
  }
  const handleScoutingPortalClick = () => router.push('/scouting-portal')
  const handleDraftBuddyClick = () => router.push('/draft-buddy')

  return (
    <Sidebar
      collapsible="none"
      className="!bg-gradient-to-b !from-slate-800 !to-slate-900 !border-slate-700/50"
    >
      {/* Team Info Header */}
      <SidebarHeader className="p-5 border-b border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
        {/* League Switcher */}
        {leagues.length > 1 && onLeagueChange && (
          <div className="mb-5">
            <label className="text-[10px] text-yellow-400 font-mono mb-2 block uppercase tracking-widest font-semibold">
              League
            </label>
            <Select value={leagueId} onValueChange={onLeagueChange}>
              <SelectTrigger className="!bg-slate-700/50 !border-slate-600/50 !text-slate-100 hover:!bg-slate-600/50 hover:!border-yellow-400/30 !transition-all !duration-200 !h-11 !rounded-lg !shadow-sm">
                <SelectValue placeholder="Select a league" />
              </SelectTrigger>
              <SelectContent className="!bg-slate-700 !border-slate-600">
                {leagues.map((league) => (
                  <SelectItem
                    key={league.league_id}
                    value={league.league_id}
                    className={`!text-slate-200 hover:!bg-slate-600 focus:!bg-slate-600 ${
                      league.league_id === leagueId ? '!bg-yellow-400/20 !text-yellow-400' : ''
                    }`}
                  >
                    <div className="flex flex-col py-1">
                      <span
                        className={`font-semibold text-sm ${
                          league.league_id === leagueId ? 'text-yellow-400' : ''
                        }`}
                      >
                        {league.name}
                      </span>
                      <span
                        className={`text-xs ${
                          league.league_id === leagueId ? 'text-yellow-400/70' : 'text-slate-400'
                        }`}
                      >
                        {league.total_rosters} teams • {league.season}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <UserAvatar
                    avatarId={selectedTeam.ownerAvatar}
                    displayName={selectedTeam.ownerName}
                    username={selectedTeam.ownerUsername}
                    size={48}
                    className="ring-2 ring-yellow-400/40 shadow-lg"
                  />
                </motion.div>
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
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 ${GRADE_COLORS[selectedTeam.grade as keyof typeof GRADE_COLORS]}`}
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

      {/* Navigation Items */}
      <SidebarContent className="!bg-transparent">
        {/* Main Navigation Group */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup className="!bg-transparent px-3 py-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="!text-yellow-400 font-mono text-[10px] uppercase tracking-widest hover:!bg-slate-700/30 cursor-pointer flex items-center justify-between w-full transition-all duration-200 !px-3 !py-2.5 rounded-lg font-bold">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" />
                  Navigation
                </div>
                <motion.div
                  animate={{ rotate: 0 }}
                  className="group-data-[state=closed]/collapsible:-rotate-90 transition-transform duration-200 ease-out"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.15,
                  ease: 'easeOut',
                }}
              >
                <SidebarGroupContent>
                  <SidebarMenu>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={() => setActiveSection('overview')}
                            isActive={activeSection === 'overview'}
                            className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                              activeSection === 'overview'
                                ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                            }`}
                          >
                            <Target className="h-4 w-4" />
                            <span className="font-medium">Overview</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={() => setActiveSection('roster')}
                            isActive={activeSection === 'roster'}
                            className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                              activeSection === 'roster'
                                ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                            }`}
                          >
                            <Users className="h-4 w-4" />
                            <span className="font-medium">My Team</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={() => setActiveSection('league')}
                            isActive={activeSection === 'league'}
                            className={`font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm ${
                              activeSection === 'league'
                                ? '!bg-yellow-400/15 !text-yellow-400 !border !border-yellow-400/40 !shadow-sm'
                                : '!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50'
                            }`}
                          >
                            <Trophy className="h-4 w-4" />
                            <span className="font-medium">League</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={handleScoutingPortalClick}
                            className="!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50 font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">Scouting</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={handleTradeMarketClick}
                            className="!text-slate-300 !bg-slate-700/20 !hover:bg-slate-700/40 hover:!text-yellow-400 !border !border-transparent hover:!border-slate-600/50 font-mono !px-4 !py-3 !rounded-lg transition-all duration-150 !text-sm"
                          >
                            <Trophy className="h-4 w-4" />
                            <span className="font-medium">Trading</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>
                  </SidebarMenu>
                </SidebarGroupContent>
              </motion.div>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="!bg-slate-700/30 !mx-3" />

        {/* Quick Actions Group */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup className="!bg-transparent px-3 py-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="!text-yellow-400 font-mono text-[10px] uppercase tracking-widest hover:!bg-slate-700/30 cursor-pointer flex items-center justify-between w-full transition-all duration-200 !px-3 !py-2.5 rounded-lg font-bold">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Quick Actions
                </div>
                <motion.div
                  animate={{ rotate: 0 }}
                  className="group-data-[state=closed]/collapsible:-rotate-90 transition-transform duration-200 ease-out"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.15,
                  ease: 'easeOut',
                }}
              >
                <SidebarGroupContent>
                  <SidebarMenu>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={handleTradeMarketClick}
                            className="!bg-gradient-to-r !from-slate-700 !to-slate-700/80 hover:!from-slate-600 hover:!to-slate-600/80 !text-yellow-400 font-mono !text-sm !border !border-slate-600/50 hover:!border-yellow-400/50 transition-all duration-200 !shadow-sm hover:!shadow-md !rounded-lg !px-4 !py-3 !font-medium"
                          >
                            <Trophy className="h-4 w-4" />
                            <span>Trade Market</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={handleScoutingPortalClick}
                            className="!bg-gradient-to-r !from-slate-700 !to-slate-700/80 hover:!from-slate-600 hover:!to-slate-600/80 !text-yellow-400 font-mono !text-sm !border !border-slate-600/50 hover:!border-yellow-400/50 transition-all duration-200 !shadow-sm hover:!shadow-md !rounded-lg !px-4 !py-3 !font-medium"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Scouting Portal</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <SidebarMenuItem>
                        <motion.div
                          whileHover={{ scale: 1.015, x: 2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 25,
                            mass: 0.5,
                          }}
                        >
                          <SidebarMenuButton
                            onClick={handleDraftBuddyClick}
                            className="!bg-gradient-to-r !from-slate-700 !to-slate-700/80 hover:!from-slate-600 hover:!to-slate-600/80 !text-yellow-400 font-mono !text-sm !border !border-slate-600/50 hover:!border-yellow-400/50 transition-all duration-200 !shadow-sm hover:!shadow-md !rounded-lg !px-4 !py-3 !font-medium"
                          >
                            <Users className="h-4 w-4" />
                            <span>Draft Buddy</span>
                          </SidebarMenuButton>
                        </motion.div>
                      </SidebarMenuItem>
                    </motion.div>
                  </SidebarMenu>
                </SidebarGroupContent>
              </motion.div>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* Footer - League Info */}
      <SidebarFooter className="p-4 border-t border-slate-700/50 !bg-slate-800/50 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {leagueOverview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30"
            >
              <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-600/30">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-semibold">
                  League Stats
                </span>
              </div>
              <div className="space-y-2">
                <motion.div
                  className="flex items-center justify-between"
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <span className="text-xs text-slate-400 font-mono">Week:</span>
                  <span className="text-yellow-400 font-mono font-bold text-sm">{currentWeek}</span>
                </motion.div>
                <motion.div
                  className="flex items-center justify-between"
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <span className="text-xs text-slate-400 font-mono">Teams:</span>
                  <span className="text-yellow-400 font-mono font-bold text-sm">
                    {sortedTeams.length}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarFooter>
    </Sidebar>
  )
}
