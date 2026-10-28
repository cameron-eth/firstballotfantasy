'use client'

import { useLeagueFormat } from '@/hooks/use-league-format'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ChartScatter,
  ClipboardList,
  Home,
  Link2,
  Plus,
  Search,
  Settings,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { name: string; href: string; icon: LucideIcon; scouting?: boolean }

const PRIMARY: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scout', href: '/scouting-portal', icon: Search, scouting: true },
  { name: 'Board', href: '/scouting-portal?tab=draftboard', icon: ClipboardList, scouting: true },
  { name: 'Team', href: '/league-buddy', icon: Users },
]

const MORE: NavItem[] = [
  { name: 'Rank players', href: '/community-rankings', icon: Vote },
  { name: 'Hits & misses', href: '/scouting-portal?tab=hits', icon: ChartScatter, scouting: true },
  { name: 'Connect a league', href: '/league-buddy', icon: Link2 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const isActive = (item: NavItem, pathname: string, tab: string | null) => {
  const [path, query] = item.href.split('?')
  return pathname === path && tab === (query?.split('=')[1] ?? null)
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors',
        active ? 'bg-blue-400/20 text-white' : 'text-slate-400 hover:text-white'
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {item.name}
    </Link>
  )
}

/** Floating pill tab bar for phones: four destinations plus a center "+" for everything else. */
function BottomNavContent() {
  const { showScouting } = useLeagueFormat()
  const pathname = usePathname()
  const tab = useSearchParams().get('tab')
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const visible = (item: NavItem) => showScouting || !item.scouting
  const primary = PRIMARY.filter(visible)
  const half = Math.ceil(primary.length / 2)

  useEffect(() => setOpen(false), [pathname, tab])
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !menuRef.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),14px)] lg:hidden">
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-white/10 bg-slate-950/90 px-2 py-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        {primary.slice(0, half).map((item) => (
          <NavLink key={item.name} item={item} active={isActive(item, pathname, tab)} />
        ))}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="More"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen(!open)}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/30 transition-transform',
              open && 'rotate-45'
            )}
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
          {open && (
            <div
              role="menu"
              className="absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              {MORE.filter(visible).map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    role="menuitem"
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      isActive(item, pathname, tab)
                        ? 'bg-blue-400/20 text-white'
                        : 'text-slate-200 hover:bg-white/5'
                    )}
                  >
                    <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
        {primary.slice(half).map((item) => (
          <NavLink key={item.name} item={item} active={isActive(item, pathname, tab)} />
        ))}
      </nav>
    </div>
  )
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  )
}
