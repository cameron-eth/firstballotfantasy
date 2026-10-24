'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Trophy, Search, ClipboardList, Users, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

function BottomNavContent() {
  const pathname = usePathname()
  const tab = useSearchParams().get('tab')

  const items = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Scout', href: '/scouting-portal', icon: Search },
    { name: 'Board', href: '/scouting-portal?tab=draftboard', icon: ClipboardList },
    { name: 'Team', href: '/league-buddy?tab=roster', icon: Users },
    { name: 'League', href: '/league-buddy', icon: Trophy },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 pb-safe pt-2">
        <nav className="flex items-center justify-between max-w-lg mx-auto">
          {items.map((item) => {
            const [itemPath, itemQuery] = item.href.split('?')
            const itemTab = itemQuery?.split('=')[1] ?? null
            const isActive = pathname === itemPath && tab === itemTab
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-1 relative transition-colors duration-200',
                  isActive ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {isActive && (
                    <div className="absolute -inset-1 bg-yellow-400/10 rounded-lg -z-10 transition-all duration-300" />
                  )}
                </div>
                <span className="text-[10px] font-mono mt-1 font-bold tracking-tight">
                  {item.name.toUpperCase()}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-yellow-400 rounded-full mt-0.5 transition-all duration-300" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export function BottomNav() {
  return <Suspense fallback={null}><BottomNavContent /></Suspense>
}
