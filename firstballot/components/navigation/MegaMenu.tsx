'use client'

import { useLeagueFormat } from '@/hooks/use-league-format'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Trophy, BarChart3, Target, LayoutDashboard, Users, Search, History } from 'lucide-react'
import { NavGroup } from './NavGroup'

interface MegaMenuProps {
  isLoggedIn?: boolean
}

export function MegaMenu({ isLoggedIn }: MegaMenuProps) {
  const { showScouting } = useLeagueFormat()
  const pathname = usePathname()

  const navGroups = [
    {
      label: 'SCOUTING',
      items: [
        {
          name: 'Scout Prospects',
          href: '/scouting-portal',
          description: 'College profiles, grades and projections',
          icon: Search,
        },
        {
          name: 'My Draft Board',
          href: '/scouting-portal?tab=draftboard',
          description: 'Build and save your prospect board',
          icon: Users,
        },
        {
          name: 'Historical Outcomes',
          href: '/scouting-portal?tab=historical',
          description: 'Past classes and hit rates',
          icon: History,
        },
      ],
    },
    {
      label: 'MY LEAGUE',
      items: [
        {
          name: 'My Team',
          href: '/league-buddy?tab=roster',
          description: 'Roster strengths and needs',
          icon: Users,
          requiresAuth: true,
        },
        {
          name: 'League Overview',
          href: '/league-buddy',
          description: 'Standings, teams and activity',
          icon: LayoutDashboard,
          requiresAuth: true,
        },
        {
          name: 'Matchups',
          href: '/league-buddy?tab=matchup',
          description: 'Scores and projections',
          icon: Trophy,
          requiresAuth: true,
        },
        {
          name: 'Playoff Odds',
          href: '/playoff-odds',
          description: 'Postseason outlook',
          icon: Target,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'RANKINGS',
      items: [
        {
          name: 'Dynasty Rankings',
          href: '/rankings',
          description: 'The definitive rookie & vet ranks',
          icon: BarChart3,
        },
      ],
    },
  ]

  return (
    <nav className="hidden lg:flex items-center space-x-1">
      {navGroups
        .filter((group) => showScouting || group.label !== 'SCOUTING')
        .map((group) => {
          const isGroupActive = group.items.some((item) => pathname === item.href.split('?')[0])
          return (
            <NavGroup
              key={group.label}
              label={group.label}
              items={group.items}
              isActive={isGroupActive}
              isLoggedIn={isLoggedIn}
              align={group.label === 'RANKINGS' ? 'right' : 'left'}
            />
          )
        })}
    </nav>
  )
}
