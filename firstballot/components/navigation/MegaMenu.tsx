'use client'

import { useLeagueFormat } from '@/hooks/use-league-format'

import { usePathname } from 'next/navigation'
import { Trophy, BarChart3, LayoutDashboard, Users, Search, History } from 'lucide-react'
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
          name: 'Team Builder',
          href: '/league-buddy',
          description: 'Map your roster and future plans',
          icon: LayoutDashboard,
          requiresAuth: true,
        },
        {
          name: 'Standings',
          href: '/league-buddy?tab=league',
          description: 'Standings, MaxPF race and playoff odds',
          icon: Trophy,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'RANKINGS',
      items: [
        {
          name: 'Community Rankings',
          href: '/community-rankings',
          description: 'Pick players and shape the crowd board',
          icon: Users,
        },
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
