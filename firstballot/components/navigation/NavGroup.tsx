'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  description?: string
  icon?: LucideIcon
  requiresAuth?: boolean
}

interface NavGroupProps {
  label: string
  items: NavItem[]
  isActive?: boolean
  isLoggedIn?: boolean
}

export function NavGroup({ label, items, isActive, isLoggedIn }: NavGroupProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className={cn(
          'flex items-center space-x-1 px-4 py-2 text-sm font-mono transition-all duration-200 rounded-lg',
          isActive
            ? 'text-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
            : 'text-gray-300 hover:text-white hover:bg-slate-700/50'
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-1 w-64 z-50"
          >
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 backdrop-blur-md bg-opacity-95">
              <div className="grid gap-1">
                {items.map((item) => {
                  const isDisabled = item.requiresAuth && !isLoggedIn
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.name}
                      href={isDisabled ? '#' : item.href}
                      className={cn(
                        'flex items-start p-3 rounded-lg transition-all duration-200',
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed grayscale'
                          : 'hover:bg-slate-700/50 group'
                      )}
                      onClick={(e) => {
                        if (isDisabled) e.preventDefault()
                        setIsOpen(false)
                      }}
                    >
                      {Icon && (
                        <div className="p-2 bg-slate-700/50 rounded-lg mr-3 group-hover:bg-yellow-400/10 transition-colors">
                          <Icon className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-gray-200 group-hover:text-white">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-300">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
