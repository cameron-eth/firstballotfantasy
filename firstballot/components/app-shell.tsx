'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  className?: string
  showBackground?: boolean
  containerClassName?: string
}

export function AppShell({
  children,
  className,
  showBackground = true,
  containerClassName,
}: AppShellProps) {
  return (
    <div className={cn('min-h-screen relative bg-background', className)}>
      {showBackground && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
      )}
      <main className={cn('relative px-4 sm:px-6', containerClassName)}>{children}</main>
    </div>
  )
}
