import { ClipboardList, Eye, Target, Trophy, Users, type LucideIcon } from 'lucide-react'
import type { LeagueSection } from './types'

export interface LeagueSectionNavItem {
  id: LeagueSection
  label: string
  /** Condensed label for the mobile tab strip. */
  shortLabel: string
  icon: LucideIcon
}

/** Single source of truth for the section tabs — the sidebar and mobile strip both read it. */
export const LEAGUE_SECTIONS: LeagueSectionNavItem[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Target },
  { id: 'roster', label: 'My Team', shortLabel: 'Team', icon: Users },
  { id: 'league', label: 'League', shortLabel: 'League', icon: Trophy },
  { id: 'audit', label: 'Audit', shortLabel: 'Audit', icon: ClipboardList },
]

export interface LeagueQuickLink {
  key: string
  label: string
  icon: LucideIcon
  href: string
}

/** Cross-app destinations; `href` is resolved against the active league where relevant. */
export const LEAGUE_QUICK_LINKS: LeagueQuickLink[] = [
  { key: 'trade-market', label: 'Trade Market', icon: Trophy, href: '/trade-market' },
  { key: 'scouting', label: 'Scouting Portal', icon: Eye, href: '/scouting-portal' },
  { key: 'draft-buddy', label: 'Draft Buddy', icon: Users, href: '/draft-buddy' },
]
