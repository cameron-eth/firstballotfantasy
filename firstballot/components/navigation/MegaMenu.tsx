'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  Trophy,
  Eye,
  BarChart3,
  Target,
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Users,
  Search,
  History,
  Calculator,
  LineChart,
} from 'lucide-react'
import { NavGroup } from './NavGroup'

interface MegaMenuProps {
  isLoggedIn?: boolean
}

export function MegaMenu({ isLoggedIn }: MegaMenuProps) {
  const pathname = usePathname()

  const navGroups = [
    {
      label: 'LEAGUE',
      items: [
        {
          name: 'League Buddy',
          href: '/league-buddy',
          description: 'Your central league dashboard',
          icon: LayoutDashboard,
          requiresAuth: true,
        },
        {
          name: 'Matchups',
          href: '/league-buddy?tab=matchup',
          description: 'Live scores and projections',
          icon: Trophy,
          requiresAuth: true,
        },
        {
          name: 'Playoff Odds',
          href: '/playoff-odds',
          description: 'Chances to make the post-season',
          icon: Target,
          requiresAuth: true,
        },
      ],
    },
    {
      label: 'SCOUT',
      items: [
        {
          name: 'Scouting Portal',
          href: '/scouting-portal',
          description: 'Deep dive into 2026 prospects',
          icon: Search,
        },
        {
          name: 'Draft Board',
          href: '/scouting-portal?tab=draftboard',
          description: 'Build your personal big board',
          icon: Users,
        },
        {
          name: 'Data Lab',
          href: '/analysis',
          description: 'Advanced market visualizations',
          icon: BarChart3,
        },
        {
          name: 'Historical Data',
          href: '/scouting-portal?tab=historical',
          description: 'Past class performance & hit rates',
          icon: History,
        },
      ],
    },
    {
      label: 'TRADE',
      items: [
        {
          name: 'Trade Calculator',
          href: '/trade-calculator',
          description: 'Analyze dynasty trade values',
          icon: Calculator,
        },
        {
          name: 'Trade Market',
          href: '/trade-market',
          description: 'Real league trade activity',
          icon: ShoppingCart,
        },
        {
          name: 'Team Value',
          href: '/trade-market?tab=trends',
          description: 'Track your team value growth',
          icon: LineChart,
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
        {
          name: 'Advanced Metrics',
          href: '/metrics',
          description: 'Next Gen Stats analysis',
          icon: TrendingUp,
        },
      ],
    },
  ]

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navGroups.map((group) => {
        const isGroupActive = group.items.some((item) => pathname === item.href)
        return (
          <NavGroup
            key={group.label}
            label={group.label}
            items={group.items}
            isActive={isGroupActive}
            isLoggedIn={isLoggedIn}
          />
        )
      })}
    </nav>
  )
}
