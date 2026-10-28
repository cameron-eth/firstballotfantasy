import { Eye, Target, Trophy, Users, type LucideIcon } from 'lucide-react'
import type { LeagueSection } from './types'

export interface LeagueSectionNavItem {
  id: LeagueSection
  label: string
  /** Condensed label for the mobile tab strip. */
  shortLabel: string
  icon: LucideIcon
}

/** Single source of truth for the section tabs — the shared dashboard navigation reads it. */
export const LEAGUE_SECTIONS: LeagueSectionNavItem[] = [
  { id: 'builder', label: 'Team Builder', shortLabel: 'Builder', icon: Users },
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Target },
  { id: 'roster', label: 'My Team', shortLabel: 'Team', icon: Users },
  { id: 'league', label: 'Standings', shortLabel: 'Standings', icon: Trophy },
]

export function resolveLeagueSection(tab: string | null, desktopBuilder = true): LeagueSection {
  if (tab === 'overview' || tab === 'builder' || tab === 'roster' || tab === 'league') return tab
  if (tab === 'matchup') return 'league'
  return desktopBuilder ? 'builder' : 'overview'
}

export function withLeagueId(href: string, leagueId: string | null): string {
  if (!leagueId) return href
  const [path, query] = href.split('?')
  const params = new URLSearchParams(query || '')
  params.set('leagueId', leagueId)
  return `${path}?${params.toString()}`
}

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
  {
    key: 'draft-board',
    label: 'Draft Board',
    icon: Users,
    href: '/scouting-portal?tab=draftboard',
  },
]
