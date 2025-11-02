'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('relative py-10 sm:py-14', className)}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-light text-foreground tracking-tight">
            {title}
          </h1>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto my-6" />
          {subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground font-light max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">{children}</div>
        )}
      </div>
    </div>
  )
}
