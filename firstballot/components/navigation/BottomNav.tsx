'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Search, 
  ShoppingCart, 
  BarChart3,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const items = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'League', href: '/league-buddy', icon: Trophy },
    { name: 'Scout', href: '/scouting-portal', icon: Search },
    { name: 'Trade', href: '/trade-calculator', icon: ShoppingCart },
    { name: 'Ranks', href: '/rankings', icon: BarChart3 },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 pb-safe pt-2">
        <nav className="flex items-center justify-between max-w-lg mx-auto">
          {items.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 relative transition-colors duration-200",
                  isActive ? "text-yellow-400" : "text-gray-400 hover:text-gray-200"
                )}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute -inset-1 bg-yellow-400/10 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-mono mt-1 font-bold tracking-tight">
                  {item.name.toUpperCase()}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="w-1 h-1 bg-yellow-400 rounded-full mt-0.5"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}


